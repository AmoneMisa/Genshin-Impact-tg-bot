"""Publish the sounds and music the Mini App plays, from a local L2 client (never modified).

    python scripts/l2j/build-l2-audio.py <client dir> [used-skill-ids.json]

Skill sounds follow the client's own table (skillsoundgrp.dat: skill -> cast / shot / explosion sound), only for
the skills the game uses. Interface and item sounds and the town themes are picked by name. Everything is
re-encoded to small mp3 files under webapp/audio and described in webapp/audio/l2-audio.js.
"""
import sys,io,json,re,zlib,struct,importlib.util
from pathlib import Path
import av

HERE=Path(__file__).parent;ROOT=HERE.parent.parent;OUT=ROOT/'webapp'/'audio'
spec=importlib.util.spec_from_file_location('l2sound',HERE/'extract-l2sound.py');l2sound=importlib.util.module_from_spec(spec);spec.loader.exec_module(l2sound)

MAX_SECONDS=6.0      # skill sounds; the few feedback jingles may be longer
MAX_JINGLE=12.0
# Interface, items and system feedback: key -> package.sound
GENERIC={
 'click':'InterfaceSound.click_01','windowOpen':'InterfaceSound.inventory_open_01','windowClose':'InterfaceSound.inventory_close_01',
 'questAccept':'InterfaceSound.quest_accept_01','pickup':'ItemSound.Pickup','scroll':'ItemSound.Scroll','paper':'ItemSound.itemdrop_etc_paper',
 'money':'ItemSound.itemdrop_etc_money','potion':'ItemSound.itemdrop_etc_potion','clickFailed':'ItemSound.click_failed',
 'fanfare':'ItemSound.quest_fanfare_1','fanfareSmall':'ItemSound.quest_fanfare_easy','jackpot':'ItemSound.quest_jackpot',
 'enchantOk':'ItemSound3.sys_enchant_success','enchantFail':'ItemSound3.sys_enchant_failed','craftOk':'ItemSound3.sys_make_success',
 'craftFail':'ItemSound3.sys_make_fail','failed':'ItemSound3.sys_failed','levelUp':'SkillSound.levelup','diceRoll':'ScrydeSound.h_y_rolling_dice_ca',
 'heal':'SkillSound.heal_shot','potionDrink':'SkillSound.potion','critical':'SkillSound.critical_hit','teleport':'SkillSound.teleport_in',
}
# Town id -> client music file (no theme is known for rune, goddard and schuttgart)
TOWNS={'aden':'NT_Aden','giran':'NT_Giran','oren':'NT_Oren','dion':'NT_Dion','gludio':'NT_Gludio','gludin':'NT_Gludin','heine':'NT_Heiness',
 'floran':'NT_Floren','hunters':'NT_Hunters','talking-island-village':'NT_Speaking','elven-village':'NT_Elf','dark-elven-village':'NT_DarkElf',
 'orc-village':'NT_Orc','dwarven-village':'NT_Dwarf','kamael-village':'NT_Kamael'}

def decode_table(path):
 src=(HERE/'import-skill-groups.mjs').read_text(encoding='utf8')
 mod=int(re.search(r"BigInt\('0x([0-9a-f]+)'\)",src).group(1),16);d=path.read_bytes();enc=d[28:len(d)-20];chunks=[]
 for o in range(0,len(enc),128):
  b=pow(int.from_bytes(enc[o:o+128],'big'),29,mod).to_bytes(128,'big');size=b[3];st=128-((size+3)&~3);chunks.append(b[st:st+size])
 packed=b''.join(chunks);return zlib.decompress(packed[4:])

def skill_sounds(raw):
 u32=lambda o:struct.unpack_from('<I',raw,o)[0]
 def string(o):
  if o+4>len(raw):return None
  L=u32(o)
  if L==0:return '',o+4
  if L%2 or L>400 or o+4+L>len(raw):return None
  b=raw[o+4:o+4+L]
  if any(b[i+1]!=0 or not(32<=b[i]<127 or(b[i]==0 and i==len(b)-2)) for i in range(0,len(b),2)):return None
  return b.decode('utf-16le').rstrip(chr(0)),o+4+L
 rows={};q=4;prev=None
 while q<len(raw)-12:
  sid,lv=u32(q),u32(q+4);ok=0<sid<40000 and 0<lv<400 and not(prev and (sid,lv)<=prev)
  if ok:
   o=q+8;names=[]
   for _ in range(3):
    r=string(o)
    if r is None:ok=False;break
    names.append(r[0]);o=r[1]
   ok=ok and any(names)
  if ok:rows.setdefault(sid,names);prev=(sid,lv);q=o+16
  else:q+=4
 return rows

