"""Cruma source NPCs, scripted admission and OTHER lists, pinned to H5."""
from pathlib import Path
import hashlib, json, subprocess, xml.etree.ElementTree as ET

PINS = {
 'spawns/Others/20_21.xml':'3fb208271643f2d7f63f081f797169555dddc72d23a893759e01d28d83ce5737',
 'stats/npcs/30400-30499.xml':'5f9af378f93bc82b844c31ebbf01dafc80060ae89aa359b400b445e898900b8d',
 'stats/npcs/31800-31899.xml':'e20bfcc35d3804af6dc169db7a7a470324e52085ca661b83c78a5c79171066c6',
 'scripts/ai/areas/CrumaTower/CrumaTower.java':'140899686c2ce9aaf2a716f25d31f9dd869848330ecf40a1534852b876f220c0',
 'teleporters/others/30484.xml':'88c552c9f7a4d0f981959916a81eae37334de030f983f062cf0fd908fbdc05e8',
 'teleporters/others/30485.xml':'0ccb1454ace043fb293546db27edaedbb5084bcc3bf81c8f2d892eeb68efe553',
 'teleporters/others/30486.xml':'e7437d3753fb0f4aca676962d067c1fd191079537a88c8af9109af737a9c7e3c',
 'teleporters/others/30487.xml':'e3aa7ecc1e22f54090fcb0eef1194ce40fdfaf1e404d1aecafd2e1d5a02374d6',
 'teleporters/others/31843.xml':'02033b2cefe1467124820520012bc588fa6a3fac1d21fcac63fa02590ebb6b45',
}

def build(base,commit):
 def read(file):
  data=(base/file).read_bytes();assert hashlib.sha256(data).hexdigest()==PINS[file]
  return data
 root=ET.fromstring(read('spawns/Others/20_21.xml'))
 npcs={int(n.get('id')):n for f in ['stats/npcs/30400-30499.xml','stats/npcs/31800-31899.xml'] for n in ET.fromstring(read(f)).findall('npc')}
 ai=read('scripts/ai/areas/CrumaTower/CrumaTower.java')
 assert b'MAX_LEVEL = 55' in ai and b'17776, 113968, -11671' in ai and b'17680, 113968, -11671' in ai
 ports={}
 for floor,npc_id,targets in [('entrance',30483,[1]),(1,30484,[0]),(1,30487,[2]),(2,30485,[1]),(2,30486,[3]),(3,31843,[2,3])]:
  matches=root.findall(f'.//npc[@id="{npc_id}"]');assert len(matches)==1
  point={k:int(matches[0].get(k)) for k in ['x','y','z']}
  port={'npcId':npc_id,'name':npcs[npc_id].get('name'),'point':point,'normal':False,'castleIds':[],'targets':[]}
  if npc_id==30483:
   file='scripts/ai/areas/CrumaTower/CrumaTower.java'
   port['maxLevel']=55
   port['targets']=[{'floor':1,'point':{'x':17776,'y':113968,'z':-11671},'alternatives':[{'x':17680,'y':113968,'z':-11671}],'fee':0,'item':57,'list':'SCRIPT','index':0,'source':{'file':file,'sha256':PINS[file]}}]
  else:
   file=f'teleporters/others/{npc_id}.xml'
   locations=ET.fromstring(read(file)).findall('npc/teleport[@type="OTHER"]/location');assert len(locations)==len(targets)
   for index,(n,target) in enumerate(zip(locations,targets)):
    assert not n.get('feeCount') and not n.get('castleId')
    port['targets'].append({'floor':target,'point':{k:int(n.get(k)) for k in ['x','y','z']},'fee':0,'item':57,'list':'OTHER','index':index,'source':{'file':file,'sha256':PINS[file]}})
  if npc_id==31843:port['targets'][1]['scenarioRequired']='core'
  ports.setdefault(floor,[]).append(port)
 return ports

if __name__=='__main__':
 base=next(Path('.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
 model=json.loads(subprocess.check_output(['node','--input-type=module','-e','import m from "./template/location-levels/cruma-tower.js"; console.log(JSON.stringify(m))'],encoding='utf8'))
 file='spawns/Others/20_21.xml';data=(base/file).read_bytes();assert hashlib.sha256(data).hexdigest()==PINS[file]
 root=ET.fromstring(data)
 original={(n.get('id'),int(n.get('x')),int(n.get('y')),int(n.get('z'))):n for n in root.findall('.//npc') if n.get('x')}
 count=0
 for floor in model['floors']:
  for room in floor['rooms']:
   for s in room['spawns']:
    n=original[(s['id'],s['x'],s['y'],s['z'])];assert int(n.get('count','1'))==s['count'] and int(n.get('respawnDelay'))*1000==s['respawnMs']
    s['file']=file;count+=s['count']
 assert count==330
 ports=build(base,'9fb01cb20513e55190cdde8d91e41be2c0914f84')
 for floor in model['floors']:
  floor['npcs']=[{'id':str(p['npcId']),'name':p['name'],'sourcePosition':p['point']} for p in ports.get(floor['number'],[])]
 model['floors'][2]['title']='Р‘Р°С€РЅСЏ РљСЂСѓРјС‹ В· 3 СЌС‚Р°Р¶'
 Path('template/location-levels/cruma-tower.js').write_text('// Imported from pinned High Five sources; local grids are adapted.\nexport default '+json.dumps(model,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')

