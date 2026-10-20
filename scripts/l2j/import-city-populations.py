"""Public town services from pinned H5 town volumes and fixed NPC spawns."""
from pathlib import Path
import hashlib
import json
import math
import subprocess
import xml.etree.ElementTree as E

ROOT=Path(__file__).resolve().parents[2]
PINNED='9fb01cb20513e55190cdde8d91e41be2c0914f84'
DATA=next((ROOT/'.tmp/world-source/h5-data').glob('*'+PINNED+'*/L2J*/dist/game/data'))
catalogue=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {CITIES,CITY_NPCS} from './template/worldMap.js';console.log(JSON.stringify({cities:CITIES,npcs:CITY_NPCS}));"],cwd=ROOT,encoding='utf-8'))
names=dict(zip(['giran','dark-elven-village','talking-island-village','elven-village','orc-village','gludin','dwarven-village','gludio','dion','oren','hunters','aden','goddard','rune','heine','schuttgart','floran','kamael-village'],['Giran Castle Town','Dark Elven Village','Talking Island','Elven Village','Orc Village','Gludin Village','Dwarven Village','Gludio Castle Town','Dion Castle Town','Town of Oren','Hunter Village','Town of Aden','Town of Goddard','Rune Castle Town','Heine','Town of Schuttgart','Floran Village','Kamael Village']))
names['keucereus-alliance-base']='Keucereus'
files={}
def document(p):
 files[str(p.relative_to(DATA)).replace('\\','/')]=hashlib.sha256(p.read_bytes()).hexdigest()
 return E.parse(p)
towns={z.get('name'):z for z in document(DATA/'zones/custom_town.xml').findall('zone')}
region_files=dict(zip(names,['giran_castle_town','darkelf_town','talking_island_town','elf_town','orc_town','gludin_town','dwarf_town','gludio_castle_town','dion_castle_town','oren_castle_town','hunter_town','aden_town','godard_town','rune_town','heiness_town','town_of_schuttgart','floran_town','kamael_town']))
geometry={}
for id,name in names.items():
 z=towns[name];polygon=[[int(n.get('X')),int(n.get('Y'))] for n in z.findall('node')]
 if z.get('shape')=='Cuboid':
  a,b=polygon;polygon=[a,[b[0],a[1]],b,[a[0],b[1]]]
 city=next(c for c in catalogue['cities'] if c['id']==id)
 extent=max(max(abs(p[0]-city['x']),abs(p[1]-city['y'])) for p in polygon)*2.2
 # Camera framing only; normalized actor coordinates keep their existing world scale.
 map_size=min(city.get('size',14000),max(4096,math.ceil(extent/256)*256))
 geometry[id]={'polygon':polygon,'minZ':int(z.get('minZ')),'maxZ':int(z.get('maxZ')),'sourceZone':name,'boundarySource':'zones/custom_town.xml','mapSize':map_size}
 geometry[id]['arrivals']=[]
 if id in region_files:
  region=DATA/'mapregion'/(region_files[id]+'.xml')
  geometry[id]['arrivals']=[{k.lower():int(n.get(k)) for k in ['X','Y','Z']} for n in document(region).findall('.//respawnPoint') if n.get('isChaotic')!='true']
  geometry[id]['arrivals']=list({tuple(p.values()):p for p in geometry[id]['arrivals']}.values())
  geometry[id]['arrivalSource']=str(region.relative_to(DATA)).replace('\\','/')
def inside(p,zone):
 if not zone['minZ']<=p['z']<=zone['maxZ']:return False
 result=False;polygon=zone['polygon']
 for a,b in zip(polygon,polygon[-1:]+polygon[:-1]):
  if (a[1]>p['y'])!=(b[1]>p['y']) and p['x']<(b[0]-a[0])*(p['y']-a[1])/(b[1]-a[1])+a[0]:result=not result
 return result
for zone in geometry.values():
 # Floran's ordinary respawn list points to Dion; it is not a Floran arrival.
 zone['arrivals']=[p for p in zone['arrivals'] if inside(p,zone)]
