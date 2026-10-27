"""Source Player.isFalling, Formulas.calcFallDam and original safe heights."""
from pathlib import Path
import hashlib,json,re,tarfile,xml.etree.ElementTree as E
commit='9fb01cb20513e55190cdde8d91e41be2c0914f84';base=next(Path('.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'));files={};core={};players={}
with tarfile.open('.tmp/world-source/h5-java.tar.gz') as archive:
 texts={}
 for name in ['Player.java','Formulas.java','GeneralConfig.java']:
  member=next(m for m in archive.getmembers() if m.name.endswith('/'+name));assert commit in member.name
  raw=archive.extractfile(member).read();core[member.name.split('/java/',1)[1]]=hashlib.sha256(raw).hexdigest();texts[name]=raw.decode('utf8')
player=texts['Player.java'];start=player.index('public boolean isFalling(int z)');end=player.index('public void setFalling()',start);body=player[start:end]
delay=int(re.search(r'}, (\d+)\);',body).group(1));validation=int(re.search(r'FALLING_VALIDATION_DELAY = (\d+);',player).group(1))
assert 'getCurrentHp() - 1' in body and 'getSafeFallHeight()' in body and 'if (_fallingDamage == 0)' in body
assert 'isInsideZone(ZoneId.WATER)' in body and 'isInvul()' in body
assert '(fallHeight * creature.getMaxHp()) / 1000' in texts['Formulas.java']
config=Path('.tmp/geodata/Falling-General.ini');raw=config.read_bytes();sha=hashlib.sha256(raw).hexdigest();assert sha=='b3db41e77b95be588aac9bf75a93fbf01019714c6e1ad58619e55f948c6178fe'
assert re.search(r'^EnableFallingDamage = True\s*$',raw.decode('utf8'),re.M)
for path in sorted((base/'stats/players/templates').rglob('*.xml')):
 raw=path.read_bytes();file=path.relative_to(base).as_posix();files[file]=hashlib.sha256(raw).hexdigest();root=E.fromstring(raw)
 players[int(root.findtext('classId'))]={'safeHeight':int(root.findtext('staticData/baseSafeFall'))}
data={'enabled':True,'damageDivisor':1000,'damageDelayMs':delay,'validationDelayMs':validation,'nonLethal':True,'players':players,'source':{'commit':commit,'files':files,'coreFiles':core,'configuration':{'url':f'https://gitlab.com/MobiusDevelopment/L2J_Mobius/-/raw/{commit}/L2J_Mobius_CT_2.6_HighFive/dist/game/config/General.ini','sha256':sha}}}
Path('template/nativeFallRules.js').write_text('// Original H5 fall damage and safe heights; client flight duration is not inferred.\nexport default '+json.dumps(data,indent=2)+';\n',encoding='utf8')
