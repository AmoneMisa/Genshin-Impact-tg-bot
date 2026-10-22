"""Read original territory nodes, without manufacturing a spawn position."""
import hashlib
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
config={'timak-outpost':('oren','spawns/Oren/TimakOutpost.xml'),
        'plains-of-glory':('aden','spawns/Aden/PlainsOfGlory.xml'),
        'cemetery':('aden','spawns/Aden/Cemetery.xml'),
        'alligator-beach':('heine','spawns/Innadril/AlligatorBeach.xml')}
city,file=config[sys.argv[1]]
base=next(Path('.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'));source=base/file
territories=[]
for spawn in ET.parse(source).findall('spawn'):
    for t in spawn.findall('territory'):
        nodes=[{'x':int(n.get('x')),'y':int(n.get('y'))} for n in t.findall('node')]
        if len(nodes)<3:continue
        territories.append({'zone':spawn.get('zone') or spawn.get('name'),
            'minZ':int(t.get('minZ')),'maxZ':int(t.get('maxZ')),'nodes':nodes,
            'npcIds':[int(n.get('id')) for n in spawn.findall('npc')]})
print(json.dumps({'city':city,'file':file,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'territories':territories}))
