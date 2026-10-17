"""Read sound packages (.uax) of a local L2 client; never modifies the client.

`list <Sounds dir>` prints every sound as package/group/name/bytes; `extract <package.uax> <out dir> [name ...]`
writes the embedded RIFF/WAV data of the named sounds (all of them when no names are given).
Reuses the package reader of extract-l2ui.py.
"""
import sys,json,struct,importlib.util
from pathlib import Path

spec=importlib.util.spec_from_file_location('l2ui',Path(__file__).with_name('extract-l2ui.py'));l2ui=importlib.util.module_from_spec(spec);spec.loader.exec_module(l2ui)

def sounds(path):
 data,names,imports,exports,version=l2ui.package(path);out=[]
 sound=next((-(i+1) for i,x in enumerate(imports) if x[3]=='Sound'),None)  # the imported Sound class, whose index differs per package
 for e in exports:
  if e['cls']!=sound or not e['size']:continue
  blob=data[e['offset']:e['offset']+e['size']];at=blob.find(b'RIFF')
  if at<0:continue
  length=struct.unpack_from('<I',blob,at+4)[0]+8
  out.append((e['name'],blob[at:at+length]))
 return out

def fmt(wav):
 at=wav.find(b'fmt ')
 if at<0:return 0,0,0,0
 tag,channels,rate,_,_,bits=struct.unpack_from('<HHIIHH',wav,at+8);return tag,channels,rate,bits

if __name__=='__main__':
 cmd=sys.argv[1]
 if cmd=='list':
  for p in sorted(Path(sys.argv[2]).glob('*.uax')):
   try:
    for name,wav in sounds(p):print(p.stem,name,len(wav),*fmt(wav),sep='\t')
   except Exception as error:print(p.stem,'ERROR',error,file=sys.stderr)
 elif cmd=='extract':
  out=Path(sys.argv[3]);out.mkdir(parents=True,exist_ok=True);want=set(sys.argv[4:])
  for name,wav in sounds(Path(sys.argv[2])):
   if not want or name in want:(out/(name+'.wav')).write_bytes(wav);print(name,len(wav),fmt(wav))
