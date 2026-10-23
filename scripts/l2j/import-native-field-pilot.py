"""Original movement and attack reach for registered native combat fields."""
import hashlib
import json
import xml.etree.ElementTree as ET
import tarfile
import subprocess
from pathlib import Path

base=next(Path('.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
fields={
    'sel-mahums': {'city': 'oren', 'sourceGaps': [{'kind': 'point', 'zone': 'sel-mahums', 'npcId': '22788', 'source': {'x': 78990, 'y': 62250, 'z': -3335}, 'sourceFile': 'spawns/Oren/SelMahums.xml', 'ground': {'x': 78990, 'y': 62250, 'z': -3648, 'nswe': 15}, 'issues': ['spawn_height_gap']}, {'kind': 'point', 'zone': 'sel-mahums', 'npcId': '22787', 'source': {'x': 84698, 'y': 61874, 'z': -3148}, 'sourceFile': 'spawns/Oren/SelMahums.xml', 'ground': {'x': 84698, 'y': 61874, 'z': -3448, 'nswe': 15}, 'issues': ['spawn_height_gap']}, {'kind': 'point', 'zone': 'sel-mahums', 'npcId': '22786', 'source': {'x': 86075, 'y': 67510, 'z': -3375}, 'sourceFile': 'spawns/Oren/SelMahums.xml', 'ground': {'x': 86075, 'y': 67510, 'z': -3072, 'nswe': 15}, 'issues': ['spawn_height_gap']}, {'kind': 'point', 'zone': 'sel-mahums', 'npcId': '22787', 'source': {'x': 82730, 'y': 69303, 'z': -3576}, 'sourceFile': 'spawns/Oren/SelMahums.xml', 'ground': {'x': 82730, 'y': 69303, 'z': -3120, 'nswe': 15}, 'issues': ['spawn_height_gap']}]},
    'primeval-isle': {'city': 'rune', 'island': 'primeval-isle'},
    'varka-outpost': {'city': 'goddard'},
    'ketra-outpost': {'city': 'goddard'},
    'wall-of-argos': {'city': 'goddard'},
    'hot-springs': {'city': 'goddard'},
    'swamp-of-screams': {'city': 'rune'},
    'blazing-swamp': {'city': 'aden'},
    'fields-of-massacre': {'city': 'aden'},
    'dragon-valley': {'city': 'giran'},
    'silent-valley': {'city': 'aden'},
    'dark-forest': {'city': 'dark-elven-village'},
    'elven-fields': {'city': 'elven-village'},
    'talking-island': {'city': 'talking-island-village'},
    'turek-orcs': {'city': 'gludin'},
    'valley-of-saints': {'city': 'rune'},
    'enchanted-valley': {'city': 'hunters'},
    'cemetery': {'city': 'aden'},
    'outlaw-forest': {'city': 'oren'},
    'plains-of-glory': {'city': 'aden'},
    'sea-of-spores': {'city': 'oren'},
    'timak-outpost': {'city': 'oren'},
    'bee-hive': {'city': 'dion'},
    'brekas-stronghold': {'city': 'giran'},
    'vuku-lands': {'city': 'gludio'},
    'angel-waterfall': {'city': 'aden'},
    'marsh-zombies': {'city': 'dark-elven-village'},
    'crypts-of-disgrace': {'city': 'schuttgart'},
    'den-of-evil': {'city': 'schuttgart'},
    'frozen-labyrinth': {'city': 'schuttgart'},
    'plains-of-the-lizardmen': {'city': 'oren'},
    'field-of-whispers': {'city': 'heine'},
    'beast-farm': {'city': 'rune'},
    'cruma-marshlands': {'city': 'dion'},
    'plains-of-dion': {'city': 'dion'},
}
catalog=json.loads(subprocess.check_output(['node','--input-type=module','-e',
    'import {LOCATION_LEVELS} from "./template/locationLevels.js";console.log(JSON.stringify(Object.fromEntries('+json.dumps(list(fields))+'.map(id=>[id,LOCATION_LEVELS[id]]))))'],encoding='utf-8'))
ids=set();exclusions={}
for id,field in fields.items():
    model=catalog[id];assert model['source']['coordinateSpace']=='surface' and len(model['floors'])==1
    slots=[s for r in model['floors'][0]['rooms'] for s in r['spawns']]
    assert all((s['coordinateSource']=='point' or (len(s.get('polygon',[]))>=3 and s.get('minZ') is not None and s.get('maxZ') is not None)) and (not s.get('randomGroup') or id=='primeval-isle') for s in slots)
    for slot in slots:
        if slot['coordinateSource']=='point':continue
        file=slot.get('sourceFile') or slot.get('file');assert file
        group=next(g for g in ET.parse(base/file).getroot().findall('spawn') if g.get('zone',g.get('name'))==slot['sourceGroup'])
        banned=[]
        for area in group.findall('banned_territory'):
            polygon=[[int(n.get('x')),int(n.get('y'))] for n in area.findall('node')];assert len(polygon)>=3
            banned.append({'polygon':polygon,'minZ':int(area.get('minZ')),'maxZ':int(area.get('maxZ'))})
        if banned:exclusions.setdefault(id,{})[file+':'+slot['sourceGroup']]=banned
        territories=group.findall('territory');assert len(territories)==1 and not territories[0].get('banned')
        territory=territories[0];assert [[int(n.get('x')),int(n.get('y'))] for n in territory.findall('node')]==slot['polygon']
        assert int(territory.get('minZ'))==slot['minZ'] and int(territory.get('maxZ'))==slot['maxZ']
    field['fixedCount']=sum(s['count'] for s in slots if s['coordinateSource']=='point')
    field['territoryCount']=sum(s['count'] for s in slots if s['coordinateSource']!='point')
    random_groups={};capacity=0
    for room in model['floors'][0]['rooms']:
        for s in room['spawns']:
            if s.get('randomGroup'):
                key=room['id']+':'+s['randomGroup'];random_groups[key]=max(random_groups.get(key,0),s['count'])
            else:capacity+=s['count']
    field['randomGroupCount']=len(random_groups);field['initialCapacity']=capacity+sum(random_groups.values())
    field['unavailableCount']=0
    for gap in field.get('sourceGaps',[]):
        matches=[s for s in slots if s['id']==gap['npcId'] and ((s['coordinateSource']=='point' and all(s[k]==gap['source'][k] for k in ['x','y','z'])) if gap['kind']=='point' else s.get('sourceGroup')==gap['sourceGroup'] and (s.get('sourceFile') or s.get('file'))==gap['sourceFile'])]
        assert len(matches)==1,'Source gap must identify one exact original record'
        field['unavailableCount']+=matches[0]['count']
    field['availableCapacity']=field['initialCapacity']-field['unavailableCount']
    field['npcIds']=sorted({s['id'] for s in slots});field['count']=sum(s['count'] for s in slots);ids.update(field['npcIds'])
actors={};files={};minions={}
for file in sorted({f'stats/npcs/{int(id)//100*100}-{int(id)//100*100+99}.xml' for id in ids}):
    source=base/file;files[file]=hashlib.sha256(source.read_bytes()).hexdigest()
    for npc in ET.parse(source).getroot().findall('npc'):
        if npc.get('id') not in ids: continue
        assert npc.get('id') not in actors
        stats=npc.find('stats');assert stats is not None
        groups=npc.findall('parameters/minions')
        if groups:minions[npc.get('id')]=[{'name':g.get('name'),'npcs':[n.attrib for n in g.findall('npc')]} for g in groups]
        actors[npc.get('id')]={'runSpeed':float(stats.find('speed/run').get('ground')),'attackRange':float(stats.find('attack').get('range'))}
assert set(actors)==ids
with tarfile.open('.tmp/world-source/h5-java.tar.gz') as archive:
    member=next(m for m in archive.getmembers() if m.name.endswith('/entity/spawns/Spawn.java'))
    java=archive.extractfile(member).read()
    assert b'if (LocationUtil.calculateDistance(newlocx, newlocy, newlocz, newlocx, newlocy, geoZ, true, true) < 300)' in java
    policy={'maxCorrectionExclusive':300,'file':member.name,'sha256':hashlib.sha256(java).hexdigest()}
    member=next(m for m in archive.getmembers() if m.name.endswith('/entity/spawns/SpawnGroup.java'))
    group_java=archive.extractfile(member).read()
    assert group_java==Path('art-source/geodata/spawns/SpawnGroup.java').read_bytes()
    assert b'final SpawnGroupEntry entry = _entries.get(Rnd.get(_entries.size()));' in group_java and b'spawned += spawnUnits(entry, entry.getTotal());' in group_java
    assert b'if (tryReserve(rolled, 1))' in group_java and b'final int respawnDelay = rolled.getRespawnDelay();' in group_java
    random_policy={'selection':'random','file':member.name,'sha256':hashlib.sha256(group_java).hexdigest()}
for field in fields.values():
    field['unportedMinionTemplates']=[id for id in field['npcIds'] if id in minions]
territory_sources={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('art-source/geodata/spawns').glob('*.java')}
assert 'antiBlocker++ < 1000' in Path('art-source/geodata/spawns/ZoneNPoly.java').read_text()
assert 'count++ < 100' in Path('art-source/geodata/spawns/NpcSpawnTerritory.java').read_text()
for model in catalog.values():
    for file,sha in model['source'].get('files',{}).items():
        assert hashlib.sha256((base/file).read_bytes()).hexdigest()==sha
        files[file]=sha
data={'randomGroupSampling':random_policy,'territoryExclusions':exclusions,'territorySampling':{'polygonResamples':1000,'geodataAttempts':100,'sources':territory_sources},'npcMinionTemplates':minions,'fields':fields,'source':{'files':files,'commit':'9fb01cb20513e55190cdde8d91e41be2c0914f84'},'groundSpawnHeight':policy,'actors':actors}
Path('template/nativeFieldPilot.js').write_text('// Original H5 native-field movement/reach; generated by scripts/l2j/import-native-field-pilot.py.\nexport default '+json.dumps(data,indent=2)+';\n',encoding='utf-8')
