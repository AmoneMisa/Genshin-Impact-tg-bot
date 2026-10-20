"""Import missing H5 territories. World anchors are source points, local grids are adaptations."""
from pathlib import Path
import xml.etree.ElementTree as E
import runpy,json,re,math,hashlib

ROOT=Path(__file__).resolve().parents[2]
C=runpy.run_path(str(ROOT/'scripts/l2j/import-location-levels.py'))
D=C['DATA'];N=C['NPCS'];mob=C['mob'];make=C['make_level'];read=C['read_source'];used=C['used'];before=set(used)
allrows=[]
for p in sorted((D/'spawns').rglob('*.xml')):
 try:
  for row in C['rows'](str(p.relative_to(D/'spawns')).replace('\\','/'),C['hostile']):allrows.append({**row,'file':str(p.relative_to(D)).replace('\\','/')})
 except (ValueError,ZeroDivisionError):continue

allrows.extend({**r,'file':'spawns/Others/21_15.xml'} for r in C['rows']('Others/21_15.xml',lambda n:n.get('type','').endswith('FeedableBeast')))

gates=[]
for p in sorted((D/'teleporters/town').glob('*.xml')):
 for kind in E.parse(p).findall('.//teleport'):
  for n in kind.findall('location'):gates.append({**n.attrib,'type':kind.get('type'),'npc':p.stem,'file':str(p.relative_to(D)).replace('\\','/')})
defs=[
 # id, title, source teleporter name, parent, environment, NPC selection, art notes
 ('angel-waterfall','Водопад Ангелов','Anghel Waterfall','aden','woodland',lambda r:20643<=int(r['id'])<=20645,'broad white cascade at the distant perimeter, pale limestone cliffs, dark blue pool, soft green grass and deciduous trees'),
 ('dragon-valley','Долина Драконов','Dragon Valley','giran','desert',lambda r:'Giran/DragonValley.xml' in r['file'] or 22818<=int(r['id'])<=22837 or 22858<=int(r['id'])<=22862,'dry ochre canyon, eroded reddish stone ribs, sparse yellow grass, huge ancient bones at outer edges'),
 ('antharas-lair','Логово Антараса',"Antharas's Lair",'giran','cavern',lambda r:22838<=int(r['id'])<=22857,'grey brown underground limestone, tall stalagmites at the edges, vast dark stone arches, subdued emerald reflected light'),
 ('forge-of-the-gods','Кузня Богов','Entrance to the Forge of the Gods','goddard','volcanic',lambda r:22634<=int(r['id'])<=22649,'black and dark red volcanic cavern, basalt shelves, orange lava confined beyond the playable perimeter'),
 ('enchanted-valley','Зачарованная долина','Enchanted Valley, Southern Region','hunters','woodland',lambda r:'Hunters/EnchantedValley.xml' in r['file'],'lush steep green valley, soft pink flowering trees, mossy standing stones, faint fairy light only at outer margins'),
 ('silent-valley','Тихая долина','Silent Valley','aden','desert',lambda r:'Aden/SilentValley.xml' in r['file'],'deep ochre limestone basin with enormous eroded column-shaped rock walls, dry muted yellow ground and sparse hardy grass'),
 ('forsaken-plains','Забытые равнины','Forsaken Plains','aden','woodland',lambda r:20675<=int(r['id'])<=20680 or 21017<=int(r['id'])<=21022,'broad faded golden plain, dry grass, pale weathered stones, distant barren trees and scattered dark rock'),
 ('beast-farm','Ферма зверей',None,'rune','woodland',lambda r:int(r['id']) in [18906,18907] or N[r['id']].get('type','').endswith('FeedableBeast'),'rolling olive green pasture, rough wooden feeding pens at the edge, simple timber shelters, rustic countryside'),
 ('plains-of-the-lizardmen','Равнины Ящеров','Plains of the Lizardmen','oren','marsh',lambda r:22768<=int(r['id'])<=22774,'yellow green poisoned lowland, giant fleshy mushrooms at the perimeter, shallow pools and coarse pale reeds'),
 ('den-of-evil','Логово Зла','Den of Evil','schuttgart','desert',lambda r:22691<=int(r['id'])<=22702,'cold grey brown ravine, ragna orc wooden scaffolds and rough palisades, sparse grass, smoky grey atmosphere'),
 ('crypts-of-disgrace','Склепы Позора','Crypts of Disgrace','schuttgart','desert',lambda r:22703<=int(r['id'])<=22706,'grey gravel and dry pale grass, low ancient orc burial stones and weathered standing slabs along the perimeter'),
 ('stakato-nest','Гнездо Стакато','Stakato Nest','rune','cavern',lambda r:22617<=int(r['id'])<=22633,'earthy black insect nest cavern, ochre chitin ridges, hanging cocoons confined to edges, dim pale green ambient light'),
 ('frozen-labyrinth','Ледяной лабиринт',None,'schuttgart','ice',lambda r:22080<=int(r['id'])<=22103,'snowbound rock corridors, pale blue ice walls at perimeter, frozen white ground, restrained cold daylight'),
 ('field-of-silence','Поле Безмолвия','Field of Silence','heine','marsh',lambda r:'Innadril/FieldOfSilence.xml' in r['file'],'quiet flat wetland, soft green reeds, thin pale trees, still shallow water beyond walkable bank'),
]
out={};scenes=[]
def source_npc(nid):
 for p in sorted((D/'spawns').rglob('*.xml')):
  for n in E.parse(p).findall('.//npc'):
   if n.get('id')==str(nid) and n.get('x'):return {**{k:int(n.get(k,'0')) for k in ['x','y','z']},'file':str(p.relative_to(D)).replace('\\','/')}
 raise ValueError('No source NPC '+str(nid))