definitions={};definition_files={}
for p in sorted((DATA/'stats/npcs').glob('*.xml')):
 for n in E.parse(p).findall('npc'):
  definitions[int(n.get('id'))]=n;definition_files[int(n.get('id'))]=p
rows=[];seen=set()
old_names={n['name'] for n in catalogue['npcs'] if ':source:' not in n['id'] and not n.get('adapted')}
for p in sorted((DATA/'spawns').rglob('*.xml')):
 tree=E.parse(p);parents={child:parent for parent in tree.iter() for child in parent}
 for n in tree.findall('.//npc'):
  if not all(n.get(k) is not None for k in ['id','x','y','z']):continue
  npc=definitions.get(int(n.get('id')))
  if npc is None:continue
  kind=npc.get('type','');title=npc.get('title','')
  public=kind in ['Merchant','Warehouse','Trainer','Teleporter'] or kind.startswith('VillageMaster')
  if not public and npc.get('name') not in old_names:continue
  parent=n;active=True
  while parent in parents:
   parent=parents[parent]
   if parent.get('spawnByDefault','true')=='false' or parent.get('spawnTime') not in [None,'ANY']:active=False
  if not active:continue
  point={k:int(n.get(k)) for k in ['x','y','z']}
  city=next((id for id,zone in geometry.items() if inside(point,zone)),None)
  identity=(int(n.get('id')),point['x'],point['y'],point['z'])
  if not city or identity in seen:continue
  seen.add(identity)
  file=str(p.relative_to(DATA)).replace('\\','/');files[file]=hashlib.sha256(p.read_bytes()).hexdigest()
  definition=definition_files[identity[0]];files[str(definition.relative_to(DATA)).replace('\\','/')]=hashlib.sha256(definition.read_bytes()).hexdigest()
  service='blacksmith' if 'Blacksmith' in title else 'warehouse' if 'Warehouse' in title else {'Merchant':'merchant','Warehouse':'warehouse','Trainer':'trainer','Teleporter':'resident'}.get(kind,'trainer')
  role={'blacksmith':'Кузнец','merchant':'Торговец','warehouse':'Хранитель склада','trainer':'Наставник','resident':'Проводник'}[service]
  rows.append({'id':f"{city}:source:{identity[0]}:{point['x']}:{point['y']}:{point['z']}",'npcId':identity[0],'name':npc.get('name'),'role':role,'city':city,**point,'service':service,'gateway':False,'adapted':False,'source':file,'correctionOnly':not public})
updates={};used=set()
for old in catalogue['npcs']:
 if ':source:' in old['id']:continue
 if old['city'] not in geometry or old.get('adapted'):continue
 candidates=[(i,n) for i,n in enumerate(rows) if n['name']==old['name'] and math.hypot(n['x']-old['x'],n['y']-old['y'])<2000]
 if not candidates:continue
 i,match=min(candidates,key=lambda r:math.hypot(r[1]['x']-old['x'],r[1]['y']-old['y']))
 # Stable public NPC IDs survive corrected city membership and original height import.
 updates[old['id']]={k:v for k,v in match.items() if k not in ['id','gateway','role','service','correctionOnly']}
 if not match['correctionOnly'] and not old.get('gateway') and not old.get('instanceGateway') and old.get('service') in [None,'merchant','warehouse','trainer','blacksmith','resident']:
  updates[old['id']].update(role=match['role'],service=match['service'])
 used.add(i)
additional=[{k:v for k,v in n.items() if k!='correctionOnly'} for i,n in enumerate(rows) if i not in used and not n['correctionOnly']]
payload={'commit':PINNED,'files':dict(sorted(files.items()))}
result='// Original H5 public town services; fixed spawns only. Generated by import-city-populations.py.\n'
for name,value in [('CITY_POPULATION_SOURCE',payload),('CITY_GEOMETRY',geometry),('CITY_NPC_UPDATES',updates),('CITY_SOURCE_NPCS',additional)]:
 result+='export const '+name+' = '+json.dumps(value,ensure_ascii=False,indent=2)+';\n'
(ROOT/'template/cityPopulation.js').write_text(result,encoding='utf-8')
print(len(geometry),'town volumes;',len(updates),'stable NPC corrections;',len(additional),'additional public NPC spawns')
