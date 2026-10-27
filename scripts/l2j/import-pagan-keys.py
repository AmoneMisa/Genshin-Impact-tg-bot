"""Pinned item/skill/door rules for the original Pagan Temple keys."""
from pathlib import Path
import hashlib,json,re,tarfile,xml.etree.ElementTree as E

base=next(Path('.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
commit='9fb01cb20513e55190cdde8d91e41be2c0914f84';files={}
def read(file,expected=None):
 raw=(base/file).read_bytes();sha=hashlib.sha256(raw).hexdigest()
 if expected:assert sha==expected
 files[file]=sha;return E.fromstring(raw)
items=read('stats/items/08200-08299.xml')
skills=read('stats/skills/02200-02299.xml','f1a0fac164c7332d60e17e24940a548a6a02918a5e93e64f994c8bff9770d4b1')
keys={}
for item_id,skill_id in [(8273,2235),(8274,2236),(8275,2237)]:
 item=items.find(f'item[@id="{item_id}"]');skill=skills.find(f'skill[@id="{skill_id}"]')
 assert item.find('skills/skill').get('id')==str(skill_id)
 assert skill.findtext('targetType')=='UNLOCKABLE' and skill.findtext('isMagic')=='2'
 assert int(skill.findtext('itemConsumeId'))==item_id and skill.findtext('itemConsumeCount')=='1'
 effect=skill.find('effects/effect[@name="OpenDoor"]');assert effect.findtext('chance')=='100' and effect.findtext('isItem')=='true'
 keys[item_id]={'skillId':skill_id,'name':item.get('name'),'icon':item.find('set[@name="icon"]').get('val'),'doorIds':[int(i) for i in skill.find('conditions/target').get('npcId').split(',')],
  'range':int(skill.findtext('castRange')),'effectRange':int(skill.findtext('effectRange')),'hitMs':int(skill.findtext('hitTime')),'reuseMs':int(skill.findtext('reuseDelay')),'consume':int(skill.findtext('itemConsumeCount'))}
assert [k['range'] for k in keys.values()]==[40,1000,40]
doors={}
for n in read('Doors.xml').findall('door'):
 if int(n.get('id')) not in {i for k in keys.values() for i in k['doorIds']}:continue
 delay=int(n.get('close_time','-1'))
 doors[int(n.get('id'))]={'name':n.get('name'),'point':dict(zip(['x','y','z'],map(int,n.get('pos').split(',')))),'closeMs':delay*1000 if delay>=0 else None,'defaultOpen':n.get('default_status')=='open','group':n.get('group')}
assert len(doors)==16
radii={}
for path in sorted((base/'stats/players/templates').rglob('*.xml')):
 root=read(path.relative_to(base).as_posix());id=int(root.findtext('classId'))
 # Player.checkUseMagicCondition uses the integer CreatureTemplate radius;
 # PlayerTemplateData fills that field from collisionMale for both genders.
 radii[id]=int(float(root.findtext('staticData/collisionMale/radius')))
core={}
with tarfile.open('.tmp/world-source/h5-java.tar.gz') as archive:
 for file in ['entity/actor/Creature.java','entity/actor/Player.java','entity/actor/instance/Door.java','entity/actor/templates/DoorTemplate.java','data/xml/PlayerTemplateData.java','mechanics/skill/Skill.java','mechanics/Formulas.java']:
  member=next((m for m in archive.getmembers() if m.name.endswith('/'+file)),None)
  if member is None and file=='mechanics/Formulas.java':member=next(m for m in archive.getmembers() if m.name.endswith('/Formulas.java'))
  assert member and commit in member.name
  raw=archive.extractfile(member).read();core[member.name.split('/java/',1)[1]]=hashlib.sha256(raw).hexdigest()
  if file.endswith('/Skill.java'):assert b'return _magic == 2;' in raw
  if file.endswith('/DoorTemplate.java'):assert b'set.getInt("close_time", -1)' in raw
  if file.endswith('/Player.java'):assert b'isInsideRadius2D(target, skill.getCastRange() + getTemplate().getCollisionRadius())' in raw
effect='scripts/handlers/skill/effects/OpenDoor.java';raw=(base/effect).read_bytes();files[effect]=hashlib.sha256(raw).hexdigest()
assert b'(Rnd.get(100) < _chance) && !door.isOpen()' in raw
file='scripts/ai/areas/PaganTemple/PaganKeys.java';raw=(base/file).read_bytes();files[file]=hashlib.sha256(raw).hexdigest();java=raw.decode('utf8');drops={}
for npc,item in [('ZOMBIE_WORKER','ANTEROOM_KEY'),('TRIOLS_LAYPERSON','CHAPEL_KEY'),('TRIOLS_PRIEST','KEY_OF_DARKNESS')]:
 value=lambda name:int(re.search(r'private static final int '+name+r' = (\d+);',java).group(1))
 drops[value(npc)]={'itemId':value(item),'chance':value(item+'_CHANCE')}
 assert f'giveItems(killer, {item}, 1)' in java
data={'keys':keys,'doors':doors,'playerRadii':radii,'scriptDrops':drops,'source':{'commit':commit,'files':files,'coreFiles':core}}
Path('template/paganKeys.js').write_text('// Original H5 static item skills, door targets and source cast radius.\nexport default '+json.dumps(data,indent=2)+';\n',encoding='utf8')
