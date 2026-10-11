"""Import H5 NPCs, instance entry tables and ownership polygons; encounter layouts use our combat scale."""
from pathlib import Path
import xml.etree.ElementTree as E
import json,re
root=Path(__file__).resolve().parents[2]
source=root/'.tmp/world-source'
npcs={}
for p in (root/'.tmp/hf-npcs').glob('*.xml'):
    for n in E.parse(p).getroot().findall('npc'):npcs[n.get('id')]=n
def mob(id):
    n=npcs.get(str(id))
    if n is None:return None
    st=n.find('stats');v=st.find('vitals');a=st.find('attack');d=st.find('defence');ac=n.find('acquire');attr=st.find('attribute/defence')
    return {'id':str(id),'name':n.get('name'),'level':int(n.get('level')),'hp':float(v.get('hp')),'pAtk':float(a.get('physical')),'mAtk':float(a.get('magical')),'pDef':float(d.get('physical')),'accuracy':float(a.get('accuracy',0)),'crit':float(a.get('critical',0)),'attackSpeed':float(a.get('attackSpeed',253)),'resist':{k:float(v) for k,v in attr.attrib.items()} if attr is not None else {},'expShare':.002,'gold':None,'drops':[]}
def zone(id,title,ids,**kw):
    mobs=[m for i in dict.fromkeys(ids) if (m:=mob(i)) is not None]
    levels=[m['level'] for m in mobs]
    return {'id':id,'title':title,'min':min(levels),'max':max(levels),'level':sorted(levels)[len(levels)//2],'kind':'catacomb','mobs':mobs,**kw}
zones=[]
for id,title,path,filterIds,floors in [('imperial-tomb','Имперская гробница','spawns/Goddard/ImperialTomb.xml',None,2),('pagan-temple','Храм Язычников','spawns/Others/19_16.xml',range(22136,22174),2),('cruma-tower','Башня Крумы','spawns/Others/20_21.xml',range(20213,20224),3)]:
    ids=[n.get('id') for n in E.parse(source/path).getroot().findall('.//npc') if n.get('id') in npcs and (filterIds is None or int(n.get('id')) in filterIds) and float(npcs[n.get('id')].find('stats/vitals').get('hp',0))>0]
    if not ids and id=='cruma-tower':ids=['20213','20214','20215','20216','20217','20218']
    zones.append(zone(id,title,list(dict.fromkeys(ids))[:6],floors=floors))
java=(source/'scripts/instances/Kamaloka/Kamaloka.java').read_text(encoding='utf-8')
def nums(name):return [int(v) for v in re.search(r'int\[\] '+name+r'\s*=\s*\{(.*?)\}',java,re.S)[1].replace('\n','').replace('\t','').split(',') if v.strip()]
levels,ids,durations,sizes=[nums(n) for n in ['LEVEL','TEMPLATE_IDS','DURATION','MAX_PARTY_SIZE']]
bosses=re.findall(r'\{(\d+),[^{}]+\}',re.search(r'int\[\]\[\] BOSS\s*=\s*\{(.*?)\};',java,re.S)[1])
def rows(name):
    value=re.search(r'int\[\]\[\] '+name+r'\s*=\s*\{(.*?)\};',java,re.S)[1]
    return [None if token=='null' else [int(n) for n in token[1:-1].replace(' ','').split(',')] for token in re.findall(r'null|\{[^{}]+\}',value)]
first,second=rows('FIRST_ROOM'),rows('SECOND_ROOM')
for index,(level,instance,duration,size,boss) in enumerate(zip(levels,ids,durations,sizes,bosses)):
    lab=size==9;zid=f'{"labyrinth" if lab else "kamaloka"}-{level}'
    mobs=[boss]
    stages=[mobs]
    if lab:
        stage1=[str(v) for v in first[index][:2]];stage2=[str(second[index][0])];stage3=[str(int(boss)-1)];stages=[stage1,stage2,stage3,[boss]];mobs=[v for stage in stages for v in stage]
    zones.append(zone(zid,f'{"Лабиринт Бездны" if lab else "Камалока"} · {level}',mobs,instance={'kind':'labyrinth' if lab else 'kamaloka','level':level,'partyMin':2,'partyMax':size,'durationMs':duration*60000,'templateId':instance,'resetHour':6,'resetMinute':30,'stages':stages},floors=4 if lab else 1))
for area in E.parse(source/'DimensionalRift.xml').getroot().findall('area'):
    ids=[s.get('mobId') for s in area.findall('.//spawn')]
    z=zone(f'rift-{area.get("type")}','Разлом Измерений · '+area.get('type'),ids,floors=1,riftRooms=[{'id':'r'+str(i//3)+'c'+str(i%3),'cap':sum(int(s.get('count')) for s in room.findall('spawn')),'mobIds':[s.get('mobId') for s in room.findall('spawn')]} for i,room in enumerate(area.findall('room'))],instance={'kind':'rift','partyMin':2,'partyMax':9,'durationMs':2400000,'fragments':{1:18,2:21,3:24,4:27,5:30,6:33}.get(int(area.get('type')),33)})
    zones.append(z)
holdings=[]
for filename,kind,key in [('castle_siege.xml','castle','castleId'),('fortress_siege.xml','fort','fortId'),('clan_hall_siege.xml','hall','clanHallId'),('clan_hall.xml','hall','clanHallId')]:
    for z in E.parse(source/'zones'/filename).getroot().findall('zone'):
        st=z.find(f"stat[@name='{key}']")
        if st is None:continue
        polygon=[[int(n.get('X')),int(n.get('Y'))] for n in z.findall('node')]
        if not polygon:continue
        x=sum(p[0] for p in polygon)/len(polygon);y=sum(p[1] for p in polygon)/len(polygon)
        holdings.append({'id':kind+':'+st.get('val'),'sourceId':int(st.get('val')),'name':z.get('name').replace('_',' '),'kind':kind,'x':round(x),'y':round(y),'polygon':polygon,'conquerable':filename!='clan_hall.xml'})
def write(name,data): (root/'template'/name).write_text('// Generated from audited H5 XML and Kamaloka.java; encounter scaling is custom.\nexport default '+json.dumps(data,ensure_ascii=False)+';\n',encoding='utf-8')
unique={}
for h in holdings:unique.setdefault(h['id'],h)
write('worldZones.js',zones);write('worldHoldings.js',list(unique.values()))
positions={}
for p in (source/'spawns').rglob('*.xml'):
    for n in E.parse(p).getroot().findall('.//npc'):
        id=int(n.get('id',0))
        if 25000<=id<=29999 and n.get('x') and n.get('y'):positions.setdefault(id,{'x':int(n.get('x')),'y':int(n.get('y'))})
for id,x,y in [(29001,-22000,180000),(29006,17200,113000),(29014,64000,28000),(29020,114600,16000),(29068,185000,114000),(29028,213000,-115000),(29047,182000,-78000),(29179,114000,-114000),(29180,114000,-114000),(29186,-11000,236000),(29022,43000,206000),(29181,43000,206000)]:positions.setdefault(id,{'x':x,'y':y})
write('worldBossMap.js',positions)
print('Imported',len(zones),'zones and',len(holdings),'ownership areas')