def encode(wav,dest,limit=MAX_SECONDS,rate=32000,bitrate=48000):
 with av.open(io.BytesIO(wav)) as source:
  stream=source.streams.audio[0];seconds=float(stream.duration*stream.time_base) if stream.duration else 0
  if seconds>limit:return False
  resampler=av.AudioResampler(format='s16p',layout='mono',rate=rate)
  with av.open(str(dest),'w',format='mp3') as out:
   enc=out.add_stream('libmp3lame',rate=rate);enc.bit_rate=bitrate;enc.layout='mono'
   for frame in source.decode(stream):
    for f in resampler.resample(frame):
     for p in enc.encode(f):out.mux(p)
   for f in resampler.resample(None):
    for p in enc.encode(f):out.mux(p)
   for p in enc.encode(None):out.mux(p)
 return True

def transcode_music(src,dest):
 data=src.read_bytes()
 if data[:4]==b'DATA':data=b'OggS'+data[4:]   # the client replaces the first Ogg page's magic
 with av.open(io.BytesIO(data)) as source,av.open(str(dest),'w',format='mp3') as out:
  stream=source.streams.audio[0];enc=out.add_stream('libmp3lame',rate=44100);enc.bit_rate=80000;enc.layout='stereo'
  resampler=av.AudioResampler(format='s16p',layout='stereo',rate=44100)
  for frame in source.decode(stream):
   for f in resampler.resample(frame):
    for p in enc.encode(f):out.mux(p)
  for p in enc.encode(None):out.mux(p)

if __name__=='__main__':
 client=Path(sys.argv[1]);used=set(json.loads(Path(sys.argv[2]).read_text())) if len(sys.argv)>2 else None
 sfx_dir=OUT/'sfx';music_dir=OUT/'music';sfx_dir.mkdir(parents=True,exist_ok=True);music_dir.mkdir(parents=True,exist_ok=True)
 cache={};files={}
 def sound(ref):
  pkg,name=ref.split('.',1)
  if pkg not in cache:cache[pkg]=dict(l2sound.sounds(client/'Sounds'/(pkg+'.uax')))
  return cache[pkg].get(name)
 def publish(ref,limit=MAX_SECONDS):
  if ref in files:return files[ref]
  wav=sound(ref)
  if not wav:files[ref]=None;return None
  slug=re.sub(r'[^a-z0-9]+','-',ref.lower()).strip('-')+'.mp3'
  files[ref]=slug if encode(wav,sfx_dir/slug,limit) else None
  return files[ref]
 generic={key:publish(ref,MAX_JINGLE) for key,ref in GENERIC.items()}
 table=skill_sounds(decode_table(client/'Scryde'/'skillsoundgrp.dat'));skills={}
 for sid,refs in sorted(table.items()):
  if used is not None and sid not in used:continue
  row=[publish(ref) if ref else None for ref in refs]
  if any(row):skills[sid]=row
 towns={}
 for town,name in TOWNS.items():
  transcode_music(client/'music'/(name+'.ogg'),music_dir/(town+'.mp3'));towns[town]=town+'.mp3'
 header='// Generated by scripts/l2j/build-l2-audio.py from the client sound tables; do not edit.\n'
 text=(header+"export const SFX_DIR = '/audio/sfx/';\nexport const MUSIC_DIR = '/audio/music/';\n"
  +'export const L2_SFX = Object.freeze('+json.dumps({k:v for k,v in generic.items() if v},indent=1)+');\n'
  +'// skill id -> [cast, shot, explosion] files (null when the client has none)\n'
  +'export const L2_SKILL_SOUNDS = Object.freeze('+json.dumps(skills,separators=(',',':'))+');\n'
  +'export const L2_TOWN_MUSIC = Object.freeze('+json.dumps(towns,indent=1)+');\n')
 (OUT/'l2-audio.js').write_text(text,encoding='utf8')
 size=sum(p.stat().st_size for p in OUT.rglob('*.mp3'))
 print('skills',len(skills),'sfx files',sum(1 for v in files.values() if v),'skipped',sum(1 for v in files.values() if not v),'MB',round(size/1e6,1))
