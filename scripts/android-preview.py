"""Local interactive ADB screen viewer. Run with Python; open localhost:8765.

Uses an already running Android emulator and adb reverse for Metro on port 8081.
Serves only on loopback; no cloud service, credentials, or extra packages needed.
"""
import json
import os
from pathlib import Path
import subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer

ADB = Path(os.environ.get('ANDROID_HOME', Path.home() / 'AppData/Local/Android/Sdk')) / 'platform-tools/adb.exe'
DEVICE = os.environ.get('SOLVANTA_ANDROID_DEVICE', 'emulator-5554')

def adb(*args):
    return subprocess.check_output([str(ADB), '-s', DEVICE, *args], timeout=25,
                                   creationflags=subprocess.CREATE_NO_WINDOW)

PAGE = r'''<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Solvanta · Live Android via ADB</title><style>
*{box-sizing:border-box}body{margin:0;background:#090b0a;color:#f7f8f5;font:14px system-ui;text-align:center}
header{padding:12px;background:#1b1d1b;position:sticky;top:0}b{color:#c6f43d}p{margin:6px;color:#a6ada4;font-size:12px}
button{background:#262927;color:#f7f8f5;border:1px solid #343a33;border-radius:14px;padding:8px 14px;margin:3px;cursor:pointer}
button:hover{color:#c6f43d}img{display:block;margin:12px auto;max-width:100%;height:calc(100vh - 158px);width:auto;touch-action:none;user-select:none;border:1px solid #343a33;border-radius:16px}
#status{color:#a6ada4;font-size:11px;min-height:20px}
</style><header><b>SOLVANTA · LIVE ANDROID / ADB</b><p>Click to tap · Drag to scroll · Phase 1 demo UI</p>
<button onclick="action({key:4})">Back</button><button onclick="action({open:true})">Open Solvanta</button>
<button onclick="action({reload:true})">Reload app</button></header>
<img id="screen" alt="Live Android emulator screen"><div id="status">Connecting to emulator…</div>
<script>
const img=document.querySelector('#screen'),status=document.querySelector('#status');let start;
async function action(data){try{const r=await fetch('/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(!r.ok)throw Error(await r.text());status.textContent='Input sent to Android';}catch(e){status.textContent=e.message}}
function point(e){const b=img.getBoundingClientRect();return [Math.round((e.clientX-b.left)*img.naturalWidth/b.width),Math.round((e.clientY-b.top)*img.naturalHeight/b.height)]}
img.onpointerdown=e=>{start=point(e);img.setPointerCapture(e.pointerId)};
img.onpointerup=e=>{if(!start)return;const end=point(e),distance=Math.hypot(end[0]-start[0],end[1]-start[1]);action(distance>20?{swipe:[...start,...end]}:{tap:end});start=null};
async function frame(){try{const r=await fetch('/frame',{cache:'no-store'});if(!r.ok)throw Error(await r.text());const url=URL.createObjectURL(await r.blob()),old=img.src;img.src=url;if(old.startsWith('blob:'))URL.revokeObjectURL(old);status.textContent='Live · '+new Date().toLocaleTimeString();}catch(e){status.textContent='ADB: '+e.message}setTimeout(frame,900)}frame();
</script></html>'''

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def send(self, code, mime, content):
        self.send_response(code)
        self.send_header('Content-Type', mime)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self):
        try:
            if self.path == '/':
                self.send(200, 'text/html; charset=utf-8', PAGE.encode())
            elif self.path == '/frame':
                self.send(200, 'image/png', adb('exec-out', 'screencap', '-p'))
            else:
                self.send(404, 'text/plain', b'Not found')
        except (subprocess.SubprocessError, OSError) as error:
            self.send(503, 'text/plain', str(error).encode())

    def do_POST(self):
        if self.path != '/action' or self.headers.get('Origin') not in ('http://localhost:8765', 'http://127.0.0.1:8765'):
            self.send(403, 'text/plain', b'Local viewer origin required')
            return
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size < 1024:
                raise ValueError('Invalid request size')
            data = json.loads(self.rfile.read(size))
            if 'tap' in data or 'swipe' in data:
                kind = 'tap' if 'tap' in data else 'swipe'
                coords = data[kind]
                if len(coords) != (2 if kind == 'tap' else 4) or not all(isinstance(v, int) and 0 <= v <= 5000 for v in coords):
                    raise ValueError('Invalid coordinates')
                adb('shell', 'input', kind, *map(str, coords), *(['350'] if kind == 'swipe' else []))
            elif data.get('key') == 4:
                adb('shell', 'input', 'keyevent', '4')
            elif data.get('open') or data.get('reload'):
                if data.get('reload'):
                    adb('shell', 'am', 'force-stop', 'host.exp.exponent')
                adb('reverse', 'tcp:8081', 'tcp:8081')
                adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'exp://127.0.0.1:8081', 'host.exp.exponent')
            else:
                raise ValueError('Unsupported action')
            self.send(200, 'application/json', b'{"ok":true}')
        except (ValueError, subprocess.SubprocessError, OSError) as error:
            self.send(400, 'text/plain', str(error).encode())

if __name__ == '__main__':
    print(f'Android viewer: http://localhost:8765 ({DEVICE})', flush=True)
    HTTPServer(('127.0.0.1', 8765), Handler).serve_forever()
