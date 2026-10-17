"""Import settlement bounds, NPC spawns and race creation points from pinned H5 XML."""
from pathlib import Path
import xml.etree.ElementTree as E
import json

root=Path(__file__).resolve().parents[2]
data=next((root/'.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
defs={n.get('id'):n for p in (root/'.tmp/hf-npcs').glob('*.xml') for n in E.parse(p).getroot().findall('npc')}
spawns=[]
for p in (data/'spawns').rglob('*.xml'):
    for n in E.parse(p).getroot().findall('.//npc'):
        if n.get('x') and n.get('y'):
            spawns.append({'npcId':int(n.get('id')),'x':int(n.get('x')),'y':int(n.get('y')),'z':int(n.get('z','0')),'source':str(p.relative_to(data)).replace('\\','/')})
towns={z.get('name'):z for z in E.parse(data/'zones/custom_town.xml').findall('zone')}
specs=[('floran','Флоран','Floran Village',None,None,'dion'),('hunters','Деревня Охотников','Hunter Village',30233,None,'aden'),
       ('talking-island-village','Деревня Говорящего Острова','Talking Island',30006,'human','gludin'),
       ('elven-village','Эльфийская деревня','Elven Village',30146,'elf','oren'),
       ('dark-elven-village','Деревня Тёмных Эльфов','Dark Elven Village',30134,'darkElf','gludio'),
       ('orc-village','Деревня Орков','Orc Village',30576,'orc','schuttgart'),
       ('dwarven-village','Деревня Гномов','Dwarven Village',30540,'dwarf','schuttgart'),
       ('kamael-village','Деревня Камаэль','Kamael Village',32163,'kamael','gludio')]
def inside(x,y,polygon):
    result=False
    for a,b in zip(polygon,polygon[-1:]+polygon[:-1]):
        if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:result=not result
    return result
settlements=[];npcs=[]
for id,name,source,gk,race,parent in specs:
    town=towns[source];polygon=[[int(n.get('X')),int(n.get('Y'))] for n in town.findall('node')]
    positions=[s for s in spawns if inside(s['x'],s['y'],polygon)]
    gate=next((s for s in positions if s['npcId']==gk),None)
    if gk and gate is None:raise ValueError('Gatekeeper spawn missing: '+id)
    anchor=gate if gate else {key.lower():int(value) for key,value in E.parse(data/'mapregion/floran_town.xml').find('.//respawnPoint[@isChaotic="true"]').attrib.items() if key in ['X','Y','Z']}
    x,y=anchor['x'],anchor['y']
    settlements.append({'id':id,'name':name,'x':x,'y':y,'gk':defs[str(gk)].get('name') if gk else None,'size':65536,'parentRegion':parent,'starterRace':race,'polygon':polygon,'sourceZone':source,'npcSource':'L2J H5 pinned spawns'})
    seen=set()
    for spawn in positions:
        n=defs.get(str(spawn['npcId']))
        if n is None or (spawn['npcId'],spawn['x'],spawn['y']) in seen:continue
        seen.add((spawn['npcId'],spawn['x'],spawn['y']))
        kind=n.get('type','');gateway=spawn['npcId']==gk
        role='Хранитель портала' if gateway else 'Кузнец' if 'Blacksmith' in kind else 'Хранитель склада' if 'Warehouse' in kind else 'Торговец' if 'Merchant' in kind else None
        if not role:continue
        npcs.append({**spawn,'id':id+':'+str(spawn['npcId']),'name':n.get('name'),'role':role,'city':id,'gateway':gateway,'adapted':False})
creation={}
for p in (data/'stats/players/templates/StartingClass').glob('*.xml'):
    doc=E.parse(p);creation[doc.findtext('classId')]=[dict((k,int(v)) for k,v in n.attrib.items()) for n in doc.findall('.//creationPoints/node')]
corrections={}
for city,id in [('schuttgart',31964),('rune',31320)]:
    spawn=next(s for s in spawns if s['npcId']==id)
    corrections[city]={**spawn,'name':defs[str(id)].get('name')}
out=root/'template/worldSettlements.js'
out.write_text('// Source: L2J Mobius H5 9fb01cb20513e55190cdde8d91e41be2c0914f84. Presentation viewport size is not geodata.\n'+
 'export const SETTLEMENTS = '+json.dumps(settlements,ensure_ascii=False,indent=2)+';\n'+
 'export const SETTLEMENT_NPCS = '+json.dumps(npcs,ensure_ascii=False,indent=2)+';\n'+
 'export const GATEKEEPER_CORRECTIONS = '+json.dumps(corrections,ensure_ascii=False,indent=2)+';\n'+
 'export const CREATION_POINTS = '+json.dumps(creation,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
(root/'.tmp/settlement-spawns.json').write_text(json.dumps(spawns),encoding='utf-8')
(root/'.tmp/settlement-data.json').write_text(json.dumps({'settlements':settlements,'creation':creation}),encoding='utf-8')
print('Imported',len(settlements),'settlements,',len(npcs),'NPCs,',len(creation),'creation templates')
