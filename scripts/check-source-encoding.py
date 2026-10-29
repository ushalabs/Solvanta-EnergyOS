"""Fail CI on invalid UTF-8 or common repeated-decoding artifacts in source."""
from pathlib import Path
import re,subprocess,sys
markers=re.compile(r'\u00c3\u0192|\u00e2\u20ac|\u00c2[\u00b0\u00b2\u00b7]')
failures=[]
for name in subprocess.check_output(['git','ls-files','-z','--cached','--others','--exclude-standard']).decode('utf-8').split('\0'):
 p=Path(name)
 if p.suffix not in {'.py','.ts','.tsx','.md','.json','.yml'}:continue
 try:content=p.read_text(encoding='utf-8-sig')
 except UnicodeError:failures.append(name+': invalid UTF-8');continue
 except FileNotFoundError:continue
 if markers.search(content):failures.append(name+': possible corrupted Unicode')
if failures:print('\n'.join(failures));sys.exit(1)
print('UTF-8 source check passed')
