"""Resolve outside ziggurats by their original Role, never by the last NPC spawn."""
import hashlib
import json
import sys
import tarfile
import xml.etree.ElementTree as ET
from pathlib import Path
necropolis_ids={'sacrifice':(31095,31103),'pilgrims':(31096,31104),'worship':(31097,31105),
 'patriots':(31098,31106),'devotion':(31099,31107),'martyrdom':(31100,31108),
 'saints':(31102,31110),'disciples':(31101,31109)}
catacomb_ids={'heretic':(31114,31120),'branded':(31115,31121),'apostate':(31116,31122),
 'witch':(31117,31123),'dark-omens':(31118,31124),'forbidden-path':(31119,31125)}
config={**{'necropolis-'+key:(*pair,1) for key,pair in necropolis_ids.items()},
        **{'catacomb-'+key:(*pair,2) for key,pair in catacomb_ids.items()}}
id=sys.argv[1];outside,inside,sign=config[id]
base=next(Path('.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
world=json.loads(Path('template/nativeWorld.js').read_text(encoding='utf-8').split('export default ',1)[1].strip().rstrip(';'))
# These fourteen dungeons are on Aden's mainland. Distance across the sea
# must not attach their markers to Talking Island, Kamael Island or Gracia.
mainland={city:p for city,p in world['towns'].items() if city not in {'talking-island-village','kamael-village','keucereus-alliance-base'}}
stats={};files={}
for npcId in [outside,inside]:
    file=f'stats/npcs/{npcId//100*100}-{npcId//100*100+99}.xml';source=base/file
    npc=next(n for n in ET.parse(source).iter('npc') if n.get('id')==str(npcId));assert npc.get('type')=='DungeonGatekeeper'
    stats[npcId]={n.get('name'):int(n.get('value')) for n in npc.findall('parameters/param')}
    files[file]=hashlib.sha256(source.read_bytes()).hexdigest()
assert stats[outside]['Role']==0 and stats[inside]['Role']==1 and stats[outside]['SignNumber']==sign
points=[]
for source in (base/'spawns').rglob('*.xml'):
    for n in ET.parse(source).iter('npc'):
        if n.get('id')==str(outside) and all(n.get(k) for k in ['x','y','z']):
            points.append((source,{k:int(n.get(k)) for k in ['x','y','z']}))
assert len(points)==1, f'{id}: outside spawn absent or ambiguous'
source,point=points[0];files[source.relative_to(base).as_posix()]=hashlib.sha256(source.read_bytes()).hexdigest()
city=min(mainland,key=lambda city:(mainland[city]['x']-point['x'])**2+(mainland[city]['y']-point['y'])**2)
destination=lambda row:{k.lower():row['Pos'+k] for k in ['X','Y','Z']}
def teleport(npcId,command):
    file=f'teleporters/dungeon/{npcId}.xml';source=base/file
    if command=='necro' and id in ['necropolis-saints','necropolis-disciples']:
        # The H5 sequence ends Disciples, Saints, unlike the old catalog order.
        # Literal source comments associate each NPC table with its dungeon.
        label='Saints' if id=='necropolis-saints' else 'Disciples'
        assert f'Necropolis {label} Entrance' in source.read_text(encoding='utf8')
    node=ET.parse(source).find(f'./npc[@id="{npcId}"]/teleport[@type="OTHER"]')
    assert node is not None and len(node.findall('location'))==1
    loc=node.find('location');files[file]=hashlib.sha256(source.read_bytes()).hexdigest()
    html=f'html/teleporter/{npcId}.htm';text=(base/html).read_text(encoding='utf-8')
    assert f'npc_%objectId%_{command} 0' in text
    files[html]=hashlib.sha256((base/html).read_bytes()).hexdigest()
    return {k:int(loc.get(k)) for k in ['x','y','z']}, {'itemId':int(loc.get('feeId','57')),'count':int(loc.get('feeCount','0'))}
entryPoint,entryFee=teleport(outside,'cata' if sign==2 else 'necro')
exitPoint,exitFee=teleport(inside,'exit')
core={}
with tarfile.open('.tmp/world-source/h5-java.tar.gz') as archive:
    for name in ['DungeonGatekeeper.java','TeleportLocation.java']:
        member=next(m for m in archive.getmembers() if m.name.endswith('/'+name))
        core[member.name]=hashlib.sha256(archive.extractfile(member).read()).hexdigest()
print(json.dumps({**point,'region':city,'regionAssociation':'nearest-source-mainland-town',
    'dungeonEntranceSource':{'commit':world['source']['commit'],'files':files,'npcId':outside,'role':0,'interiorNpcId':inside,
        'signNumber':sign,'insideDestination':entryPoint,'returnDestination':exitPoint,
        'legacyParameterDestinations':{'inside':destination(stats[outside]),'return':destination(stats[inside])},
        'destinationSource':'OTHER teleport table, HTML command index 0','coreFiles':core,
        'nativeGroundApproach':None,'teleportTariff':entryFee,'returnTariff':exitFee,
        'seal':'gnosis' if sign==2 else 'avarice','sevenSignsStateAvailable':False},
    'polygon':[[point['x']-500,point['y']-500],[point['x']+500,point['y']-500],[point['x']+500,point['y']+500],[point['x']-500,point['y']+500]],'selectionGeometry':'authored-extent'}))
