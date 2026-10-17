"""Publish contestable hall scenarios from the pinned High Five SQL, scripts and NPC XML."""
from pathlib import Path
import xml.etree.ElementTree as E
import json,re,hashlib
root=Path(__file__).resolve().parents[2]
data=next((root/'.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
ref=root/'.tmp/world-source/holding-reference'
scripts=data/'scripts/conquerablehalls'
npcs={int(n.get('id')):n for p in (root/'.tmp/hf-npcs').glob('*.xml') for n in E.parse(p).findall('npc')}
skills={int(n.get('id')):n for p in (data/'stats/skills').glob('*.xml') for n in E.parse(p).findall('skill')}
specs=[(21,'FortressOfResistance','damage',35375,'hall-resistance','Крепость Сопротивления'),(34,'DevastatedCastle','damage',35410,'hall-devastated','Разорённый замок'),(35,'BanditStronghold','defenders',None,'hall-bandit','Цитадель Бандитов'),(62,'RainbowSpringsChateau','rainbow',None,'hall-rainbow','Дворец радужных источников'),(63,'WildBeastReserve','defenders',None,'hall-beast','Заповедник Диких Зверей'),(64,'FortressOfTheDead','damage',35629,'hall-dead','Крепость Мёртвых')]
spawnrows=[dict(zip(['hall','npcId','x','y','z','heading','respawnSeconds','boss'],[int(h),int(n),int(x),int(y),int(z),int(head),int(resp),boss=='true'])) for h,n,x,y,z,head,resp,boss in re.findall(r"\((\d+),(\d+),(-?\d+),(-?\d+),(-?\d+),(\d+),(\d+),'(true|false)'\)",(ref/'clanhall_siege_guards.sql').read_text())]
rules={};wanted=set()
for id,script,kind,boss,asset,title in specs:
    file=scripts/script/(script+'.java');text=file.read_text(encoding='utf-8')
    constants={k:int(v) for k,v in re.findall(r'(?:static final int|private final int) (\w+) = (\d+);',text)}
    sql=re.search(r"\("+str(id)+r", '[^']+', 0, '[^']+', '[^']+', 0, (\d+), '([^']+)'\)",(ref/'siegable_clanhall.sql').read_text())
    town=re.search(r"\("+str(id)+r", '[^']+', 0, '[^']+', '([^']+)'",(ref/'siegable_clanhall.sql').read_text())[1]
    row={'id':'hall:'+str(id),'title':title,'region':town.lower(),'kind':kind,'asset':asset,'bossId':boss,'durationMs':int(sql[1]),'schedule':[int(n) for n in sql[2].split(';')],'minClanLevel':3 if kind=='rainbow' else 4,'maxClans':5 if kind=='defenders' else 4 if kind=='rainbow' else 500,'registrationRequired':id!=21,'preparationMs':3600000,'source':'scripts/conquerablehalls/'+script+'/'+script+'.java','sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'spawns':[s for s in spawnrows if s['hall']==id]}
    if id==21:
        # The dedicated script owns Nurka's spawn. Do not instantiate its legacy SQL row again.
        row['spawns']=[s for s in row['spawns'] if s['npcId']!=35375]
        row['spawns'].append({'npcId':35375,'x':45109,'y':112124,'z':-1900,'respawnSeconds':10800,'boss':True})
    if kind=='defenders':
        coord=text.split('FLAG_COORDS',1)[1].split('};',1)[0]
        row.update({'defenders':[constants['ALLY_'+str(i)] for i in range(1,6)],'flagIds':[constants['FLAG_RED']+i for i in range(5)],'flagPositions':[dict(zip(['x','y','z','heading'],map(int,values))) for values in re.findall(r'new Location\((-?\d+), (-?\d+), (-?\d+), (\d+)\)',coord)],'registrationGold':200000,'questItem':constants['QUEST_REWARD'],'maxMembers':18,'finalPauseMs':300000})
        wanted.update(row['defenders']);wanted.update(row['flagIds'])
    if kind=='rainbow':
        row.update({'decreeItem':8034,'minParty':5,'gourdIds':[35588,35589,35590,35591],'yetiIds':[35596,35597,35598,35599],'chestId':35593,'enragedYetiId':35592,'letterIds':{k[5:]:v for k,v in constants.items() if k.startswith('ITEM_')},'words':re.findall(r'new Word\("([A-Z]+)"',text),'itemIds':[8030,8031,8032,8033],'wordDelayMs':10000,'wordIntervalMs':300000,'chestIntervalMs':5000,'cleanupMs':120000})
        for key in ['ARENAS','YETIS_SPAWN','CHESTS_SPAWN']:
            block=text.split('int[][] '+key,1)[1].split('};',1)[0];row[key.lower()]=[dict(zip(['x','y','z'],map(int,v))) for v in re.findall(r'\{(-?\d+), (-?\d+), (-?\d+)\}',block)]
        wanted.update(row['gourdIds']+row['yetiIds']+[row['chestId'],row['enragedYetiId']])
    wanted.update(s['npcId'] for s in row['spawns']);rules[row['id']]=row
for id in list(wanted):
    wanted.update(int(m.get('id')) for m in npcs[id].findall('parameters/minions/npc'))
defs={}
statmap={'maxHp':'hp','pAtk':'pAtk','mAtk':'mAtk','pDef':'pDef','mDef':'mDef','pAtkSpd':'attackSpeed'}
for id in sorted(wanted):
    n=npcs[id];st=n.find('stats');v=st.find('vitals');a=st.find('attack');d=st.find('defence')
    vals={'hp':float(v.get('hp')),'pAtk':float(a.get('physical')),'mAtk':float(a.get('magical')),'pDef':float(d.get('physical')),'mDef':float(d.get('magical')),'attackSpeed':float(a.get('attackSpeed','253'))}
    for sk in n.findall('skillList/skill'):
        skill=skills.get(int(sk.get('id')))
        if skill is None or skill.findtext('operateType')!='P':continue
        level=int(sk.get('level'));tables={t.get('name'):(t.text or '').split() for t in skill.findall('table')}
        for effect in skill.findall('effects/effect'):
            for mul in effect.findall('mul'):
                key=statmap.get(mul.get('stat'));value=(mul.text or '').strip()
                if not key:continue
                if value in tables:value=tables[value][level-1]
                try:vals[key]*=float(value)
                except ValueError:pass
    attr=st.find('attribute/defence');ai=n.find('ai')
    defs[id]={'id':id,'name':n.get('name'),'level':int(n.get('level')),**vals,'resist':{k:float(v) for k,v in attr.attrib.items()} if attr is not None else {},'attackRange':float(a.get('range','40')),'runSpeed':float(st.find('speed/run').get('ground','0')) if st.find('speed/run') is not None else 0,'aggressive':ai is not None and ai.get('isAggressive')=='true','skillList':[dict(id=int(s.get('id')),level=int(s.get('level'))) for s in n.findall('skillList/skill')],'minions':[dict(id=int(m.get('id')),count=int(m.get('count')),respawnSeconds=int(m.get('respawnTime','0'))) for m in n.findall('parameters/minions/npc')],'source':'stats/npcs/'+str(id//100*100).zfill(5)+'-'+str(id//100*100+99).zfill(5)+'.xml'}
out=root/'template/hallScenarios.js'
out.write_text('// High Five 9fb01cb20513e55190cdde8d91e41be2c0914f84. Generated from SQL, Java scenarios and original NPC/skill XML.\nexport const HALL_SCENARIOS = '+json.dumps(rules,ensure_ascii=False,indent=2)+';\nexport const HALL_NPC_DEFS = '+json.dumps(defs,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
item_path=root/'template/l2Items.js';before=item_path.read_text(encoding='utf-8');items=json.loads(before.split('export default ',1)[1].strip().rstrip(';'))
event_ids={8030,8031,8032,8033,8034,5009,8293,8548}|set(rules['hall:62']['letterIds'].values())
for p in (data/'stats/items').glob('*.xml'):
    for item in E.parse(p).findall('item'):
        if int(item.get('id')) not in event_ids or item.get('id') in items:continue
        sets={s.get('name'):s.get('val') for s in item.findall('set')}
        items[item.get('id')]=[item.get('name'),item.get('type'),sets.get('crystal_type','NONE'),int(sets.get('price','0')),sets.get('etcitem_type')]
item_path.write_text(before.split('export default ',1)[0]+'export default '+json.dumps(items,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
print('Imported',len(rules),'scenarios,',len(defs),'NPC definitions,',len(spawnrows),'original spawns')
