"""Source NPC waypoints for empty public landings; never boss admission."""
from pathlib import Path
import hashlib, json, subprocess, xml.etree.ElementTree as ET

base=next(Path('.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
source=json.loads(subprocess.check_output(['node','--input-type=module','-e',
    'import {MISSING_WORLD_SOURCE} from "./docs/missing-world-sources.js";console.log(JSON.stringify(MISSING_WORLD_SOURCE))'],encoding='utf8'))
zones={}
for zone,floor,npc_id,file in [('tower-of-insolence',13,31862,'spawns/Others/23_18.xml'),*[("ivory-tower",floor,npc,'spawns/Others/22_18.xml') for floor,npc in [(2,30162),(3,30727),(4,30716),(5,30719),(6,30722)]],*[("cruma-tower",floor,npc,'spawns/Others/20_21.xml') for floor,npc in [('entrance',30483),(1,30487),(2,30485),(3,31843)]]]:
    data=(base/file).read_bytes();sha=hashlib.sha256(data).hexdigest();assert sha==source['files'][file]
    matches=[n for n in ET.fromstring(data).findall('.//npc') if n.get('id')==str(npc_id)]
    assert len(matches)==1
    npc=matches[0];point={k:int(npc.get(k)) for k in ['x','y','z']}
    zones.setdefault(zone,{})[floor]={'point':point,'source':{'type':'SOURCE_NPC','id':npc_id,**point,'file':file,'sha256':sha,'commit':source['commit']}}
import runpy
zones.update(runpy.run_path('scripts/l2j/import-native-dungeon-access.py')['build']()['landmarks'])
Path('template/nativeInteriorLandmarks.js').write_text('// Original NPC waypoints on empty public floors. No interaction or boss admission is granted.\nexport default '+json.dumps({'zones':zones},ensure_ascii=False,indent=2)+';\n',encoding='utf8')
