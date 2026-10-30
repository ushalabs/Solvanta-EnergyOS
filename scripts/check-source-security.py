"""Check tracked/intended source for credential material; never print values."""
from pathlib import Path
import re
import subprocess

names = subprocess.check_output(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard']).decode().split('\0')
private_key = re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----')
secret_field = re.compile(r'''["'](?:private_key|client_secret|clientSecret)["']\s*:\s*["'][^"'\s][^"']{3,}["']''')
service_account = re.compile(r'''["']type["']\s*:\s*["']service_account["']''')
google_client_secret = re.compile(r'GOCSPX-[A-Za-z0-9_-]{16,}')
errors = []
for name in sorted(set(names) - {''}):
    p = Path(name)
    if not p.is_file():
        continue
    if p.name == 'google-services.json' or (p.name.startswith('.env') and p.name != '.env.example'):
        errors.append((name, 'local configuration must not be tracked'))
        continue
    if p.suffix.lower() not in {'.py', '.js', '.cjs', '.ts', '.tsx', '.json', '.md', '.txt', '.yml', '.yaml', '.example', '.pem', '.key'}:
        continue
    text = p.read_text(encoding='utf-8-sig')
    if private_key.search(text) or secret_field.search(text) or service_account.search(text) or google_client_secret.search(text):
        errors.append((name, 'possible private key, OAuth secret or service-account credential'))
if errors:
    for name, reason in errors:
        print(f'{name}: {reason}')
    raise SystemExit(1)
print('Source security check passed: no private keys, OAuth client secrets or service-account credentials detected.')
