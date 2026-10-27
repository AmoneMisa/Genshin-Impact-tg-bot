"""Pin Pagan mirror coordinates and door rules; never invent a church jump."""
from pathlib import Path
import hashlib,json,re,subprocess,tarfile,xml.etree.ElementTree as ET

base=next(Path('.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
manifest=json.loads(subprocess.check_output(['node','--input-type=module','-e','import {MISSING_WORLD_SOURCE as s} from "./docs/missing-world-sources.js";console.log(JSON.stringify(s))'],encoding='utf8'))
script='scripts/ai/areas/PaganTemple/PaganTeleporters/PaganTeleporters.java'
sha='b75cd4f86100a9899a582dab425c8ce8b5c16d17a7655189d4582c57ae089695'
raw=(base/script).read_bytes();assert hashlib.sha256(raw).hexdigest()==sha
java=raw.decode();files={script:sha};npcs={}
for file in ['spawns/Others/19_16.xml','spawns/Others/21_16.xml']:
 raw=(base/file).read_bytes();assert hashlib.sha256(raw).hexdigest()==manifest['files'][file];files[file]=manifest['files'][file]
 for n in ET.fromstring(raw).findall('.//npc'):
  if int(n.get('id')) not in [32034,32035,32036,32037,32039,32040]:continue
  npc=int(n.get('id'));assert npc not in npcs
  npcs[npc]={'point':{k:int(n.get(k)) for k in ['x','y','z']},'source':{'file':file,'sha256':files[file]}}
assert len(npcs)==6
file='stats/npcs/32000-32099.xml';raw=(base/file).read_bytes();sha=hashlib.sha256(raw).hexdigest()
assert sha=='85b0f2a0f95198b026f7b649e546dcdc68336df1bbab875cb8142cd9f942f810';files[file]=sha
for n in ET.fromstring(raw).findall('npc'):
 if int(n.get('id')) in npcs:npcs[int(n.get('id'))]['name']=n.get('name')
items={name:int(value) for name,value in re.findall(r'private static final int (VISITORS_MARK|FADED_VISITORS_MARK|PAGANS_MARK) = (\d+);',java)}
assert items=={'VISITORS_MARK':8064,'FADED_VISITORS_MARK':8065,'PAGANS_MARK':8067}
mirrors={}
for symbol,npc in [('TRIOLS_MIRROR_1',32039),('TRIOLS_MIRROR_2',32040)]:
 m=re.search(r'TRIOLS_LOCS.put\('+symbol+r', new Location\((-?\d+), (-?\d+), (-?\d+)\)\)',java);assert m
 mirrors[npc]={'from':npcs[npc]['point'],'to':dict(zip(['x','y','z'],map(int,m.groups()))),'event':'onFirstTalk','fee':0}
doors=[]
for npc,door_ids,marks in [(32034,[19160001],[8064,8065,8067]),(32035,[19160001],[]),(32036,[19160010,19160011],[8067]),(32037,[19160010,19160011],[])]:
 body=re.search(r'case '+str(npc)+r':(.*?)(?=case |\n\t\t})',java,re.S).group(1)
 assert [int(i) for i in re.findall(r'getDoor\((\d+)\).openMe',body)]==door_ids
 assert re.search(r'startQuestTimer\("CLOSE_DOOR_[12]", 10000,',body)
 assert not re.search(r'takeItems|takeQuestItems',body)
 doors.append({'npcId':npc,'doorIds':door_ids,'anyCarriedItem':marks,'consumeItem':False,'openMs':10000,'worldScenarioImplemented':True})
with tarfile.open('.tmp/world-source/h5-java.tar.gz') as archive:
 member=next(m for m in archive.getmembers() if m.name.endswith('/mechanics/script/Quest.java'))
 raw=archive.extractfile(member).read();sha=hashlib.sha256(raw).hexdigest()
 assert sha=='d9241ccf7e0c1e8dd4c587de308e3790becaab6757f65457e203db8a3ddba0de'
 assert b'if (getQuestTimer(name, npc, player) == null)' in raw
 core_files={member.name.split('/java/',1)[1]:sha}
data={'source':{'commit':manifest['commit'],'files':files,'coreFiles':core_files},'npcs':npcs,'mirrors':mirrors,'doors':doors,'churchDrop':{'sourcePosition':None,'implementedInNativeWorld':True,'geometry':'derived-stored-layer-descent','route':'template/paganChurchRoute.js','reason':'original_script_jump_position_unavailable'}}
Path('template/paganAccess.js').write_text('// Original PaganTeleporters.java and fixed NPC spawns; church descent uses separately verified stored geodata layers.\nexport default '+json.dumps(data,indent=2)+';\n',encoding='utf8')
