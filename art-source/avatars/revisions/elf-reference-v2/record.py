import json,shutil
from pathlib import Path
from PIL import Image,ImageOps
root=Path(__file__).resolve().parents[4]
base=Path(__file__).resolve().parent
jobs=json.loads((base/'accepted.json').read_text())
for category,kind in [('races','body'),('portraits','portrait')]:
 directory=root/'art-source/avatars'/category
 current=json.loads((directory/'jobs.json').read_text(encoding='utf-8-sig'))
 for j in jobs:
  k=j['key']; entry=next(x for x in current if x['key']==k)
  entry.setdefault('history',[]).append({x:v for x,v in entry.items() if x!='history'})
  generated=j['generatedPath'] if kind=='body' else j['portraitGeneratedPath']
  source=f'art-source/avatars/{category}/{k}.png'
  shutil.copyfile(generated,root/source)
  entry.update(source=source,generatedPath=generated,revision='v2',prompt=j['prompt'] if kind=='body' else j['portraitPrompt'],references=j['references'] if kind=='body' else [f'art-source/avatars/races/{k}.png'],review='Reviewed: complete body silhouette / matching portrait, classic racial face/skin/build cues, no text or spiders. Custom costume themes preserved; anatomy guided by archived official artwork.')
 (directory/'jobs.json').write_text(json.dumps(current,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
canvas=Image.new('RGB',(1200,720),'#17212d')
for i,j in enumerate(jobs):
 with Image.open(root/f"art-source/avatars/races/{j['key']}.png") as im:
  assert im.getchannel('A').getextrema()[0]==0
  im=ImageOps.contain(im.convert('RGBA'),(290,670))
  canvas.paste(im,(i*300+(300-im.width)//2,(720-im.height)//2),im)
canvas.save(base/'preview.jpg',quality=90)
with (root/'docs/imagegen-prompts.md').open('a',encoding='utf-8') as f:
 f.write('\n### 17d. Classic elf and dark elf revision v2\nAnatomy references: https://legacy-lineage2.com/Knowledge/race_elf.html and https://legacy-lineage2.com/Knowledge/race_darkelf.html (archive official artwork, not a claim of exact High Five mesh reproduction). Images saved under art-source/avatars/revisions/elf-reference-v2/references/. Custom clothing maintained. Built-in imagegen only, one call per asset.\n')
 for j in jobs:
  for kind in ['body','portrait']:
   f.write('\n**'+j['key']+' '+kind+'**\n\n'+j['prompt' if kind=='body' else 'portraitPrompt']+'\n')
