import json
from pathlib import Path
from PIL import Image,ImageOps
root=Path(__file__).resolve().parents[4]
base=Path(__file__).resolve().parent
jobs=json.loads((base/'accepted.json').read_text())
keys=[j['key'] for j in jobs]
for category,widths in [('races',(256,512,1024)),('portraits',(128,256,512))]:
 directory=root/'art-source/avatars'/category
 progressPath=directory/'progress.json'
 progress=json.loads(progressPath.read_text(encoding='utf-8-sig'))
 progress['files']=[x for x in progress['files'] if x['key'] not in keys]
 for key in keys:
  for w in widths:
   path=Path(f'webapp/art/avatars/{category}/v2/{key}-{w}.webp')
   with Image.open(root/path) as im:
    assert im.getchannel('A').getextrema()[0]==0
    assert im.width==w
   progress['files'].append({'key':key,'width':w,'path':path.as_posix(),'bytes':(root/path).stat().st_size})
 progress['latestRevision']={'keys':keys,'version':'v2','date':'2026-10-13','validation':'pending'}
 progressPath.write_text(json.dumps(progress,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 with (directory/'STATUS.md').open('a',encoding='utf-8') as f:
  f.write('\n## Elf and dark elf reference revision v2 — 2026-10-13\nFour body paintings and four matching portraits generated with built-in imagegen. Archived official race/client artwork used for anatomy: pale/slender light elves; taller lean blue-gray dark elves with silver hair and angular mature features. Existing custom costume identities retained. This is an artistic adaptation, not original client armor/mesh. Backups, exact prompts, reference images and preview in ../revisions/elf-reference-v2/. Mobile WebP widths unchanged; other eight race/gender identities unaffected. No Desktop references consumed or moved.\n')
asset=root/'webapp/art/avatar-art.js'
text=asset.read_text(encoding='utf-8')
for key in keys:
 old=f'"artPath": "/art/avatars/races/v1/{key}"'
 new=f'"artPath": "/art/avatars/races/v2/{key}",\n    "portraitPath": "/art/avatars/portraits/v2/{key}"'
 assert old in text
 text=text.replace(old,new)
asset.write_text(text,encoding='utf-8')
sheet=Image.new('RGB',(960,700),'#17212d')
for i,key in enumerate(keys):
 for row,color in enumerate(['#17212d','#f4eee2']):
  x=i*240;y=row*350
  tile=Image.new('RGBA',(240,350),color)
  for w,px,py in [(192,24,12),(96,18,222),(48,152,252)]:
   with Image.open(root/f'webapp/art/avatars/portraits/v2/{key}-256.webp') as im:
    im=ImageOps.contain(im.convert('RGBA'),(w,w))
    tile.alpha_composite(im,(px,py))
  sheet.paste(tile.convert('RGB'),(x,y))
sheet.save(base/'portrait-review.jpg',quality=90)
(base/'STATUS.md').write_text('# Elf/dark elf revision v2\n\nEight reviewed paintings; previous body/portrait masters retained as prior-* files. Generated with built-in imagegen. Exact prompts and output paths in accepted.json; official archived source pages recorded in docs/imagegen-prompts.md §17d. Alpha, silhouette, no text/spiders and thumbnail review accepted. Mobile integration checks pending.\n',encoding='utf-8')
