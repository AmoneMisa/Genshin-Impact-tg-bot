"""Read UE2 texture packages from a local L2 client; never modifies the client.

UE2 package layout reference: gildor2/UEViewer, UnrealPackage/UnPackage2.cpp.
Only texture exports and their source pixels are published, without repainting.
"""
import struct,sys,json,hashlib
from pathlib import Path

class Reader:
 def __init__(self,data,pos=0):self.data=data;self.pos=pos
 def read(self,n):
  out=self.data[self.pos:self.pos+n];self.pos+=n
  if len(out)!=n:raise ValueError('Unexpected end of package')
  return out
 def u8(self):return self.read(1)[0]
 def i32(self):return struct.unpack('<i',self.read(4))[0]
 def compact(self):
  b=self.u8();negative=b&128;value=b&63;more=b&64;shift=6
  while more:
   b=self.u8();value|=(b&127)<<shift;shift+=7;more=b&128
  return -value if negative else value

def package(path):
 data=path.read_bytes()
 if data[:4]!=b'\xc1\x83\x2a\x9e':
  if data[:14].decode('utf-16le',errors='ignore') not in ('Gamekit','Lineage'):raise ValueError('Unknown package header')
  key=data[28]^0xc1;data=bytes(b^key for b in data[28:])
 if data[:4]!=b'\xc1\x83\x2a\x9e':raise ValueError('Unsupported package encoding')
 header=struct.unpack_from('<9I',data);_,version,flags,nc,no,ec,eo,ic,io=header
 r=Reader(data,no);names=[]
 for _ in range(nc):
  size=r.compact();name=r.read(abs(size)*(2 if size<0 else 1)).decode('utf-16le' if size<0 else 'latin1').rstrip('\0');r.read(4);names.append(name)
 r=Reader(data,io);imports=[]
 for _ in range(ic):imports.append((names[r.compact()],names[r.compact()],r.i32(),names[r.compact()]))
 r=Reader(data,eo);exports=[]
 for _ in range(ec):
  cls=r.compact();super_=r.compact();outer=r.i32();name=names[r.compact()];r.read(4);size=r.compact();offset=r.compact() if size else 0
  exports.append(dict(name=name,cls=cls,outer=outer,size=size,offset=offset))
 return data,names,imports,exports,version

def properties(data,names,export):
 r=Reader(data,export['offset']);out={}
 while True:
  name=names[r.compact()]
  if name=='None':break
  info=r.u8();kind=info&15;code=(info>>4)&7
  if kind==10:r.compact()
  size=[1,2,4,12,16][code] if code<5 else r.u8() if code==5 else struct.unpack('<H',r.read(2))[0] if code==6 else r.i32()
  if kind==3:out[name]=bool(info&128);continue
  if info&128:r.compact()
  value=r.read(size);out[name]=int.from_bytes(value,'little') if kind in (1,2) else value.hex()
 return out,r.pos

def extract_rgba(path,selected,destination):
 from PIL import Image
 data,names,imports,exports,version=package(path);destination.mkdir(parents=True,exist_ok=True);manifest=[]
 for export in exports:
  if export['name'] not in selected:continue
  props,start=properties(data,names,export)
  if props.get('Format')!=5:raise ValueError('Unsupported pixel format '+str(props))
  w,h=props['USize'],props['VSize'];end=export['offset']+export['size'];tail=data[end-10:end]
  if struct.unpack('<II',tail[:8])!=(w,h):raise ValueError('Expected one original mip with source dimensions')
  pixels=data[end-10-w*h*4:end-10]
  if len(pixels)!=w*h*4 or end-10-w*h*4<start:raise ValueError('Truncated source pixels')
  image=Image.frombytes('RGBA',(w,h),pixels,'raw','BGRA');name=export['name']+'.webp';image.save(destination/name,lossless=True)
  manifest.append(dict(package=path.name,texture=export['name'],width=w,height=h,file=name,sourceSHA256=hashlib.sha256(path.read_bytes()).hexdigest(),pixelSHA256=hashlib.sha256(image.tobytes()).hexdigest()))
 if len(manifest)!=len(selected):raise ValueError('Requested textures missing')
 (destination/'source.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
 return manifest

def extract_slots(destination):
 from PIL import Image
 source=destination/'Inventory_DF_EquipSlot.webp';slots=destination/'slots';slots.mkdir(exist_ok=True)
 # Native atlas coordinates. Each cell is 32x32; no scaling, drawing or recolouring.
 regions={name:(9,9+40*row) for row,name in enumerate(['head','up','down','hands','legs','cloak','shirt','belt','weapon'])}
 regions.update(earring=(163,89),necklace=(163,169),ring=(163,209),offhand=(163,329))
 manifest=[]
 with Image.open(source) as atlas:
  for name,(x,y) in regions.items():
   image=atlas.crop((x,y,x+32,y+32));image.save(slots/(name+'.webp'),lossless=True)
   manifest.append(dict(name=name,texture='Inventory_DF_EquipSlot',region=[x,y,32,32],pixelSHA256=hashlib.sha256(image.tobytes()).hexdigest()))
 (slots/'source.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')

if __name__=='__main__':
 if len(sys.argv)>2:
  destination=Path(sys.argv[2]);print(json.dumps(extract_rgba(Path(sys.argv[1]),sys.argv[3:],destination),indent=2))
  if 'Inventory_DF_EquipSlot' in sys.argv[3:]:extract_slots(destination)
  sys.exit(0)
 path=Path(sys.argv[1]);data,names,imports,exports,version=package(path)
 print('Version',version,'names',len(names),'exports',len(exports))
 selected=[e for e in exports if any(s in e['name'].lower() for s in ('inventory','slot','symbol','henna'))]
 print(json.dumps(selected,indent=2))
 Path('.tmp/l2ui-exports.json').write_text(json.dumps(exports,indent=2),encoding='utf8')
