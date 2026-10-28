import json, os, pathlib, re, subprocess, time, xml.etree.ElementTree as ET
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/ui-evidence/android'
OUT.mkdir(exist_ok=True)
ADB = str(pathlib.Path(os.environ.get('ANDROID_HOME', pathlib.Path.home() / 'AppData/Local/Android/Sdk')) / 'platform-tools/adb.exe')
def adb(*args):
    return subprocess.check_output([ADB, '-s', 'emulator-5554', *args], timeout=30)
def dump():
    adb('shell','uiautomator','dump','/sdcard/solvanta-qa.xml')
    return ET.fromstring(adb('shell','cat','/sdcard/solvanta-qa.xml'))
def find(label, tree):
    return next((n for n in tree.iter('node') if n.get('text')==label or n.get('content-desc')==label), None)
def wait(label):
    # Expo Go cold JS reload can be slow on a software-rendered emulator.
    for _ in range(20):
        tree=dump()
        if find(label,tree) is not None: return tree
    raise RuntimeError('Screen did not show '+label)
def tap(label):
    n=find(label,dump())
    if n is None: raise RuntimeError('Missing control '+label)
    x1,y1,x2,y2=map(int,re.findall(r'\d+',n.get('bounds')))
    # Expo Go's floating Tools bubble overlaps the top of this one control.
    y = y2 - 6 if label == 'Open settings' else (y1+y2)//2
    adb('shell','input','tap',str((x1+x2)//2),str(y))
def screen(name,label):
    tree=wait(label)
    (OUT/(name+'.png')).write_bytes(adb('exec-out','screencap','-p'))
    (OUT/(name+'.xml')).write_bytes(ET.tostring(tree))
    print('Captured '+name,flush=True)
def link(route):
    adb('shell','am','start','-a','android.intent.action.VIEW','-d','exp://127.0.0.1:8081/--/'+route,'host.exp.exponent')

screen('01-overview-dark','SOLVANTA')
for control,title,name in [('Loads tab','APPLIANCES','02-appliances-dark'),('Sim tab','SIMULATION LAB','03-simulation-dark'),('Roof tab','ROOFTOP STUDIO','05-rooftop-dark'),('AI tab','SOLVANTA AI OPERATIONS','06-ai-dark')]:
    tap(control);screen(name,title)
link('scheduling');screen('04-scheduling-dark','RESILIENCE SCHEDULER')
tap('Go back');wait('SOLVANTA AI OPERATIONS')
link('settings');screen('07-settings-dark','SETTINGS')
tap('Light Solar');screen('10-settings-light','SETTINGS')
tap('Tools');wait('Reload');tap('Reload');screen('11-overview-light-after-reload','SOLVANTA')
screen('08-overview-light','SOLVANTA')
tap('Loads tab');screen('09-appliances-light','APPLIANCES')
tap('Air Conditioner scenario load')
tree=wait('0.95 kW')
print('PASS: AC toggle updates requested demand to 0.95 kW',flush=True)
tap('Air Conditioner scenario load');wait('2.45 kW')
tap('Home tab');wait('SOLVANTA');tap('Open settings');wait('SETTINGS');tap('Dark Neon-Lime');wait('SETTINGS')
tap('Back to app');screen('handoff-home-dark','SOLVANTA')
print('PASS: all 7 dark and 3 light native screens captured; dock navigation and demand toggle verified',flush=True)
(OUT/'results.json').write_text(json.dumps({'status':'passed','runtime':'Expo Go 57.0.9 / Expo SDK 57 / React Native 0.86.3','screens':'7 dark + 3 light, plus light overview after JS reload','checks':['five dock destinations','settings and scheduling navigation','light theme retained after JS reload','AC toggle: 2.45 to 0.95 kW and back','restored dark Home for user testing'],'limitations':['Fixture-only UI','No standalone Solvanta APK','Native AR not integrated or hardware-tested']}, indent=2))
