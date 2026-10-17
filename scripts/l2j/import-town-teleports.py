from pathlib import Path
import xml.etree.ElementTree as E,json,re
root=Path(__file__).resolve().parents[2];data=next((root/'.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
gates={'aden':30848,'giran':30080,'rune':31320,'goddard':31275,'oren':30177,'dion':30059,'gludio':30256,'schuttgart':31964,'gludin':30320,'heine':30899,'hunters':30233,'talking-island-village':30006,'elven-village':30146,'dark-elven-village':30134,'orc-village':30576,'dwarven-village':30540,'kamael-village':32163}
def normalize(name):return re.sub('[^a-z]','',name.lower().replace('the ','').replace('town of ','').replace('village of ','').replace('castle town','').replace('township','').replace('village','')).strip()
aliases={normalize(name):id for id,name in [('aden','Aden'),('giran','Giran'),('rune','Rune'),('goddard','Goddard'),('oren','Oren'),('dion','Dion'),('gludio','Gludio'),('schuttgart','Schuttgart'),('gludin','Gludin'),('heine','Heine'),('floran','Floran'),('hunters','Hunters'),('talking-island-village','Talking Island'),('elven-village','Elven'),('dark-elven-village','Dark Elven'),('orc-village','Orc'),('dwarven-village','Dwarven'),('kamael-village','Kamael')]}
routes={}
for city,npc in gates.items():
    file=data/'teleporters/town'/(str(npc)+'.xml');routes[city]={}
    for loc in E.parse(file).findall('.//teleport[@type="NORMAL"]/location'):
        target=aliases.get(normalize(loc.get('name','')))
        if target and target!=city:routes[city][target]={'npcId':npc,'fee':int(loc.get('feeCount','0')),'item':int(loc.get('feeId','57')),'x':int(loc.get('x')),'y':int(loc.get('y')),'z':int(loc.get('z')),'source':str(file.relative_to(data)).replace('\\','/')}
(root/'template/townTeleports.js').write_text('// Pinned H5 NORMAL town routes. No invented direct routes or fares.\nexport const TOWN_TELEPORTS = '+json.dumps(routes,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
print('Imported',sum(len(rows) for rows in routes.values()),'direct town routes')
