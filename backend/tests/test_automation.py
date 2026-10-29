import uuid,asyncio
import pytest
from test_roof import roof_payload

@pytest.mark.asyncio
async def test_idempotent_events_wait_for_real_approval(async_client):
 c=async_client;token=(await c.post('/api/v1/auth/login',data={'username':'demo@solvanta.energy','password':'Solvanta2026!'})).json()['access_token'];h={'Authorization':'Bearer '+token}
 b=(await c.get('/api/v1/buildings',headers=h)).json()[0]['id'];base=f'/api/v1/buildings/{b}'
 await c.put(base+'/roof',headers=h,json=roof_payload())
 data={'event_id':str(uuid.uuid4()),'correlation_id':str(uuid.uuid4()),'kind':'shortage'}
 responses=await asyncio.gather(*[c.post(base+'/events',headers=h,json=data) for _ in range(2)])
 assert all(r.status_code==200 for r in responses)
 event=responses[0].json();assert event['id']==responses[1].json()['id']
 assert event['state']=='PENDING_APPROVAL' and event['waiting'] and event['run_id'] is None
 assert (await c.post(base+'/events',headers=h,json=data|{'kind':'daily_planner'})).status_code==409
 assert (await c.get(base+'/events/'+event['id'],headers=h)).json()['state']=='PENDING_APPROVAL'
 url=base+'/plans/'+event['plan_id']+'/actions'
 action={'action':'reject','expected_revision':event['plan_revision'],'idempotency_key':str(uuid.uuid4())}
 assert (await c.post(url,headers=h,json=action)).status_code==200
 state=(await c.get(base+'/events/'+event['id'],headers=h)).json()
 assert state['state']=='REJECTED' and state['terminal'] and state['run_id'] is None
 assert (await c.get(base+'/events')).status_code==401
 email=f'{uuid.uuid4()}@example.com';await c.post('/api/v1/auth/register',json={'email':email,'password':'Password123!','full_name':'Other'})
 token=(await c.post('/api/v1/auth/login',data={'username':email,'password':'Password123!'})).json()['access_token'];other={'Authorization':'Bearer '+token}
 assert (await c.get(base+'/events',headers=other)).status_code==403
 assert (await c.post(base+'/events',headers=other,json=data)).status_code==403
