"""Pinned H5 quest, interaction radius, gate locations and original approach route."""
from pathlib import Path
import hashlib
import json
import re
import tarfile
import xml.etree.ElementTree as ET

base = next(Path('.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
folder = Path('art-source/world/hellbound')
folder.mkdir(parents=True, exist_ok=True)
(folder / '.gitattributes').write_bytes(b'* -text whitespace=-blank-at-eol\n')
files = {}

def keep(file, data):
    name = Path(file).name
    (folder / name).write_bytes(data)
    files[name] = {'file': file, 'sha256': hashlib.sha256(data).hexdigest()}
    return data.decode('utf-8')

quest_path = 'scripts/quests/Q00130_PathToHellbound/Q00130_PathToHellbound.java'
gate_path = 'scripts/ai/areas/Hellbound/AI/NPC/Warpgate/Warpgate.java'
quest = keep(quest_path, (base / quest_path).read_bytes())
gate = keep(gate_path, (base / gate_path).read_bytes())
spawn_paths = ['spawns/Hellbound/Hellbound.xml', 'spawns/Others/19_23.xml']
points = []
for file in spawn_paths:
    keep(file, (base / file).read_bytes())
    for npc in ET.parse(base / file).getroot().iter('npc'):
        if npc.get('id') not in ['30612', '32292', '32314']:
            continue
        point = {'npcId': int(npc.get('id')), **{k: int(npc.get(k)) for k in ['x', 'y', 'z']}, 'file': file}
        key = 'casian' if point['npcId'] == 30612 else 'galate' if point['npcId'] == 32292 else 'heine-gate' if point['x'] > 0 else 'western-gate'
        point.update(id='hellbound:' + key, name='Casian' if key == 'casian' else 'Galate' if key == 'galate' else 'Warpgate', region='heine' if point['x'] > 0 else 'gludio')
        points.append(point)
assert len(points) == 4
with tarfile.open('.tmp/world-source/h5-java.tar.gz') as archive:
    member = next(m for m in archive if m.name.endswith('/entity/actor/Npc.java'))
    npc_code = keep('java/org/l2jmobius/gameserver/entity/actor/Npc.java', archive.extractfile(member).read())
config = keep('config/General.ini', Path('.tmp/geodata/water-source/General.ini').read_bytes())
without_quest = re.search(r'^HellboundWithoutQuest\s*=\s*(\w+)', config, re.M).group(1).lower() == 'true'
file = 'teleporters/town/30320.xml'
keep(file, (base / file).read_bytes())
row = next(n for n in ET.parse(base / file).findall('.//teleport[@type="NORMAL"]/location') if n.get('name') == 'Wastelands')

def location(name):
    values = re.search(r'\b' + name + r' = new Location\((-?\d+), (-?\d+), (-?\d+)\)', gate).groups()
    return dict(zip(['x', 'y', 'z'], map(int, values)))

data = {
    'source': {'commit': '9fb01cb20513e55190cdde8d91e41be2c0914f84', 'repository': 'https://gitlab.com/MobiusDevelopment/L2J_Mobius', 'files': files},
    'quest': {'id': 130, 'name': 'Path to Hellbound', 'minimumLevel': int(re.search(r'MIN_LEVEL = (\d+)', quest).group(1)), 'itemId': int(re.search(r'CASIANS_BLUE_CRYSTAL = (\d+)', quest).group(1)), 'itemName': "Casian's Blue Crystal"},
    'requiresQuest': not without_quest,
    'interactionDistance': int(re.search(r'INTERACTION_DISTANCE = (\d+)', npc_code).group(1)),
    'entry': location('ENTER_LOC'), 'remove': location('REMOVE_LOC'), 'npcs': points,
    'approach': {'city': 'gludin', 'npcId': 30320, 'name': row.get('name'), 'fee': int(row.get('feeCount')), **{k: int(row.get(k)) for k in ['x', 'y', 'z']}, 'file': file},
}
Path('template/hellboundAccess.js').write_text('// Pinned High Five quest 130, Warpgate and original fixed NPC positions.\nexport default ' + json.dumps(data, indent=2) + ';\n', encoding='utf-8')
print('Imported four fixed NPCs, original interaction distance and Wastelands route')
