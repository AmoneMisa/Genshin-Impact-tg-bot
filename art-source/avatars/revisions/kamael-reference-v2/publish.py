import json
from pathlib import Path
from PIL import Image,ImageOps
root=Path(__file__).resolve().parents[4];base=Path(__file__).resolve().parent
keys=['kamael-male','kamael-female']
for cat,widths in [('races',(256,512,1024)),('portraits',(128,256,512))]:
 directory=root/'art-source/avatars'/cat;p=directory/'progress.json'
 data=json.loads(p.read_text(encoding='utf-8-sig'))
 data['files']=[x for x in data['files'] if x['key'] not in keys]
 for key in keys:
  for w in widths:
   path=Path(f'webapp/art/avatars/{cat}/v2/{key}-{w}.webp')
   with Image.open(root/path) as im:
    assert im.getchannel('A').getextrema()[0]==0
   data['files'].append({'key':key,'width':w,'path':path.as_posix(),'bytes':(root/path).stat().st_size})
 data['latestRevision']={'keys':keys,'version':'v2','date':'2026-10-13','validation':'pending'}
 p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 with (directory/'STATUS.md').open('a',encoding='utf-8') as f:
  f.write('\n## Kamael reference v2 — 2026-10-13\nBoth full bodies and portraits updated from five user references. Pointed ears, angular faces, lean build, natural single ivory/pink feather wing on anatomical left; female high ponytail and swept fringe requested subsequently. Custom costume themes retained. Prior sources preserved under ../revisions/kamael-reference-v2/. Exact prompts/outputs in accepted.json. Temp screenshots copied, never moved; no Desktop references consumed. Built-in imagegen only; mobile WebP widths unchanged.\n')
p=root/'webapp/art/avatar-art.js';text=p.read_text(encoding='utf-8')
for key in keys:
 old=f'"artPath": "/art/avatars/races/v1/{key}"'
 assert old in text
 text=text.replace(old,f'"artPath": "/art/avatars/races/v2/{key}",\n    "portraitPath": "/art/avatars/portraits/v2/{key}"')
p.write_text(text,encoding='utf-8')
sheet=Image.new('RGB',(480,700),'#17212d')
for i,key in enumerate(keys):
 for row,color in enumerate(['#17212d','#f4eee2']):
  tile=Image.new('RGBA',(240,350),color)
  for w,x,y in [(192,24,12),(96,18,222),(48,152,252)]:
   with Image.open(root/f'webapp/art/avatars/portraits/v2/{key}-256.webp') as im:
    tile.alpha_composite(ImageOps.contain(im.convert('RGBA'),(w,w)),(x,y))
  sheet.paste(tile.convert('RGB'),(i*240,row*350))
sheet.save(base/'portrait-review.jpg',quality=90)
(base/'STATUS.md').write_text('# Kamael reference revision v2\nBoth outfits and matching portraits reviewed; female high ponytail included. Clean alpha, full body/wing silhouettes, light/dark thumbnail review. Five copied user references; Temp originals untouched. Exact generation/edit prompts in accepted.json and docs/imagegen-prompts.md §17e. Integration verification pending.\n',encoding='utf-8')
