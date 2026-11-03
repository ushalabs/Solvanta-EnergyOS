"""Extended invariants for rooftop calibration and panel placement. Geometry only; no AR is involved."""
import math

import pytest
from pydantic import ValidationError
from shapely.geometry import Polygon, box

from app.schemas.roof import RoofInput
from app.services.geometry import place_panels


def pts(*pairs):
    return [dict(x=x, y=y) for x, y in pairs]


def payload(**changes):
    base = dict(width=1000, height=1000,
                boundary=pts((0, 0), (1000, 0), (1000, 1000), (0, 1000)),
                scale_points=pts((0, 0), (1000, 0)), scale_distance_m=10,
                setback_m=0, panel_width_m=2, panel_height_m=2, gap_m=0.1)
    return base | changes


def footprints(result):
    scale = result['meters_per_pixel']
    return [box(p['x'] * scale, p['y'] * scale, (p['x'] + p['width']) * scale, (p['y'] + p['height']) * scale)
            for p in result['panels']]


def test_scale_comes_from_the_measured_line_at_any_angle():
    # A 3-4-5 diagonal of 500 canvas units measured as 5 m gives 0.01 m per unit.
    result = place_panels(RoofInput(**payload(scale_points=pts((0, 0), (300, 400)), scale_distance_m=5)))
    assert result['meters_per_pixel'] == pytest.approx(0.01)
    assert result['roof_area_m2'] == pytest.approx(100)


def test_doubling_the_measured_distance_quadruples_area():
    small = place_panels(RoofInput(**payload()))
    large = place_panels(RoofInput(**payload(scale_distance_m=20)))
    assert large['roof_area_m2'] == pytest.approx(small['roof_area_m2'] * 4)
    assert large['panel_count'] > small['panel_count']


def test_panels_have_the_requested_physical_size_and_gap():
    result = place_panels(RoofInput(**payload(panel_width_m=1.1, panel_height_m=2, gap_m=0.25)))
    scale = result['meters_per_pixel']
    assert result['panels']
    for panel in result['panels']:
        assert panel['width'] * scale == pytest.approx(1.1)
        assert panel['height'] * scale == pytest.approx(2)
    first_row = sorted((p for p in result['panels'] if p['y'] == result['panels'][0]['y']), key=lambda p: p['x'])
    for left, right in zip(first_row, first_row[1:]):
        assert (right['x'] - left['x']) * scale == pytest.approx(1.1 + 0.25)


@pytest.mark.parametrize('setback', [0, 0.25, 1, 2.5])
def test_setback_is_respected_on_a_rectangle(setback):
    result = place_panels(RoofInput(**payload(setback_m=setback)))
    assert result['usable_area_m2'] == pytest.approx((10 - 2 * setback) ** 2)
    inner = box(setback, setback, 10 - setback, 10 - setback).buffer(1e-9)
    assert all(inner.covers(f) for f in footprints(result))


def test_setback_larger_than_the_roof_leaves_no_panels_without_error():
    result = place_panels(RoofInput(**payload(setback_m=6)))
    assert result['usable_area_m2'] == 0
    assert result['panel_count'] == 0
    assert result['panels'] == []


def test_panel_larger_than_the_roof_leaves_no_panels():
    boundary = pts((0, 0), (100, 0), (100, 100), (0, 100))
    result = place_panels(RoofInput(**payload(boundary=boundary, panel_width_m=3, panel_height_m=4)))
    assert result['panel_count'] == 0


def test_obstacle_covering_the_roof_leaves_no_panels():
    ring = pts((0, 0), (1000, 0), (1000, 1000), (0, 1000))
    result = place_panels(RoofInput(**payload(obstacles=[ring])))
    assert result['usable_area_m2'] == 0
    assert result['panel_count'] == 0


def test_obstacle_splitting_the_roof_keeps_panels_on_both_sides_and_off_the_obstacle():
    ring = pts((450, 0), (550, 0), (550, 1000), (450, 1000))
    result = place_panels(RoofInput(**payload(obstacles=[ring], setback_m=0.1)))
    keep_out = box(4.5, 0, 5.5, 10).buffer(0.1, join_style=2)
    shapes = footprints(result)
    assert any(f.bounds[2] < 4.4 for f in shapes)
    assert any(f.bounds[0] > 5.6 for f in shapes)
    assert all(f.intersection(keep_out).area < 1e-8 for f in shapes)


def test_triangle_roof_keeps_every_panel_inside_and_panels_never_overlap():
    boundary = pts((0, 0), (1000, 0), (0, 1000))
    result = place_panels(RoofInput(**payload(boundary=boundary, panel_width_m=1, panel_height_m=1)))
    roof = Polygon([(0, 0), (10, 0), (0, 10)]).buffer(1e-9)
    shapes = footprints(result)
    assert result['roof_area_m2'] == pytest.approx(50)
    assert shapes
    assert all(roof.covers(f) for f in shapes)
    for i, shape in enumerate(shapes):
        assert all(shape.intersection(other).area == 0 for other in shapes[:i])


