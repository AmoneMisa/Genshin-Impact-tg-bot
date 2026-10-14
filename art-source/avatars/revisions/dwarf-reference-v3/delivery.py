import json
from pathlib import Path
from PIL import Image,ImageOps
root=Path(__file__).resolve().parents[4]
base=root/'art-source/avatars/revisions/dwarf-reference-v3'
for cat,widths in [('races',(256,512,1024)),('portraits',(128,256,512))]:
 p=root/'art-source/avatars'/cat/'progress.json'
 data=json.loads(p.read_text(encoding='utf-8-sig'))
 data['files']=[x for x in data['files'] if x['key'] not in ['dwarf-male','dwarf-female']]
 for gender in ['female','male']:
  for w in widths:
   path=Path(f'webapp/art/avatars/{cat}/v3/dwarf-{gender}-{w}.webp')
   with Image.open(root/path) as im:
    assert im.getchannel('A').getextrema()[0]==0
   data['files'].append({'key':'dwarf-'+gender,'width':w,'path':path.as_posix(),'bytes':(root/path).stat().st_size})
 data['latestRevision']={'keys':['dwarf-female','dwarf-male'],'version':'v3','date':'2026-10-13','referenceFolder':base.relative_to(root).as_posix()}
 p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
canvas=Image.new('RGB',(720,650),'#17212d')
for i,gender in enumerate(['female','male']):
 with Image.open(root/f'webapp/art/avatars/races/v3/dwarf-{gender}-512.webp') as im:
  scaled=ImageOps.contain(im.convert('RGBA'),(330,610))
  canvas.paste(scaled,(i*360+(360-scaled.width)//2,(650-scaled.height)//2),scaled)
canvas.save(base/'pair-preview.jpg',quality=90)
