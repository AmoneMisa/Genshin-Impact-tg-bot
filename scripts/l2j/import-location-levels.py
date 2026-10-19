"""Import vertical encounters from pinned H5 spawns. Local room grids are adaptations.

No client geodata is available: retain original spawn coordinates and identify the
authored room partition separately. Never use local room coordinates in the Atlas.
"""
from pathlib import Path
from collections import defaultdict
import xml.etree.ElementTree as E
import json, re, hashlib

ROOT=Path(__file__).resolve().parents[2]
DATA=next((ROOT/'.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
NPCS={n.get('id'):n for p in (ROOT/'.tmp/hf-npcs').glob('*.xml') for n in E.parse(p).findall('npc')}
EXP={int(n.get('level')):int(n.get('tolevel')) for n in E.parse(DATA/'stats/players/experience.xml').findall('experience')}
SOURCE_COMMIT='9fb01cb20513e55190cdde8d91e41be2c0914f84'
used=set(); provenance={}; levels={}

def read_source(file):
 p=DATA/file
 provenance[file]=hashlib.sha256(p.read_bytes()).hexdigest()
 return E.parse(p)

def rows(file,filter_npc=lambda n:True):
 out=[]
 for group in read_source('spawns/'+file).findall('spawn'):
  territory=group.find('territory')
  for spawn in group.findall('npc'):
   npc=NPCS.get(spawn.get('id'))
   if npc is None or not filter_npc(npc):continue
   polygon=[[int(p.get('x')),int(p.get('y'))] for p in territory.findall('node')] if territory is not None else []
   x=int(spawn.get('x')) if spawn.get('x') else sum(p[0] for p in polygon)/len(polygon) if polygon else None
   y=int(spawn.get('y')) if spawn.get('y') else sum(p[1] for p in polygon)/len(polygon) if polygon else None
   z=int(spawn.get('z',territory.get('minZ','0') if territory is not None else '0'))
   if x is None:raise ValueError('Missing source position: '+spawn.get('id'))
   out.append({'id':spawn.get('id'),'x':round(x),'y':round(y),'z':z,'coordinateSource':'point' if spawn.get('x') else 'territory-centroid-for-partition','count':int(spawn.get('count','1')),'respawnMs':round(float(spawn.get('respawnDelay','60'))*1000),'respawnRandomMs':round(float(spawn.get('respawnRandom','0'))*1000),'sourceGroup':group.get('zone',group.get('name')),'polygon':polygon,'minZ':int(territory.get('minZ')) if territory is not None else None,'maxZ':int(territory.get('maxZ')) if territory is not None else None})
 return out

def hostile(n):
 a=n.find('acquire')
 return n.get('type') in ['L2Monster','Monster'] and a is not None and float(a.get('exp','0'))>0

def mob(nid):
 n=NPCS[nid];st=n.find('stats');v=st.find('vitals');a=st.find('attack');d=st.find('defence');ac=n.find('acquire');ad=st.find('attribute/defence');level=int(n.get('level'))
 drops=n.findall('dropLists/death/item') or n.findall('dropLists/drop/item');gold=next((x for x in drops if x.get('id')=='57'),None)
 return {'id':nid,'name':n.get('name'),'level':level,'hp':float(v.get('hp')),'pAtk':float(a.get('physical')),'mAtk':float(a.get('magical')),'pDef':float(d.get('physical')),'mDef':float(d.get('magical')),'accuracy':float(a.get('accuracy','0')),'crit':float(a.get('critical','0')),'attackSpeed':float(a.get('attackSpeed','253')),'resist':dict((k,float(v)) for k,v in ad.attrib.items()) if ad is not None else {},'expShare':float(ac.get('exp','0') if ac is not None else 0)/(EXP[level+1]-EXP[level]),'rewardless':ac is None or float(ac.get('exp','0'))==0,'gold':{'min':int(gold.get('min')),'max':int(gold.get('max')),'chance':float(gold.get('chance'))} if gold is not None else None,'drops':[]}

def make_level(number,title,spawns,asset,environment='catacomb',npcs=None,boss=None):
 used.update(s['id'] for s in spawns)
 if spawns:
  xs=[s['x'] for s in spawns];ys=[s['y'] for s in spawns]
  bounds=[min(xs),min(ys),max(xs),max(ys)]
  cells=defaultdict(list)
  for s in spawns:
   col=min(3,int((s['x']-bounds[0])/max(1,bounds[2]-bounds[0])*4));row=min(2,int((s['y']-bounds[1])/max(1,bounds[3]-bounds[1])*3))
   cells[(row,col)].append(s)
  rooms=[{'id':f'r{r}c{c}','row':r,'col':c,'name':title+' · '+str(r*4+c+1),'spawns':cells[(r,c)],'cap':sum(s['count'] for s in cells[(r,c)]),'mobIds':sorted(set(s['id'] for s in cells[(r,c)]))} for r in range(3) for c in range(4)]
 else:
  bounds=None;rooms=[{'id':'r0c0','row':0,'col':0,'name':title,'spawns':[],'mobIds':[],'cap':0}]
 stairs={'up':{'room':rooms[-1]['id'],'point':{'x':.9,'y':.1}},'down':{'room':rooms[0]['id'],'point':{'x':.1,'y':.9}}}
 return {'number':number,'title':title,'asset':asset,'environment':environment,'rooms':rooms,'cols':4 if spawns else 1,'rows':3 if spawns else 1,'startId':rooms[0]['id'],'sourceBounds':bounds,'npcs':npcs or [],'boss':boss,'layoutSource':'adapted-from-source-spawns','stairs':stairs}

def zone(id,floors):
 levels[id]={'version':1,'floors':floors,'mobs':[mob(nid) for nid in sorted(set(s['id'] for f in floors for r in f['rooms'] for s in r['spawns']),key=int)]}

# Source spawn-height bands correspond to the original tower landings.
toi=rows('Aden/TowerOfInsolence.xml',hostile)
centres=[-5100,-3750,-2250,-750,1000,2000,3000,4000,5000,6000,7000,8000]
floors=[]
for i,z in enumerate(centres):
 selected=[s for s in toi if min(range(len(centres)),key=lambda j:abs(s['z']-centres[j]))==i]
 floors.append(make_level(i+1,f'Башня Дерзости · {i+1} этаж',selected,['tower-of-insolence','tower-of-insolence-area-1','tower-of-insolence-area-2'][i] if i<3 else f'tower-of-insolence-floor-{i+1}'))
floors.append(make_level(13,'Башня Дерзости · 13 этаж',[],'tower-of-insolence-floor-13'))
floors.append(make_level(14,'Покои Баюма',[],'epic-baium',boss='baium'))
zone('tower-of-insolence',floors)

cruma=rows('Others/20_21.xml',lambda n:hostile(n) and int(n.get('id')) in [20136,20213,20214,20215,20216,20217,20218,20219,20220,20221,20222,20751,20753,21035,21036,21037,21038])
zone('cruma-tower',[make_level(1,'Башня Крумы · 1 этаж',[s for s in cruma if s['z']<-10500],'cruma-tower'),make_level(2,'Башня Крумы · 2 этаж',[s for s in cruma if -10500<=s['z']<-7500],'cruma-tower-area-1'),make_level(3,'Зал Ядра',[],'epic-core',boss='core')])

# Ivory Tower: hunting crater plus the actual peaceful basement and four halls.
ivory=rows('Oren/IvoryTower.xml',hostile)
friendly=rows('Others/22_18.xml',lambda n:int(n.get('id'))>30000)
friendly=[s for s in friendly if 81000<s['x']<88000 and 14000<s['y']<18500]
floors=[make_level(1,'Кратер Башни Слоновой Кости',ivory,'ivory-tower','desert')]
for i,(z,title) in enumerate([(-4271,'Подвал'),(-3664,'1 этаж · Холл'),(-2799,'2 этаж · Гильдия Людей'),(-2285,'3 этаж · Гильдия Эльфов'),(-1769,'4 этаж · Гильдия Тёмных Эльфов')]):
 ns=[]
 for s in friendly:
  if abs(s['z']-z)>180:continue
  n=NPCS[s['id']];ns.append({'id':s['id'],'name':n.get('name'),'type':n.get('type'),'source':{'x':s['x'],'y':s['y'],'z':s['z']},'x':max(.12,min(.88,(s['x']-84600)/1600)),'y':max(.12,min(.88,(s['y']-15500)/1600))})
 floors.append(make_level(i+2,'Башня Слоновой Кости · '+title,[],f'ivory-tower-floor-{i+2}',npcs=ns))
for floor in floors:
 floor['transports']=[]
 for npc in floor['npcs']:
  if npc['type']!='L2Teleporter':continue
  for path in (DATA/'teleporters').rglob(npc['id']+'.xml'):
   for loc in read_source(str(path.relative_to(DATA)).replace('\\','/')).findall('.//location'):
    x,y,z=[int(loc.get(k,'0')) for k in ['x','y','z']]
    if not (84000<x<87000 and 15000<y<18000):continue
    target=min(floors[1:],key=lambda f:abs(z-next(n['source']['z'] for n in f['npcs'] if n['type']=='L2Teleporter')))
    if target['number']==floor['number'] or any(t['floor']==target['number'] for t in floor['transports']):continue
    floor['transports'].append({'floor':target['number'],'mode':'teleport','npc':npc['id'],'name':npc['name'],'room':floor['startId'],'point':{'x':npc['x'],'y':npc['y']},'gold':int(loc.get('feeCount','0')),'arrival':{'room':target['startId'],'point':{'x':max(.12,min(.88,(x-84600)/1600)),'y':max(.12,min(.88,(y-15500)/1600))}},'source':{'x':x,'y':y,'z':z}})
floors[0]['transports'].append({'floor':3,'mode':'walk',**floors[0]['stairs']['up']})
floors[2]['transports'].append({'floor':1,'mode':'walk',**floors[2]['stairs']['down']})
zone('ivory-tower',floors)
levels['ivory-tower']['entryFloor']=3

for id,file,centres,titles,assets,env in [
 ('garden-of-eva','Innadril/GardenOfEva.xml',[-8900,-9300,-9800,-10400,-11000],[f'Сад Евы · {i} ярус' for i in range(1,6)],['garden-of-eva','garden-of-eva-area-1','garden-of-eva-area-2','garden-of-eva-floor-4','garden-of-eva-floor-5'],'catacomb'),
 ('giants-cave','Aden/GiantsCave.xml',[-4500,-7200],['Пещера Гигантов · Верхний уровень','Пещера Гигантов · Нижний уровень'],['giants-cave','giants-cave-area-2'],'cavern'),
 ('monastery-of-silence','Others/23_15.xml',[-3300,-800],['Монастырь Безмолвия · Нижний этаж','Монастырь Безмолвия · Верхний этаж'],['monastery-of-silence','monastery-of-silence-area-2'],'catacomb'),
 ('imperial-tomb','Goddard/ImperialTomb.xml',[-3000,-5500],['Имперская гробница · Верхние залы','Имперская гробница · Нижние залы'],['imperial-tomb','imperial-tomb-area-2'],'necropolis'),
 ('pagan-temple','Others/19_16.xml',[-10800,-11400],['Храм Язычников · Галереи','Храм Язычников · Ритуальные залы'],['pagan-temple','pagan-temple-area-2'],'catacomb'),
 ('devils-isle','Giran/DevilsIsle.xml',[-4600,-3900,-2800],['Остров Дьявола · Подводный проход','Остров Дьявола · Пещеры пиратов','Остров Дьявола · Путь к кораблю'],['devils-isle','devils-isle-area-1','devils-isle-area-2'],'cavern')]:
 spawns=rows(file,hostile)
 if id=='garden-of-eva':spawns=[s for s in spawns if s['z']<-8400]
 if id=='monastery-of-silence':spawns=[s for s in spawns if 22789<=int(s['id'])<=22798]
 if id=='pagan-temple':spawns=[s for s in spawns if 22136<=int(s['id'])<=22174]
 fs=[]
 for i,z in enumerate(centres):
  selected=[s for s in spawns if ((0 if int(s['id'])<=22793 else 1) if id=='monastery-of-silence' else min(range(len(centres)),key=lambda j:abs(s['z']-centres[j])))==i]
  fs.append(make_level(i+1,titles[i],selected,assets[i],env))
 zone(id,fs)
levels['imperial-tomb']['floors'][-1].update(boss='frintezza',bossRoom=levels['imperial-tomb']['floors'][-1]['rooms'][-1]['id'])

# Ship room/candle positions and membership are literal values from H5 Java.
java=(ROOT/'.tmp/world-source/CavernOfThePirateCaptain.java').read_text(encoding='utf-8')
candle_text=re.search(r'CANDLE_LOC =\s*\{(.*?)\n\s*\};',java,re.S)[1]
candles=[list(map(int,m)) for m in re.findall(r'new Location\((-?\d+), (-?\d+), (-?\d+)\)',candle_text)]
room_text=re.search(r'ROOM_DATA =\s*\{(.*?)\n\s*\};',java,re.S)[1]
ship_rooms=[list(map(int,re.findall(r'-?\d+',m))) for m in re.findall(r'\{([^{}]+)\}',room_text)]
duration=int(read_source('instances/CavernOfThePirateCaptainWorldNight60.xml').find('activityTime').get('val'))*60000
ship={'source':'CavernOfThePirateCaptain.java','candles':candles,'rooms':ship_rooms,'ordinaryNpcIds':['29023','29024','29027','29026'],'boss':'zaken','revealBlueCount':4,'burnDelayMs':3500,'revealDelayMs':5500,'durationMs':duration}
used.update(ship['ordinaryNpcIds'])
ship['mobs']=[mob(nid) for nid in ship['ordinaryNpcIds']]
provenance['scripts/instances/CavernOfThePirateCaptain/CavernOfThePirateCaptain.java']=hashlib.sha256((ROOT/'.tmp/world-source/CavernOfThePirateCaptain.java').read_bytes()).hexdigest()
# Five source chambers per deck. Their connected local cross is authored, not geodata.
cells=[(0,1),(1,0),(1,1),(1,2),(2,1)]
for deck in range(3):
 f=make_level(deck+4,f'Корабль Закена · {deck+1} палуба',[],f'zaken-ship-floor-{deck+1}','ship')
 f['rooms']=[{'id':f'r{r}c{c}','row':r,'col':c,'name':f'Каюта {deck*5+i+1}','sourceRoom':deck*5+i+1,'source':dict(zip(['x','y','z'],ship_rooms[deck*5+i][:3])),'cap':0,'spawns':[],'mobIds':[]} for i,(r,c) in enumerate(cells)]
 f.update(cols=3,rows=3,startId=f['rooms'][0]['id'],ship=True,stairs={'down':{'room':f['rooms'][0]['id'],'point':{'x':.1,'y':.9}},'up':{'room':f['rooms'][-1]['id'],'point':{'x':.9,'y':.1}}})
 levels['devils-isle']['floors'].append(f)

def read_module(name):return json.loads((ROOT/'template'/name).read_text(encoding='utf-8').split('export default ',1)[1].strip().rstrip(';'))
loot=read_module('l2Loot.js');items=read_module('l2Items.js');wanted=set()
for nid in used:
 drops=NPCS[nid].findall('dropLists/death/item') or NPCS[nid].findall('dropLists/drop/item')
 loot[nid]=[[int(x.get('id')),int(x.get('min')),int(x.get('max')),float(x.get('chance'))] for x in drops if x.get('id')!='57']
 wanted.update(str(x[0]) for x in loot[nid])
for p in (DATA/'stats/items').glob('*.xml'):
 for item in E.parse(p).findall('item'):
  nid=item.get('id')
  if nid not in wanted or nid in items:continue
  st={s.get('name'):s.get('val') for s in item.findall('set')}
  items[nid]=[item.get('name'),item.get('type'),st.get('crystal_type','NONE'),int(st.get('price','0')),st.get('etcitem_type')]
for name,value in [('l2Loot.js',loot),('l2Items.js',items)]:
 p=ROOT/'template'/name;header=p.read_text(encoding='utf-8').split('export default ',1)[0]
 p.write_text(header+'export default '+json.dumps(value,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
out={'commit':SOURCE_COMMIT,'files':provenance,'geodataAvailable':False}
folder=ROOT/'template/location-levels';folder.mkdir(exist_ok=True)
for id,row in {**levels,'zaken-ship':ship,'source':out}.items():
 (folder/(id+'.js')).write_text('// Imported from pinned High Five sources; local grids are adapted.\nexport default '+json.dumps(row,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
imports=''.join(f"import level{i} from './location-levels/{id}.js';\n" for i,id in enumerate(levels))
imports+="import {WORLD_EXTENSION_LEVELS} from './worldExtension.js';\n"
(ROOT/'template/locationLevels.js').write_text('// Local room grids are adaptations, not client geodata.\n'+imports+"export {default as LEVEL_SOURCE} from './location-levels/source.js';\nexport {default as ZAKEN_SHIP} from './location-levels/zaken-ship.js';\nexport const LOCATION_LEVELS = {"+','.join(json.dumps(id)+f':level{i}' for i,id in enumerate(levels))+',...WORLD_EXTENSION_LEVELS};\n',encoding='utf-8')
(ROOT/'webapp/scene-level-catalog.js').write_text('// Art lookup only; no spawn tables are downloaded by the client.\nimport {WORLD_EXTENSION_FLOOR_SCENES} from "./world-extension-scenes.js";\nexport const FLOOR_SCENES = {...'+json.dumps({id:[f['asset'] for f in row['floors']] for id,row in levels.items()},separators=(',',':'))+',...WORLD_EXTENSION_FLOOR_SCENES};\n',encoding='utf-8')
print({id:[(f['number'],sum(r['cap'] for r in f['rooms'])) for f in row['floors']] for id,row in levels.items()})
