import uuid
import pytest
from pydantic import ValidationError
from shapely.geometry import Polygon, box
from app.schemas.roof import RoofInput
from app.services.geometry import place_panels


def roof_payload():
    return dict(width=1000, height=1000,
        boundary=[dict(x=0,y=0),dict(x=1000,y=0),dict(x=1000,y=1000),dict(x=0,y=1000)],
        scale_points=[dict(x=0,y=0),dict(x=1000,y=0)], scale_distance_m=10,
        setback_m=0, panel_width_m=2, panel_height_m=2, gap_m=0.1)


def test_rectangle_units_and_count():
    r = place_panels(RoofInput(**roof_payload()))
    assert r['roof_area_m2'] == 100
    assert r['usable_area_m2'] == 100
    assert r['panel_count'] == 16
    assert r['meters_per_pixel'] == .01


def test_concave_bounds_obstacles_and_clearance():
    p = roof_payload()
    p['boundary'] = [dict(x=x,y=y) for x,y in [(0,0),(1000,0),(1000,400),(600,400),(600,1000),(0,1000)]]
    p['obstacles'] = [[dict(x=x,y=y) for x,y in [(200,200),(400,200),(400,400),(200,400)]]]
    p['setback_m'] = .2
    r = place_panels(RoofInput(**p))
    roof = Polygon([(v['x']*.01,v['y']*.01) for v in p['boundary']]).buffer(-.2,join_style=2)
    obstacle = box(2,2,4,4).buffer(.2,join_style=2)
    boxes = [box(v['x']*.01,v['y']*.01,(v['x']+v['width'])*.01,(v['y']+v['height'])*.01) for v in r['panels']]
    assert boxes
    for i,b in enumerate(boxes):
        assert roof.buffer(1e-9).covers(b)
        assert b.intersection(obstacle).area < 1e-8
        assert all(b.intersection(other).area == 0 for other in boxes[:i])


@pytest.mark.parametrize('change', [
    {'scale_distance_m':0}, {'scale_points':[dict(x=0,y=0)]*2},
    {'boundary':[dict(x=x,y=y) for x,y in [(0,0),(1000,1000),(1000,0),(0,1000)]]},
    {'obstacles':[[dict(x=900,y=900),dict(x=1100,y=900),dict(x=900,y=1000)]]},
])
def test_invalid_geometry(change):
    with pytest.raises(ValidationError):
        RoofInput(**(roof_payload() | change))


@pytest.mark.asyncio
async def test_roof_persistence_and_tenant_isolation(async_client):
    c = async_client
    auth = await c.post('/api/v1/auth/login', data={'username':'demo@solvanta.energy','password':'Solvanta2026!'})
    headers={'Authorization':'Bearer '+auth.json()['access_token']}
    buildings = (await c.get('/api/v1/buildings',headers=headers)).json()
    url=f"/api/v1/buildings/{buildings[0]['id']}/roof"
    payload=roof_payload()
    saved=await c.put(url,json=payload,headers=headers)
    assert saved.status_code == 200, saved.text
    assert (await c.get(url,headers=headers)).json() == saved.json()
    payload['setback_m']=1
    assert (await c.put(url,json=payload,headers=headers)).json()['layout']['usable_area_m2'] == 64
    assert (await c.get(url)).status_code == 401
    email=f'{uuid.uuid4()}@example.com'
    await c.post('/api/v1/auth/register',json={'email':email,'password':'Password123!','full_name':'Other'})
    token=(await c.post('/api/v1/auth/login',data={'username':email,'password':'Password123!'})).json()['access_token']
    other={'Authorization':'Bearer '+token}
    for method in ['get','put']:
        args={'headers':other}
        if method=='put': args['json']=payload
        assert (await getattr(c,method)(url,**args)).status_code == 403
    assert (await c.post(url+'/preview',json=payload,headers=other)).status_code == 403
