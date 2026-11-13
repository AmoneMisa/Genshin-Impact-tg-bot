"""Import the pinned H5 water movement and breath contract, without invented depths."""
from pathlib import Path
import hashlib,json,re,tarfile,xml.etree.ElementTree as E
commit='9fb01cb20513e55190cdde8d91e41be2c0914f84'
base=next(Path('.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
core={};texts={};files={};players={}
with tarfile.open('.tmp/world-source/h5-java.tar.gz') as archive:
 for name in ['Player.java','Creature.java','CreatureStat.java','CreatureTemplate.java','PlayerTemplateData.java','WaterTask.java','WaterZone.java','ZoneCuboid.java','ZoneNPoly.java']:
  member=next(m for m in archive.getmembers() if m.name.endswith('/'+name));assert commit in member.name
  raw=archive.extractfile(member).read();core[member.name.split('/java/',1)[1]]=hashlib.sha256(raw).hexdigest();texts[name]=raw.decode('utf8')
p=texts['Player.java'];start=p.index('public void startWaterTask()');body=p[start:p.index('public boolean isInWater()',start)]
breath=int(re.search(r'baseTimeInWater = (\d+);',body).group(1));interval=int(re.search(r'new WaterTask\(this\), timeInWater, (\d+)\)',body).group(1))
assert 'getBaseTemplate().getBaseBreath()) / 100d' in body
assert 'getMaxHp() / 100.0' in texts['WaterTask.java'] and 'reduceCurrentHp(reduceHp, _player, false, false, null)' in texts['WaterTask.java']
assert 'return getZone().getHighZ();' in texts['WaterZone.java']
assert '_isFlying && (distance == 0) && (dz != 0)' in texts['Creature.java']
limit=int(re.search(r'if \(isInWater && \(distance > (\d+)\)\)',texts['Creature.java']).group(1))
assert 'distance = Math.sqrt((dx * dx) + (dy * dy));' in texts['Creature.java'] and 'Math.sqrt(delta + (dz * dz))' in texts['Creature.java']
assert 'return _creature.isRunning() ? getSwimRunSpeed() : getSwimWalkSpeed();' in texts['CreatureStat.java']
assert 'set.getInt("baseBreath", 100)' in texts['CreatureTemplate.java']
for name in ['ZoneCuboid.java','ZoneNPoly.java']:
 assert '_z1 = Math.min(z1, z2);' in texts[name] and '_z2 = Math.max(z1, z2);' in texts[name]
for path in sorted((base/'stats/players/templates').rglob('*.xml')):
 raw=path.read_bytes();files[path.relative_to(base).as_posix()]=hashlib.sha256(raw).hexdigest();root=E.fromstring(raw);s=root.find('staticData')
 players[int(root.findtext('classId'))]={'breath':int(s.findtext('baseBreath','100')),'fastSwim':float(s.findtext('baseMoveSpd/fastSwim')),'slowSwim':float(s.findtext('baseMoveSpd/slowSwim'))}
for name in ['water.xml','custom_water.xml']:
 path=base/'zones'/name;files[path.relative_to(base).as_posix()]=hashlib.sha256(path.read_bytes()).hexdigest()
data={'baseBreathMs':breath,'breathDivisor':100,'damageIntervalMs':interval,'damageHpDivisor':100,'minimumDamage':1,'maxClickXY':limit,'verticalOnlySwimming':False,'players':players,'source':{'commit':commit,'files':files,'coreFiles':core}}
Path('template/nativeWaterRules.js').write_text('// Original H5 water speeds, breath and movement thresholds.\nexport default '+json.dumps(data,indent=2)+';\n',encoding='utf8')
print(f'{len(players)} original water class templates; {len(core)} pinned core files')
