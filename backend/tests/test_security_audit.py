import uuid
import pytest

@pytest.mark.asyncio
async def test_registration_rejects_unsafe_passwords_and_roles(async_client):
 c=async_client
 base={'email':f'{uuid.uuid4()}@example.com','password':'Password123!','full_name':'Tester'}
 for changes in [{'password':''},{'password':'short'},{'password':' '*8},{'password':'😀'*30},{'full_name':'   '},{'role':'admin'},{'is_superuser':True}]:
  r=await c.post('/api/v1/auth/register',json=base|changes)
  assert r.status_code==422,r.text

@pytest.mark.asyncio
async def test_forged_and_expired_tokens_are_denied(async_client):
 import jwt
 from datetime import datetime,timedelta,timezone
 from app.core.config import settings
 c=async_client
 forged=jwt.encode({'sub':'x','exp':datetime.now(timezone.utc)+timedelta(hours=1)},'wrong-signing-key-at-least-thirty-two-bytes',algorithm='HS256')
 expired=jwt.encode({'sub':'x','exp':datetime.now(timezone.utc)-timedelta(hours=1)},settings.SECRET_KEY,algorithm='HS256')
 for token in [forged,expired,'not-a-jwt']:
  assert (await c.get('/api/v1/buildings',headers={'Authorization':'Bearer '+token})).status_code==401
