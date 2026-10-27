"""Reuse existing dungeon tables; add pinned interior NPCs, not new populations."""
from pathlib import Path
import hashlib,json,subprocess,xml.etree.ElementTree as ET

def build():
 base=next(Path('.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
 data=json.loads(subprocess.check_output(['node','--input-type=module','-e',
  'import entries from "./template/dungeonEntranceEntries.js";import {MISSING_WORLD_SOURCE as source} from "./docs/missing-world-sources.js";console.log(JSON.stringify({entries,source}))'],encoding='utf8'))
 entries,manifest=data['entries'],data['source'];files={};zones={};ports={};landmarks={}
 pins=dict(manifest['files'])
 for entry in entries.values():
  for file,sha in entry['dungeonEntranceSource']['files'].items():
   assert file not in pins or pins[file]==sha
   pins[file]=sha
 def read(file):
  raw=(base/file).read_bytes();sha=hashlib.sha256(raw).hexdigest();assert sha==pins[file],file
  files[file]=sha;return ET.fromstring(raw)
 wanted={str(e['dungeonEntranceSource']['interiorNpcId']) for e in entries.values()};inside={}
 for path in (base/'spawns'/'Others').glob('*.xml'):
  raw=path.read_bytes()
  if not any(('id="'+id+'"').encode() in raw for id in wanted):continue
  file=path.relative_to(base).as_posix()
  for n in read(file).findall('.//npc'):
   if n.get('id') not in wanted:continue
   assert n.get('id') not in inside
   inside[n.get('id')]={'point':{k:int(n.get(k)) for k in ['x','y','z']},'source':{'file':file,'sha256':files[file]}}
 assert set(inside)==wanted
 for id,entry in entries.items():
  old=entry['dungeonEntranceSource'];npcs=[]
  for role,npc_id,point in [(0,old['npcId'],{k:entry[k] for k in ['x','y','z']}),(1,old['interiorNpcId'],inside[str(old['interiorNpcId'])]['point'])]:
   npc_file=f'stats/npcs/{npc_id//100*100}-{npc_id//100*100+99}.xml'
   npc=next(n for n in read(npc_file).findall('npc') if n.get('id')==str(npc_id))
   assert npc.get('type') in ['DungeonGatekeeper','L2DungeonGatekeeper']
   params={n.get('name'):n.get('value') for n in npc.findall('parameters/param')}
   assert int(params['Role'])==role
   if role==0:assert int(params['SignNumber'])==old['signNumber']
   file=f'teleporters/dungeon/{npc_id}.xml';root=read(file)
   targets=root.findall('npc/teleport[@type="OTHER"]/location');assert len(targets)==1
   target=targets[0];destination={k:int(target.get(k)) for k in ['x','y','z']}
   assert destination==old['insideDestination' if role==0 else 'returnDestination']
   assert int(target.get('feeId','57'))==57 and int(target.get('feeCount','0'))==0
   spawn=inside[str(npc_id)]['source'] if role else {'file':next(f for f in old['files'] if f.startswith('spawns/'))}
   read(spawn['file']);source={'type':'SOURCE_NPC','id':npc_id,**point,'file':spawn['file'],'sha256':files[spawn['file']],'commit':manifest['commit']}
   npcs.append({'npcId':npc_id,'name':npc.get('name'),'point':point,'normal':False,'castleIds':[],
    'targets':[{'floor':1 if role==0 else 0,'point':destination,'fee':0,'item':57,'list':'OTHER','index':0,
      'title':'Войти в подземелье' if role==0 else 'Выйти к зиккурату','source':{'file':file,'sha256':files[file]}}]})
   landmarks.setdefault(id,{})['entrance' if role==0 else 1]={'point':point,'source':source}
  ports[id]={'entrance':npcs[0],1:npcs[1]}
  zones[id]={'city':entry['region'],'arrival':old['returnDestination'],'outside':npcs[0],'inside':npcs[1]}
 return {'zones':zones,'ports':ports,'landmarks':landmarks,'source':{'commit':manifest['commit'],'files':files},
  'admission':'free-entry-user-agreement','sevenSignsRequired':False}

if __name__=='__main__':
 result=build();result.pop('ports');result.pop('landmarks')
 Path('template/nativeDungeonAccess.js').write_text('// Source NPCs and OTHER destinations; free admission is the agreed game exception.\nexport default '+json.dumps(result,ensure_ascii=False,indent=2)+';\n',encoding='utf8')
