"""Original movement and attack reach for registered native combat fields."""
import hashlib
import json
import xml.etree.ElementTree as ET
import tarfile
import subprocess
from pathlib import Path

base=next(Path('.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
fields={
    "forge-of-the-gods": {"city":"goddard","interior":True,"floors":[1,2]},
    "stakato-nest": {"city":"rune","interior":True},
    "antharas-lair": {"city":"hunters","interior":True},
    'hellbound': {'city':'gludio','island':'hellbound','portalOnly':True,'sourceGaps':[{'kind':'point','zone':'hellbound','npcId':'22320','source':{'x':-10315,'y':237442,'z':-3850},'sourceFile':'scripts/ai/areas/Hellbound/hellboundSpawns.xml','issues':['swimming_required']}]},
    "alligator-beach": {"city":"heine","sourceGaps":[{"kind":"territory","zone":"alligator-beach","npcId":"20314","count":3,"sourceFile":"spawns/Innadril/AlligatorBeach.xml","sourceGroup":"innadril01_qm2324_01","polygon":[[106252,197068],[106452,197068],[106452,197268],[106252,197268]],"minZ":-4236,"maxZ":-4036,"rejected":{"swimming_required":100},"issues":["swimming_required"]}]},
    "field-of-silence": {"city":"heine","sourceGaps":[{"kind":"point","zone":"field-of-silence","npcId":"22651","source":{"x":75897,"y":189168,"z":-3448},"sourceFile":"spawns/Innadril/FieldOfSilence.xml","ground":{"x":75897,"y":189168,"z":-3448,"nswe":7},"issues":["holding_region_required"]},{"kind":"point","zone":"field-of-silence","npcId":"22651","source":{"x":78995,"y":190581,"z":-3784},"sourceFile":"spawns/Innadril/FieldOfSilence.xml","ground":{"x":78995,"y":190581,"z":-3784,"nswe":15},"issues":["swimming_required"]}]},
    "forsaken-plains": {"city": "aden", "sourceGaps": [{"kind": "point", "zone": "forsaken-plains", "npcId": "21020", "source": {"x": 186579, "y": 37084, "z": -4059}, "sourceFile": "spawns/Others/25_19.xml", "ground": {"x": 186579, "y": 37084, "z": -4152, "nswe": 15}, "issues": ["holding_region_required"]}]},
    "sel-mahums": {"city": "oren", "sourceGaps": []},
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
    model=catalog[id];assert (model.get('source',{}).get('coordinateSpace')=='surface' or field.get('interior')) and (len(model['floors'])==1 or field.get('floors'))
    levels=[f for f in model['floors'] if f['number'] in field.get('floors',[1])]
    assert len(levels)==len(field.get('floors',[1]))
    rooms=[{**r,'id':(f'f{f["number"]}/'+r['id'] if field.get('floors') else r['id'])} for f in levels for r in f['rooms']]
    slots=[s for r in rooms for s in r['spawns']]
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
    # Older interior catalogs carry provenance per spawn rather than per model.
    if field.get('interior'):
        for file in {s.get('sourceFile') or s.get('file') for s in slots}:
            assert file and (base/file).is_file()
            model.setdefault('source',{}).setdefault('files',{})[file]=hashlib.sha256((base/file).read_bytes()).hexdigest()
    field['fixedCount']=sum(s['count'] for s in slots if s['coordinateSource']=='point')
    field['territoryCount']=sum(s['count'] for s in slots if s['coordinateSource']!='point')
    random_groups={};capacity=0
    for room in rooms:
        for s in room['spawns']:
            if s.get('randomGroup'):
                key=room['id']+':'+s['randomGroup'];random_groups[key]=max(random_groups.get(key,0),s['count'])
            else:capacity+=s['count']
    field['randomGroupCount']=len(random_groups);field['initialCapacity']=capacity+sum(random_groups.values())
    if id == 'hellbound':
        field['phaseCapacity']={stage:sum(s['count'] for s in slots if s.get('hellboundMin',1)<=stage<=s.get('hellboundMax',100)) for stage in range(12)}
        field['initialCapacity']=max(field['phaseCapacity'].values())
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
    Path('art-source/geodata/spawns/Spawn.java').write_bytes(java)
    policy={'version':2,'retainSourceZOutsideCorrection':True,'maxCorrectionExclusive':300,'file':member.name,'sha256':hashlib.sha256(java).hexdigest()}
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
    for file,sha in model.get('source',{}).get('files',{}).items():
        assert hashlib.sha256((base/file).read_bytes()).hexdigest()==sha
        files[file]=sha
data={'randomGroupSampling':random_policy,'territoryExclusions':exclusions,'territorySampling':{'polygonResamples':1000,'geodataAttempts':100,'sources':territory_sources},'npcMinionTemplates':minions,'fields':fields,'source':{'files':files,'commit':'9fb01cb20513e55190cdde8d91e41be2c0914f84'},'groundSpawnHeight':policy,'actors':actors}
Path('template/nativeFieldPilot.js').write_text('// Original H5 native-field movement/reach; generated by scripts/l2j/import-native-field-pilot.py.\nexport default '+json.dumps(data,indent=2)+';\n',encoding='utf-8')