def original_gate(name):
 options=[g for g in gates if g.get('name')==name]
 return next((g for g in options if g['type']=='NORMAL' and int(g.get('feeId','57'))==57),options[0])
def npc_entry(nid,title=None):
 p=source_npc(nid);return {**p,'npc':str(nid),'feeId':'57','feeCount':'0','name':title or N[str(nid)].get('name')}
def build(id,title,anchor,region,env,spawns,centres=None,asset=None,notes=None,entry=None):
 if not spawns and not entry:raise ValueError('Empty source population '+id)
 floors=[]
 if centres:
  for i,z in enumerate(centres):
   selected=[r for r in spawns if min(range(len(centres)),key=lambda j:abs(r['z']-centres[j]))==i]
   floors.append(make(i+1,title+' · '+str(i+1)+' уровень',selected,asset or id,env))
 else:floors=[make(1,title,spawns,asset or id,env)]
 ids=sorted({r['id'] for r in spawns},key=int);mobs=[mob(nid) for nid in ids];lv=sorted(m['level'] for m in mobs)
 zone={'id':id,'title':title,'min':lv[0] if lv else 75,'max':lv[-1] if lv else 85,'level':lv[len(lv)//2] if lv else 80,'mobs':mobs,'kind':'catacomb' if env in ['catacomb','necropolis','cavern','volcanic'] else 'field','floors':len(floors)}
 x,y,z=[int(anchor[k]) for k in ['x','y','z']]
 fare={'item':int(anchor.get('feeId','57')),'count':int(anchor.get('feeCount','0'))}
 loc={'id':id,'name':title,'x':x,'y':y,'z':z,'region':region,'continent':'gracia' if x<-131072 else 'aden','polygon':[[x-4000,y-4000],[x+4000,y-4000],[x+4000,y+4000],[x-4000,y+4000]],'levelMin':zone['min'],'levelMax':zone['max'],'teleportGold':fare['count'] if fare['item']==57 else 0,'entryFare':fare,'entrySource':anchor,'floors':len(floors),'mob':{k:mobs[0][k] for k in ['id','name','level']} if mobs else None,'selectionGeometry':'authored-extent','access':entry}
 loc['entryRoutes']=[{'npcId':int(g['npc']),'npcName':N[g['npc']].get('name'),'item':int(g.get('feeId','57')),'fee':int(g.get('feeCount','0')),'type':g['type'],'source':g['file']} for g in gates if g.get('name')==anchor.get('name')]
 row={'zone':zone,'location':loc,'levels':{'version':1,'floors':floors,'mobs':mobs},'scene':{'id':id,'title':title,'category':'hunting','environment':env,'asset':asset or id,'sections':1},'artNotes':notes}
 # Explicitly reviewed outdoor spaces only; a single floor alone does not make a cave a surface.
 if id in {d[0] for d in defs} and zone['kind']=='field' and len(floors)==1:
  row['levels']['source']={'coordinateSpace':'surface','geodataAvailable':False}
 out[id]=row;scenes.append(row['scene']);return row
for id,title,gate,parent,env,select,notes in defs:
 if gate:anchor=original_gate(gate)
 else:anchor=npc_entry(31537 if id=='beast-farm' else 32020)
 spawns=[r for r in allrows if select(r)]
 # Anghel is the source Harit group around its actual waterfall destination.
 if id=='angel-waterfall':spawns=[r for r in spawns if math.hypot(r['x']-int(anchor['x']),r['y']-int(anchor['y']))<14000]
 build(id,title,anchor,parent,env,spawns,[-3700,-5900] if id=='forge-of-the-gods' else None,notes=notes)

# Hellbound towers: every source height landing gets a separate population.
hell=read('scripts/ai/areas/Hellbound/hellboundSpawns.xml')
print('Hellbound source root',hell.getroot().tag)

def literal_spawns(file,arrays=None):
 text=(D/file).read_text(encoding='utf-8');C['provenance'][file]=hashlib.sha256((D/file).read_bytes()).hexdigest()
 blocks=re.findall(r'int\[\]\[\]\s+(\w+)\s*=\s*\{(.*?)\};',text,re.S)
 result=[]
 for name,block in blocks:
  if arrays and name not in arrays:continue
  for a in re.findall(r'\{([^{}]+)\}',block):
   try:ns=[int(v.strip()) for v in a.split(',')]
   except ValueError:continue
   if len(ns)<4 or str(ns[0]) not in N or not(-327680<ns[1]<230000 and -262144<ns[2]<330000) or abs(ns[1])<10000:continue
   n=N[str(ns[0])]
   if n.find('stats/vitals') is None:continue
   if n.get('type','').removeprefix('L2') not in ['Monster','RaidBoss','GrandBoss']:continue
   result.append({'id':str(ns[0]),'x':ns[1],'y':ns[2],'z':ns[3],'count':1,'respawnMs':0,'respawnRandomMs':0,'coordinateSource':'point','polygon':[],'sourceGroup':name,'file':file})
 return result

def source_point(x,y,z,file):return {'x':x,'y':y,'z':z,'file':file,'feeId':'57','feeCount':'0'}
hb=[r for r in allrows if r['file']=='spawns/Hellbound/Hellbound.xml']
steel=build('steel-citadel','Стальная цитадель',npc_entry(32302),'heine','catacomb',[r for r in hb if 22362<=int(r['id'])<=22372],[-7552,-9696],notes='dark grey angular demonic stone fortress corridors, black metal ribs and dim red light, worn broad paved floor',entry={'kind':'linked','from':'hellbound'})
infi=build('tower-of-infinitum','Башня Бесконечности',source_point(-22204,277056,-15023,'TowerOfInfinitum.java#ENTER_LOCATION'),'heine','catacomb',[r for r in hb if 22373<=int(r['id'])<=22376],[-15040,-13376,-11648,-9920,-8256],notes='high dark demonic tower halls, violet grey stone, tall narrow iron framed arches confined to perimeter, muted purple ambient light',entry={'kind':'linked','from':'steel-citadel','partyMin':1})
tully_rows=[r for r in hb if 22377<=int(r['id'])<=22390 or int(r['id']) in [22423,22431]]
tully_file=str(next((D/'scripts').rglob('TullyWorkshop.java')).relative_to(D)).replace('\\','/')
tully_rows+=literal_spawns(tully_file,['SPAWNLIST_7TH_FLOOR'])
tully=build('tully-workshop','Мастерская Тулли',source_point(-13400,272827,-15300,tully_file+'#teleToLocation'),'heine','catacomb',tully_rows,notes='dark brass and black iron foundry interior, riveted workshop walls, large silent mechanical frames at outer edges, warm dull furnace light',entry={'kind':'linked','from':'tower-of-infinitum','partyMin':1})
tully['levels']['floors']=[]
centres=[-15300,-13600,-12075,-10495,-9032,-13599,-11936,-10492]
for i,z in enumerate(centres):
 selected=[r for r in tully_rows if (r['y']>=277000)==(i>=5) and min(range(5 if i<5 else 5,8) if i>=5 else range(5),key=lambda j:abs(r['z']-centres[j]))==i]
 tully['levels']['floors'].append(make(i+1,f'Мастерская Тулли · {i+1} этаж',selected,'tully-workshop','catacomb'))
tully['zone']['floors']=tully['location']['floors']=8
naia_file=str(next((D/'scripts').rglob('TowerOfNaia.java')).relative_to(D)).replace('\\','/')
naia_text=(D/naia_file).read_text(encoding='utf-8');naia_rows=[];naia_floors=[]
for number,block in enumerate(re.findall(r'SPAWNS\.put\(\d+, new int\[\]\[\]\s*\{(.*?)\}\);',naia_text,re.S),1):
 entries=[]
 for match in re.findall(r'\{\s*(\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+)[^{}]*\}',block):
  nid,x,y,z=map(int,match)
  if str(nid) not in N:continue
  entries.append({'id':str(nid),'x':x,'y':y,'z':z,'count':1,'respawnMs':0,'respawnRandomMs':0,'coordinateSource':'point','polygon':[],'sourceGroup':'Naia room '+str(number),'file':naia_file})
 naia_rows+=entries;naia_floors.append(make(number,'Башня Найи · Комната '+str(number),entries,'tower-of-naia','catacomb'))
naia=build('tower-of-naia','Башня Найи',source_point(-47271,246098,-9120,naia_file+'#teleToLocation'),'heine','catacomb',naia_rows,notes='ancient demonic laboratory, dark sandstone, cold blue green crystalline apparatus and heavy square gates at perimeter, quiet broad stone floor',entry={'kind':'linked','from':'tully-workshop','partyMin':1})
if not naia_floors:raise ValueError('Missing Naia source challenge rooms')
naia['levels']['floors']=naia_floors;naia['zone']['floors']=naia['location']['floors']=len(naia_floors)

# SoA source monster families and Klemis' exact interior teleport.
soa=build('seed-of-annihilation','Семя Уничтожения',npc_entry(32734),'keucereus-alliance-base','cavern',[r for r in allrows if 22746<=int(r['id'])<=22765],asset='gracia-annihilation',entry={'kind':'npc-level','npc':32734,'minLevel':80,'arrival':{'x':-180218,'y':185923,'z':-10576}})
families=[range(22746,22754),range(22754,22760),range(22760,22766)]
soa['levels']['floors']=[make(i+1,'Семя Уничтожения · '+name,[r for r in allrows if int(r['id']) in family],'gracia-annihilation','cavern') for i,(name,family) in enumerate(zip(['Бистаконы','Рептиликоны','Кокраконы'],families))]
soa['zone']['floors']=soa['location']['floors']=3

# The entry lobby stays public; interior stages are admitted to a shared private expedition.
seed_modes={}
for id,title,nid,asset,file in [('seed-of-destruction','Семя Разрушения',32526,'gracia-destruction','SeedOfDestruction.java'),('seed-of-infinity','Семя Бессмертия',32534,'gracia-infinity','HallOfSufferingAttack.java')]:
 file=str(next((D/'scripts').rglob(file)).relative_to(D)).replace('\\','/')
 spawns=literal_spawns(file)
 row=build(id,title,npc_entry(nid),'keucereus-alliance-base','necropolis' if id.endswith('infinity') else 'catacomb',spawns,asset=asset,entry={'kind':'seed-instance','npc':nid})
 row['levels']['floors']=[make(1,title+' · Вход',[],asset,row['scene']['environment'])]
 def stage(label,entries,objectives=None):
  f=make(len(row['levels']['floors'])+1,title+' · '+label,entries,asset,row['scene']['environment'])
  f['objectiveIds']=objectives;row['levels']['floors'].append(f);return f['number']
 def exact_spawn(npc,x,y,z,source):
  return {'id':str(npc),'x':x,'y':y,'z':z,'count':1,'respawnMs':0,'respawnRandomMs':0,'coordinateSource':'point','polygon':[],'sourceGroup':source,'file':file}
 if id=='seed-of-destruction':
  stage('Входной зал',[r for r in spawns if r['sourceGroup'].startswith('ENTRANCE_')]);
  row['levels']['floors'][-1]['objectiveGroups']=['ENTRANCE_GROUND_SPAWNS_1']
  stage('Площадь',[r for r in spawns if r['sourceGroup'] in ['SQUARE_SPAWNS_STATIC','SQUARE_SPAWNS_MAIN'] and r['id']!='18776'])
  row['levels']['floors'][-1]['objectiveGroups']=['SQUARE_SPAWNS_MAIN']
  stage('Обелиск',[r for r in spawns if r['id']=='18776'],[18776])
  stage('Коридоры',[r for r in spawns if r['sourceGroup'].startswith('CORRIDOR_')],[18777])
  stage('Крепость',[r for r in spawns if r['sourceGroup'].startswith(('SCOUTPASS_','PREFORT_','FORT_'))],[18778])
  stage('Трон Тиат',[exact_spawn(29163,-250400,207271,-11961,'addSpawn(TIAT)'),exact_spawn(29162,-250154,207203,-11970,'addSpawn(NAEZD)')],[29163])
  # Agreed game exception: Tiat needs one full party, without a command channel.
  seed_modes['tiat']={'location':id,'title':'Штурм Тиат','startFloor':2,'lastFloor':7,'partyMin':9,'partyMax':9,'minLevel':75,'maxLevel':85,'durationMs':130*60000,'instanceId':110,'commandChannel':False}
 else:
  for k in range(1,6):stage('Зал Страданий · '+str(k),literal_spawns(file,['ROOM_'+str(k)+'_MOBS']))
  stage('Зал Страданий · Близнецы',literal_spawns(file,['TWIN_SPAWNS']),[25665,25666])
  seed_modes['suffering']={'location':id,'title':'Зал Страданий','startFloor':2,'lastFloor':7,'partyMin':1,'partyMax':9,'minLevel':75,'maxLevel':82,'durationMs':60*60000,'instanceId':115,'quest':694}
  erosion=str(next((D/'scripts').rglob('HallOfErosionAttack.java')).relative_to(D)).replace('\\','/')
  stage('Зал Гибели',literal_spawns(erosion,['ROOMS_MOBS']))
  bosses=literal_spawns(erosion,['COHEMENES_SPAWN']);stage('Зал Гибели · Кохеменес',bosses[:1],[25634])
  seed_modes['erosion']={'location':id,'title':'Зал Гибели','startFloor':8,'lastFloor':9,'partyMin':18,'partyMax':27,'minLevel':75,'maxLevel':85,'durationMs':40*60000,'instanceId':119,'commandChannel':True,'quest':696}
  heart=str(next((D/'scripts').rglob('HeartInfinityAttack.java')).relative_to(D)).replace('\\','/')
  stage('Сердце Бессмертия',literal_spawns(heart,['ROOMS_MOBS']))
  text=(D/heart).read_text(encoding='utf-8');match=re.search(r'addSpawn\(EKIMUS,\s*(-?\d+),\s*(-?\d+),\s*(-?\d+)',text)
  if not match:raise ValueError('Missing Ekimus source position')
  stage('Сердце Бессмертия · Экимус',[exact_spawn(29150,*map(int,match.groups()),'HeartInfinityAttack.java#addSpawn(EKIMUS)')],[29150])
  seed_modes['heart']={'location':id,'title':'Сердце Бессмертия','startFloor':10,'lastFloor':11,'partyMin':18,'partyMax':27,'minLevel':75,'maxLevel':85,'durationMs':40*60000,'instanceId':121,'commandChannel':True}
 for key,m in seed_modes.items():
  if m['location']!=id:continue
  for f in row['levels']['floors'][m['startFloor']-1:m['lastFloor']]:
   f['transports']=[{'floor':1 if f['number']==m['startFloor'] else f['number']-1,'mode':'walk',**f['stairs']['down']}]
   if f['number']<m['lastFloor']:f['transports'].append({'floor':f['number']+1,'mode':'walk',**f['stairs']['up']})
 row['levels']['floors'][0]['transports']=[{'floor':m['startFloor'],'mode':'seed-instance','seedMode':key,'room':'r0c0','point':{'x':.9,'y':.1}} for key,m in seed_modes.items() if m['location']==id]
 entries=[s for f in row['levels']['floors'] for r in f['rooms'] for s in r['spawns']]
 ids=sorted({s['id'] for s in entries},key=int)
 row['zone']['mobs']=row['levels']['mobs']=[mob(nid) for nid in ids]
 row['zone']['floors']=row['location']['floors']=len(row['levels']['floors'])
(ROOT/'template/seedInstances.js').write_text('export const SEED_MODES='+json.dumps(seed_modes,ensure_ascii=False)+';\n',encoding='utf-8')

# Regenerate only source drops used by new populations.
city_specs=[('gludio-airship-field','Пристань воздушных кораблей Глудио',-149406,255247,-80,'gludio','city-gludio-airship-field'),('keucereus-alliance-base','База альянса Кецеруса',-186563,243590,2608,'gracia','gracia-keucereus')]
cities=[];city_npcs=[]
for id,title,x,y,z,parent,asset in city_specs:
 cities.append({'id':id,'name':title,'x':x,'y':y,'z':z,'size':16000,'parentRegion':parent,'continent':'gracia' if id.startswith('keucereus') else 'aden','gk':None,'source':'AirShipGludioGracia.java#OUST','polygon':[[x-4000,y-4000],[x+4000,y-4000],[x+4000,y+4000],[x-4000,y+4000]],'selectionGeometry':'authored-extent'})
 file='spawns/Gracia/'+('GludioAirshipField.xml' if id.startswith('gludio') else 'Gracia.xml')
 for raw in read(file).findall('.//npc'):
  if not raw.get('x'):continue
  rx,ry,rz=[int(raw.get(k,'0')) for k in ['x','y','z']];nid=raw.get('id');n=N.get(nid)
  if n is None or abs(rx-x)>7000 or abs(ry-y)>7000 or n.get('type','').removeprefix('L2') in ['Monster','RaidBoss','GrandBoss','FlyMonster']:continue
  service='ishuma' if nid=='32615' else 'airship' if nid in ['32607','32609'] else 'warehouse' if 'Warehouse' in n.get('type','') else 'merchant' if 'Merchant' in n.get('type','') else None
  city_npcs.append({'id':id+':'+nid+':'+str(len(city_npcs)),'npcId':int(nid),'name':n.get('name'),'role':{'ishuma':'Мастер · распечатка S80/S84','airship':'Рейсовый воздушный корабль','warehouse':'Хранитель склада','merchant':'Торговец'}.get(service,n.get('title') or 'Житель'),'city':id,'x':rx,'y':ry,'z':rz,'service':service,'gateway':False,'source':file,'adapted':False})
scenes.extend([{'id':c['id'],'title':c['name'],'category':'city','environment':'catacomb','asset':a[-1],'sections':1} for c,a in zip(cities,city_specs)])
# Survivor has a fixed 150000 adena price and level 75, unlike normal gatekeeper tariffs.
town_anchors={'dion':(18700,145000),'rune':(43840,-47700),'oren':(82900,53200),'giran':(83400,147900),'schuttgart':(87300,-143000),'heine':(111400,219400),'aden':(147450,27064),'goddard':(147000,-57000)}
for raw in read('spawns/Gracia/GludioAirshipField.xml').findall('.//npc[@id="32632"]'):
 x,y,z=[int(raw.get(k)) for k in ['x','y','z']];city=min(town_anchors,key=lambda id:math.hypot(x-town_anchors[id][0],y-town_anchors[id][1]))
 city_npcs.append({'id':city+':gracia-survivor','npcId':32632,'name':'Gracian Survivor','role':'Проводник к воздушной пристани','city':city,'x':x,'y':y,'z':z,'service':'survivor','gateway':False,'adapted':False})
airfile='scripts/ai/areas/Gracia/vehicles/AirShipGludioGracia/AirShipGludioGracia.java';airtext=(D/airfile).read_text()
paths={name:[[int(v.strip()) for v in row.split(',')] for row in re.findall(r'new VehiclePathPoint\(([^)]+)\)',block)] for name,block in re.findall(r'VehiclePathPoint\[\] (\w+)\s*=\s*\{(.*?)\};',airtext,re.S)}
ishuma=[]
for i,row in enumerate(read('multisell/326150004.xml').findall('item')):
 ins=[{'id':int(n.get('id')),'count':int(n.get('count'))} for n in row.findall('ingredient')];prod=row.find('production');source=next(n for n in ins if n['id']!=57)
 ishuma.append({'source':source['id'],'product':int(prod.get('id')),'gold':sum(n['count'] for n in ins if n['id']==57),'aa':0,'name':None,'sourceTable':326150004})

loot=C['loot'];items=C['items'];wanted=set()
for row in ishuma:wanted.update([str(row['source']),str(row['product'])])
for nid in sorted(used-before,key=int):
 drops=N[nid].findall('dropLists/death/item') or N[nid].findall('dropLists/drop/item')
 loot[nid]=[[int(n.get('id')),int(n.get('min')),int(n.get('max')),float(n.get('chance'))] for n in drops if n.get('id')!='57']
 wanted.update(str(r[0]) for r in loot[nid])
products={}
product_ids={str(row['product']) for row in ishuma}
for p in sorted((D/'stats/items').glob('*.xml')):
 for n in E.parse(p).findall('item'):
  if n.get('id') in product_ids:
   products[n.get('id')]={'id':int(n.get('id')),'name':n.get('name'),'type':n.get('type'),'properties':{v.get('name'):v.get('val') for v in n.findall('set')},'stats':{v.get('type'):float(v.text) for v in n.findall('stats/stat')},'skills':[{k:int(v) for k,v in a.attrib.items()} for a in n.findall('skills/skill')]}
  if n.get('id') not in wanted or n.get('id') in items:continue
  st={s.get('name'):s.get('val') for s in n.findall('set')};items[n.get('id')]=[n.get('name'),n.get('type'),st.get('crystal_type','NONE'),int(st.get('price','0')),st.get('etcitem_type')]
for name,value in [('l2Loot.js',loot),('l2Items.js',items)]:
 p=ROOT/'template'/name;header=p.read_text(encoding='utf-8').split('export default ',1)[0];p.write_text(header+'export default '+json.dumps(value,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
for row in ishuma:row['name']=items[str(row['product'])][0]
(ROOT/'template/graciaTravel.js').write_text('export const GRACIA_CITIES='+json.dumps(cities,ensure_ascii=False)+';\nexport const GRACIA_NPCS='+json.dumps(city_npcs,ensure_ascii=False)+';\nexport const AIRSHIP_PATHS='+json.dumps(paths)+';\nexport const ISHUMA_UNSEAL='+json.dumps(ishuma,ensure_ascii=False)+';\nexport const ISHUMA_PRODUCTS='+json.dumps(products,ensure_ascii=False)+';\n',encoding='utf-8')
folder=ROOT/'template/world-extension';folder.mkdir(exist_ok=True)
for id,row in out.items():(folder/(id+'.js')).write_text('// Pinned High Five sources; local room geometry is adapted.\nexport default '+json.dumps(row,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
index=''.join(f"import z{i} from './world-extension/{id}.js';\n" for i,id in enumerate(out))+'export const WORLD_EXTENSION = ['+','.join('z'+str(i) for i in range(len(out)))+'];\n'
index+='export const WORLD_EXTENSION_LEVELS=Object.fromEntries(WORLD_EXTENSION.map(r=>[r.zone.id,r.levels]));\nexport const WORLD_EXTENSION_ZONES=WORLD_EXTENSION.map(r=>r.zone);\nexport const WORLD_EXTENSION_LOCATIONS=WORLD_EXTENSION.map(r=>r.location);\n'
(ROOT/'template/worldExtension.js').write_text(index,encoding='utf-8')
(ROOT/'webapp/world-extension-scenes.js').write_text('export const WORLD_EXTENSION_SCENES='+json.dumps(scenes,ensure_ascii=False,separators=(',',':'))+';\nexport const WORLD_EXTENSION_FLOOR_SCENES='+json.dumps({id:[f['asset'] for f in r['levels']['floors']] for id,r in out.items()},separators=(',',':'))+';\n',encoding='utf-8')
(ROOT/'.tmp/missing-world-art-plan.json').write_text(json.dumps([{'id':id,'theme':r['artNotes'],'asset':r['scene']['asset']} for id,r in out.items() if r['artNotes']],ensure_ascii=False,indent=2),encoding='utf-8')
print('Imported',[(id,len(r['zone']['mobs']),len(r['levels']['floors'])) for id,r in out.items()])

(ROOT/'docs/missing-world-sources.js').write_text('export const MISSING_WORLD_SOURCE='+json.dumps({'commit':C['SOURCE_COMMIT'],'repository':'https://gitlab.com/MobiusDevelopment/L2J_Mobius','geodataAvailable':False,'files':C['provenance']},indent=2)+';\n',encoding='utf-8')
