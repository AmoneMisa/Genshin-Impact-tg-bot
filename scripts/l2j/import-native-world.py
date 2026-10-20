"""Original H5 town anchors and conservative ground-walk exclusions, separate from Atlas art."""
from pathlib import Path
import xml.etree.ElementTree as E
import subprocess,json,hashlib,math
ROOT=Path(__file__).resolve().parents[2]
DATA=next((ROOT/'.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
catalogue=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {CITIES,CITY_NPCS} from './template/worldMap.js'; console.log(JSON.stringify({cities:CITIES,npcs:CITY_NPCS}));"],cwd=ROOT,encoding='utf-8'))
npcs={n.get('id'):n for p in (DATA/'stats/npcs').glob('*.xml') for n in E.parse(p).findall('npc')}
gate_names={c.get('gk') for c in catalogue['cities']}|{n['name'] for n in catalogue['npcs'] if n.get('gateway')}
wanted={id for id,n in npcs.items() if n.get('name') in gate_names}
points=[];files={}
def source(path,label=None):
 files[label or str(path.relative_to(DATA)).replace('\\','/')]=hashlib.sha256(path.read_bytes()).hexdigest()
 return E.parse(path)
for p in (DATA/'spawns').rglob('*.xml'):
 tree=E.parse(p)
 for n in tree.findall('.//npc'):
  if n.get('id') not in wanted or n.get('x') is None:continue
  file=str(p.relative_to(DATA)).replace('\\','/');files[file]=hashlib.sha256(p.read_bytes()).hexdigest()
  points.append({'npcId':int(n.get('id')),'name':npcs[n.get('id')].get('name'),**{k:int(n.get(k)) for k in ['x','y','z']},'file':file})
anchors={}
for c in catalogue['cities']:
 names={c.get('gk')}|{n['name'] for n in catalogue['npcs'] if n.get('gateway') and n['city']==c['id']}
 candidates=[p for p in points if p['name'] in names and math.hypot(p['x']-c['x'],p['y']-c['y'])<20000]
 if candidates:anchors[c['id']]=min(candidates,key=lambda p:math.hypot(p['x']-c['x'],p['y']-c['y']))
doors=[]
for n in source(ROOT/'.tmp/geodata/Doors.xml','Doors.xml').findall('door'):
 polygon=[[int(v) for v in n.get('node'+str(i)).split(',')] for i in range(1,5)]
 doors.append({'id':n.get('id'),'polygon':polygon,'minZ':int(n.get('nodeZ')),'maxZ':int(n.get('nodeZ'))+int(n.get('height')),'defaultOpen':n.get('default_status')=='open'})
water=[]
for name in ['water.xml','custom_water.xml']:
 for n in source(DATA/'zones'/name).findall('zone'):
  if n.get('type')!='WaterZone':continue
  water.append({'id':n.get('name'),'polygon':[[int(p.get('X')),int(p.get('Y'))] for p in n.findall('node')],'shape':n.get('shape'),'minZ':int(n.get('minZ')),'maxZ':int(n.get('maxZ'))})
value={'source':{'commit':'9fb01cb20513e55190cdde8d91e41be2c0914f84','files':files},'towns':anchors,'doors':doors,'water':water}
(ROOT/'template/nativeWorld.js').write_text('// Pinned H5 source coordinates. Door states and swimming are not simulated by native ground trails.\nexport default '+json.dumps(value,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
print('Original town anchors:',len(anchors),'doors:',len(doors),'water zones:',len(water))
