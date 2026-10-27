"""Free internal Ivory Tower lists, preserving list type, index and exact XYZ."""
from pathlib import Path
import hashlib,json,subprocess,xml.etree.ElementTree as ET

base=next(Path('.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
manifest=json.loads(subprocess.check_output(['node','--input-type=module','-e',
 'import {MISSING_WORLD_SOURCE} from "./docs/missing-world-sources.js";console.log(JSON.stringify(MISSING_WORLD_SOURCE))'],encoding='utf8'))
files={}
def read(file):
 data=(base/file).read_bytes();sha=hashlib.sha256(data).hexdigest();assert sha==manifest['files'][file];files[file]=sha
 return ET.fromstring(data)
spawns=read('spawns/Others/22_18.xml')
castle_file='zones/castle_hall.xml';castle_bytes=(base/castle_file).read_bytes()
assert hashlib.sha256(castle_bytes).hexdigest()=='b2412e5cf5e1a67edf4488b732b1bd0d4b9ab9aad18bcf4ea180fc21728d6685'
files[castle_file]=hashlib.sha256(castle_bytes).hexdigest()
castles=[(int(z.find('stat[@name="castleId"]').get('val')),[(int(n.get('X')),int(n.get('Y'))) for n in z.findall('node')]) for z in ET.fromstring(castle_bytes) if z.get('type')=='CastleZone']
ports={}
for floor,npc_id,kind in [(2,30162,'NORMAL'),(3,30727,'OTHER'),(4,30716,'NORMAL'),(5,30719,'NORMAL'),(6,30722,'NORMAL')]:
 npc=next(n for n in spawns.findall('.//npc') if n.get('id')==str(npc_id));point={k:int(npc.get(k)) for k in ['x','y','z']}
 file=f'teleporters/others/IvoryTower/{npc_id}.xml';root=read(file);targets=[]
 for i,n in enumerate(root.findall(f'npc/teleport[@type="{kind}"]/location')):
  p={k:int(n.get(k)) for k in ['x','y','z']};assert int(n.get('feeCount','0'))==0 and not n.get('castleId')
  target=2 if p['z']<-4000 else 3 if p['z']<-3300 else 4 if p['z']<-2500 else 5 if p['z']<-2000 else 6
  assert target!=floor
  targets.append({'floor':target,'point':p,'fee':0,'item':int(n.get('feeId','57')),'list':kind,'index':i,'source':{'file':file,'sha256':files[file]}})
 assert len(targets)==4
 # Npc.getCastle -> Castle.getDistance -> ZoneNPoly uses the nearest vertex.
 castle=min(castles,key=lambda c:min((point['x']-x)**2+(point['y']-y)**2 for x,y in c[1]))[0]
 assert castle==4
 ports[floor]={'npcId':npc_id,'point':point,'normal':kind=='NORMAL','castleIds':[castle] if kind=='NORMAL' else [],'targets':targets}
java=Path('.tmp/geodata/Npc.java').read_bytes();assert b'INTERACTION_DISTANCE = 250' in java
holder=Path('.tmp/geodata/TeleportHolder.java').read_bytes();assert b'player.teleToLocation(loc);' in holder
config=Path('.tmp/geodata/Player.ini').read_bytes();assert hashlib.sha256(config).hexdigest()=='3692529ae1771bfbb4a4de631aa72a33f0b7cd148fb62b05de86b5a9ebf98c10'
assert b'AltKarmaPlayerCanUseGK = False' in config
data={'interactionDistance':250,'normalKarmaAllowed':False,'walkingExits':{'ivory-tower':[1,3]},'zones':{'ivory-tower':ports},'source':{'commit':manifest['commit'],'files':files,'npcSha256':hashlib.sha256(java).hexdigest(),'holderSha256':hashlib.sha256(holder).hexdigest(),'configSha256':hashlib.sha256(config).hexdigest()}}
import runpy
cruma=runpy.run_path('scripts/l2j/import-cruma-transports.py')
data['zones']['cruma-tower']=cruma['build'](base,manifest['commit'])
data['walkingExits']['cruma-tower']=['entrance']
data['source']['files'].update(cruma['PINS'])
dungeons=runpy.run_path('scripts/l2j/import-native-dungeon-access.py')['build']()
data['zones'].update(dungeons['ports'])
data['walkingExits'].update({id:[] for id in dungeons['ports']})
data['source']['files'].update(dungeons['source']['files'])
pagan=json.loads(subprocess.check_output(['node','--input-type=module','-e','import p from "./template/paganAccess.js";console.log(JSON.stringify(p))'],encoding='utf8'))
pagan_ports={1:[],2:[]}
for floor,npc_id in [(floor,npc) for floor in [1,2] for npc in [32040,32034,32035,32036,32037]]:
 npc=pagan['npcs'][str(npc_id)]
 rule=next((d for d in pagan['doors'] if d['npcId']==npc_id),None)
 target={'floor':floor,'title':{32034:'Открыть вход в храм',32035:'Открыть выход из храма',32036:'Открыть вход в святилище',32037:'Открыть выход из святилища'}[npc_id],'kind':'pagan-door'} if rule else {'floor':3,'title':'Вернуться в церковь Руны','point':pagan['mirrors'][str(npc_id)]['to'],'city':'rune'}
 target.update({'fee':0,'item':57,'list':'SCRIPT','index':0,'source':pagan['source']})
 pagan_ports[floor].append({'npcId':npc_id,'name':npc['name'],'title':{32034:'стражу входа в храм',32035:'стражу выхода из храма',32036:'стражу входа в святилище',32037:'стражу выхода из святилища',32040:'зеркалу Триола'}[npc_id],'point':npc['point'],'normal':False,'castleIds':[],'targets':[target]})
data['zones']['pagan-temple']=pagan_ports
npc=pagan['npcs']['32039'];pagan_ports[4]=[{'npcId':32039,'name':npc['name'],'title':'зеркалу Триола','point':npc['point'],'normal':False,'castleIds':[],'targets':[{'floor':1,'title':'Войти в Храм Язычников','point':pagan['mirrors']['32039']['to'],'fee':0,'item':57,'list':'SCRIPT','index':0,'source':pagan['source']}]}]
data['walkingExits']['pagan-temple']=[3]
data['source']['files'].update(pagan['source']['files'])
Path('template/nativeFloorTransports.js').write_text('// Original free NPC teleport lists; generated by scripts/l2j/import-native-floor-transports.py.\nexport default '+json.dumps(data,ensure_ascii=False,indent=2)+';\n',encoding='utf8')
