"""Name holdings from H5 SQL and use original gatekeeper spawns for physical approach."""
from pathlib import Path
import json,re,xml.etree.ElementTree as E,math
root=Path(__file__).resolve().parents[2];p=root/'template/worldHoldings.js'
raw=p.read_text(encoding='utf-8');holdings=json.loads(raw.split('const BASE_HOLDINGS = ',1)[1].split(';',1)[0] if 'const BASE_HOLDINGS' in raw else raw.split('export default ',1)[1].strip().rstrip(';'))
spawns=json.loads((root/'.tmp/settlement-spawns.json').read_text())
npcs={n.get('id'):n for file in (root/'.tmp/hf-npcs').glob('*.xml') for n in E.parse(file).findall('npc')}
names={}
for kind,file in [('hall','clanhall.sql'),('fort','fort.sql'),('castle','castle.sql')]:
    sql=(root/'.tmp/world-source/holding-reference'/file).read_text(encoding='utf-8')
    for id,name in re.findall(r"\('?([0-9]+)'?,'([^']+)'",sql):names[kind+':'+id]=name+(' Fortress' if kind=='fort' else ' Castle' if kind=='castle' and 'Castle' not in name else '')
names.update({'hall:21':'Fortress of Resistance','hall:34':'Devastated Castle','hall:35':'Bandit Stronghold','hall:62':'Rainbow Springs Chateau','hall:63':'Wild Beast Reserve','hall:64':'Fortress of the Dead'})
details={}
fort_spawns=[]
for row in re.findall(r'\((\d+),null,(\d+),(-?\d+),(-?\d+),(-?\d+),(\d+),(\d+),(\d+)\)',(root/'.tmp/world-source/holding-reference/fort_spawnlist.sql').read_text()):
    fid,nid,x,y,z,heading,spawn_type,castle=map(int,row)
    fort_spawns.append({'fortId':fid,'npcId':nid,'x':x,'y':y,'z':z,'source':'fort_spawnlist.sql'})
messengers={'hall:62':35603,'hall:21':35382,'hall:35':35437,'hall:63':35627}
for h in holdings:
    kind=h['kind'];typ={'hall':'ClanHallDoormen','castle':'CastleDoormen','fort':'FortDoormen'}[kind]
    candidates=[s for s in spawns if npcs.get(str(s['npcId'])) is not None and typ in npcs[str(s['npcId'])].get('type','')]
    if kind=='fort':candidates=[s for s in fort_spawns if s['fortId']==h['sourceId'] and npcs.get(str(s['npcId'])) is not None and 'FortDoormen' in npcs[str(s['npcId'])].get('type','')]
    if h['conquerable'] and kind=='hall':
        candidates+=[s for s in spawns if npcs.get(str(s['npcId'])) is not None and ('ClanHallManager' in npcs[str(s['npcId'])].get('type','') or npcs[str(s['npcId'])].get('type','') in ['L2Doormen','Doormen'] or s['npcId']==messengers.get(h['id']))]
    entry=min(candidates,key=lambda s:math.hypot(s['x']-h['x'],s['y']-h['y'])) if candidates else None
    radius=max(math.hypot(x-h['x'],y-h['y']) for x,y in h['polygon'])+1200
    if entry and math.hypot(entry['x']-h['x'],entry['y']-h['y'])>radius:entry=None
    details[h['id']]={'name':names.get(h['id'],h['name']),'entry':{**entry,'name':npcs[str(entry['npcId'])].get('name')} if entry else None,'entryMissing':entry is None}
(root/'template/holdingEntries.js').write_text('// Original H5 SQL names and NPC spawns. Missing entrances are explicit.\nexport const HOLDING_DETAILS = '+json.dumps(details,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
print('Mapped',sum(d['entry'] is not None for d in details.values()),'/',len(details),'entrances; missing:',[id for id,d in details.items() if d['entryMissing']])