def test_panels_stay_inside_the_canvas_used_by_the_2d_overlay():
    result = place_panels(RoofInput(**payload(boundary=pts((80, 80), (920, 80), (920, 620), (80, 620)), width=1000, height=700, scale_points=pts((80, 80), (920, 80)), scale_distance_m=14, setback_m=0.5, panel_width_m=1.1)))
    assert result['panels']
    for p in result['panels']:
        assert 0 <= p['x'] and p['x'] + p['width'] <= 1000
        assert 0 <= p['y'] and p['y'] + p['height'] <= 700


def test_same_input_gives_the_same_layout():
    assert place_panels(RoofInput(**payload())) == place_panels(RoofInput(**payload()))


def test_vertex_order_does_not_change_area():
    forward = place_panels(RoofInput(**payload()))
    reverse = place_panels(RoofInput(**payload(boundary=pts((0, 1000), (1000, 1000), (1000, 0), (0, 0)))))
    assert reverse['roof_area_m2'] == pytest.approx(forward['roof_area_m2'])
    assert reverse['panel_count'] == forward['panel_count']


@pytest.mark.parametrize('change', [
    pytest.param({'boundary': pts((0, 0), (1000, 0))}, id='two vertices'),
    pytest.param({'boundary': pts((0, 0), (500, 500), (1000, 1000))}, id='collinear roof has no area'),
    pytest.param({'boundary': pts((0, 0), (1001, 0), (1001, 1000))}, id='vertex right of canvas'),
    pytest.param({'boundary': pts((0, 0), (1000, 0), (1000, 1001))}, id='vertex below canvas'),
    pytest.param({'boundary': pts((-1, 0), (1000, 0), (1000, 1000))}, id='negative vertex from an unclamped tap'),
    pytest.param({'boundary': [dict(x=i, y=(i * i) % 97) for i in range(65)]}, id='too many vertices'),
    pytest.param({'scale_points': pts((0, 0))}, id='one scale point'),
    pytest.param({'scale_points': pts((0, 0), (1000, 0), (0, 1000))}, id='three scale points'),
    pytest.param({'scale_points': pts((10, 10), (10.5, 10))}, id='scale points under one unit apart'),
    pytest.param({'scale_points': pts((0, 0), (2000, 0))}, id='scale point off canvas'),
    pytest.param({'scale_distance_m': -1}, id='negative distance'),
    pytest.param({'scale_distance_m': 201}, id='distance over limit'),
    pytest.param({'scale_distance_m': float('inf')}, id='infinite distance'),
    pytest.param({'scale_points': pts((0, 0), (10, 0)), 'scale_distance_m': 3}, id='calibrated canvas over 200 m'),
    pytest.param({'obstacles': [pts((10, 10), (20, 10))]}, id='obstacle with two vertices'),
    pytest.param({'obstacles': [pts((10, 10), (20, 20), (30, 30))]}, id='obstacle with no area'),
    pytest.param({'boundary': pts((0, 0), (500, 0), (500, 500), (0, 500)), 'obstacles': [pts((400, 400), (600, 400), (600, 600))]}, id='obstacle past the roof edge'),
    pytest.param({'setback_m': -0.1}, id='negative setback'),
    pytest.param({'panel_width_m': 0.1}, id='panel too narrow'),
    pytest.param({'panel_height_m': 9}, id='panel too tall'),
    pytest.param({'gap_m': 0}, id='no gap'),
    pytest.param({'width': 0}, id='zero-width canvas'),
    pytest.param({'unexpected': 1}, id='unknown field'),
    pytest.param({'image_data': 'http://example.com/roof.jpg'}, id='image must be an embedded photo'),
    pytest.param({'image_data': 'data:image/svg+xml;base64,AAAA'}, id='svg image refused'),
])
def test_invalid_input_is_rejected(change):
    with pytest.raises(ValidationError):
        RoofInput(**payload(**change))


def test_points_on_the_canvas_edge_are_accepted():
    # The mobile editor clamps stray taps to exactly these limits.
    RoofInput(**payload(boundary=pts((0, 0), (1000, 0), (1000, 1000))))


def test_layout_method_states_its_limits():
    method = place_panels(RoofInput(**payload()))['method']
    assert 'preliminary' in method
    assert 'no structural or shading assessment' in method


@pytest.mark.asyncio
async def test_preview_matches_save_and_does_not_persist(async_client):
    auth = await async_client.post('/api/v1/auth/login', data={'username': 'demo@solvanta.energy', 'password': 'Solvanta2026!'})
    headers = {'Authorization': 'Bearer ' + auth.json()['access_token']}
    building = (await async_client.get('/api/v1/buildings', headers=headers)).json()[0]['id']
    url = f'/api/v1/buildings/{building}/roof'
    saved = await async_client.put(url, json=payload(setback_m=0.5), headers=headers)
    assert saved.status_code == 200, saved.text
    preview = await async_client.post(url + '/preview', json=payload(setback_m=1), headers=headers)
    assert preview.status_code == 200, preview.text
    assert preview.json()['usable_area_m2'] == 64
    still = (await async_client.get(url, headers=headers)).json()
    assert still['geometry']['setback_m'] == 0.5
    assert still['layout']['usable_area_m2'] == 81
    assert math.isclose(still['layout']['meters_per_pixel'], 0.01)
    bad = await async_client.post(url + '/preview', json=payload(boundary=pts((0, 0), (1001, 0), (1001, 1000))), headers=headers)
    assert bad.status_code == 422
