"""Original automatic Privates for reviewed native fields from pinned H5 sources."""
from pathlib import Path
import hashlib,json,os,re,subprocess,sys,xml.etree.ElementTree as ET

base=next(Path('.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
registry=json.loads(subprocess.check_output(['node','--input-type=module','-e','import r from "./template/nativeFieldPilot.js";console.log(JSON.stringify(r))'],encoding='utf8'))
existing=json.loads(subprocess.check_output(['node','--input-type=module','-e','import m from "./template/nativeMinions.js";console.log(JSON.stringify(Object.keys(m.zones)))'],encoding='utf8'))
requested=list(dict.fromkeys(['cruma-tower',*existing,*sys.argv[1:]]));assert all(z in registry['fields'] for z in requested)
files={};npcs={}
def xml(file):
 data=(base/file).read_bytes();sha=hashlib.sha256(data).hexdigest()
 if file in registry['source']['files']:assert sha==registry['source']['files'][file]
 files[file]=sha;return ET.fromstring(data)
def npc(id):
 if id not in npcs:
  file=f'stats/npcs/{int(id)//100*100}-{int(id)//100*100+99}.xml'
  npcs.update({n.get('id'):n for n in xml(file).findall('npc')})
 return npcs[id]
parents=sorted({id for z in requested for id in registry['fields'][z].get('unportedMinionTemplates',[]) if npc(id).find('parameters/minions[@name="Privates"]') is not None})
exp={int(n.get('level')):int(n.get('tolevel')) for n in xml('stats/players/experience.xml').findall('experience')}
pins={'Native-MinionList.java':'41a856a15b6b6c4bb43fb07240e21c7563c8cff60f02d226e06a1260bccfea72','Native-Spawn.java':'42307eac0dd6bb2661e9b069d39a0fad67c62a466bf0ab520cac6a39fbd0b045','Native-Npc.ini':'fb3319fb29eb957b98f300505617715fbf10fbfbeb96a2e458e9c6282cd5718b'}
pins.update({'Native-AttackableAI.java':'92aa96d61b6f0f3de7b3f8184f640fdd1b4b1fca1744b3d3c0826bf92086607a','Native-Attackable.java':'97d5c07a5455776f55733c71dbc2117901027042a8b9d69f258b8674d2888fed','Native-NpcTemplate.java':'2db4b108e9e4c2b658e216775e0bc774ca8846785b5ed00e4de7e35b1f4fbd04'})
for file,sha in pins.items():assert hashlib.sha256((Path('.tmp/geodata')/file).read_bytes()).hexdigest()==sha
Path('art-source/geodata/minions').mkdir(parents=True,exist_ok=True)
Path('art-source/geodata/minions/MinionList.java').write_bytes(Path('.tmp/geodata/Native-MinionList.java').read_bytes())
config=Path('.tmp/geodata/Native-Npc.ini').read_text();assert 'ForceDeleteMinions = False' in config
overrides=dict((int(i),int(t)*1000) for i,t in re.findall(r'(\d+),(\d+)',re.search(r'^CustomMinionsRespawnTime\s*=\s*(.*)',config,re.M).group(1)))
masters={};actors={}
for id in parents:
 n=npc(id);assert n.get('type') in ['Monster','L2Monster'];radius=float(n.find('collision/radius').get('normal'));group=n.find('parameters/minions[@name="Privates"]');assert group is not None
 entries=[]
 for m in group.findall('npc'):
  child=m.get('id');assert int(child) not in overrides and m.get('respawnTime')=='0'
  entries.append({'id':child,'count':int(m.get('count')),'respawnMs':0})
  c=npc(child);st=c.find('stats');ac=c.find('acquire');attack=st.find('attack');defence=st.find('defence');ad=st.find('attribute/defence');level=int(c.get('level'));ai=c.find('ai')
  drops=[];groups=[];gold=None
  for g in c.findall('dropLists/drop/group'):
   rows=[]
   for item in g.findall('item'):
    row=[int(item.get('id')),int(item.get('min')),int(item.get('max')),float(item.get('chance'))];rows.append(row)
    chance=float(g.get('chance'))*row[3]/100
    if row[0]==57:gold={'min':row[1],'max':row[2],'chance':chance}
    else:drops.append([*row[:3],chance])
   groups.append({'chance':float(g.get('chance')),'items':rows})
  actors[child]={'definition':{'id':child,'name':c.get('name'),'level':level,'hp':float(st.find('vitals').get('hp')),'pAtk':float(attack.get('physical')),'mAtk':float(attack.get('magical')),'pDef':float(defence.get('physical')),'mDef':float(defence.get('magical')),'accuracy':float(attack.get('accuracy','0')),'crit':float(attack.get('critical','0')),'attackSpeed':float(attack.get('attackSpeed','253')),'resist':{k:float(v) for k,v in ad.attrib.items()} if ad is not None else {},'expShare':float(ac.get('exp'))/(exp[level+1]-exp[level]),'rewardless':False,'gold':gold,'drops':[]},'movement':{'runSpeed':float(st.find('speed/run').get('ground')),'attackRange':float(attack.get('range'))},'ai':{'aggressive':ai.get('isAggressive','true')=='true','aggroRange':int(ai.get('aggroRange','0')),'clanHelpRange':int(ai.get('clanHelpRange','0')),'clans':[e.text for e in ai.findall('clanList/clan')],'ignoredIds':[e.text for e in ai.findall('clanList/ignoreNpcId')]},'loot':drops,'sourceGroups':groups,'sp':float(ac.get('sp'))}
 masters[id]={'collisionRadius':radius,'group':'Privates','entries':entries}
core_paths={'Native-MinionList.java':'java/org/l2jmobius/gameserver/entity/actor/holders/npc/MinionList.java','Native-Spawn.java':'java/org/l2jmobius/gameserver/entity/spawns/Spawn.java','Native-Npc.ini':'dist/game/config/NPC.ini','Native-AttackableAI.java':'java/org/l2jmobius/gameserver/ai/AttackableAI.java','Native-Attackable.java':'java/org/l2jmobius/gameserver/entity/actor/Attackable.java','Native-NpcTemplate.java':'java/org/l2jmobius/gameserver/entity/actor/templates/NpcTemplate.java'}
data={'zones':{z:[id for id in registry['fields'][z].get('unportedMinionTemplates',[]) if id in masters] for z in requested},'masters':masters,'actors':actors,'spawnOffsetRadius':200,'minimumSpawnRadius':30,'forceDeleteMinions':False,'source':{'commit':'9fb01cb20513e55190cdde8d91e41be2c0914f84','repository':'https://gitlab.com/MobiusDevelopment/L2J_Mobius','files':files,'coreFiles':{core_paths[f]:sha for f,sha in pins.items()}}}
for child,actor in actors.items():actor['movement']['walkSpeed']=float(npcs[child].find('stats/speed/walk').get('ground'))
Path(os.environ.get('NATIVE_MINION_OUTPUT','template/nativeMinions.js')).write_text('// Original automatic Privates; positions are runtime proposals, never fixed source spawns.\nexport default '+json.dumps(data,indent=2)+';\n',encoding='utf8')
