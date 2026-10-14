import json,shutil
from pathlib import Path
from PIL import Image,ImageOps
root=Path(__file__).resolve().parents[4]; base=Path(__file__).resolve().parent
jobs=json.loads((base/'accepted.json').read_text())
for cat in ['races','portraits']:
 directory=root/'art-source/avatars'/cat
 current=json.loads((directory/'jobs.json').read_text(encoding='utf-8-sig'))
 for j in jobs:
  entry=next(x for x in current if x['key']==j['key'])
  entry.setdefault('history',[]).append({k:v for k,v in entry.items() if k!='history'})
  source=f"art-source/avatars/{cat}/{j['key']}.png"
  generated=j['generatedPath'] if cat=='races' else j['portraitGeneratedPath']
  shutil.copyfile(generated,root/source)
  entry.update(source=source,generatedPath=generated,prompt=j['prompt'] if cat=='races' else j['portraitPrompt'],revision='v2',references=j['references'] if cat=='races' else [f"art-source/avatars/races/{j['key']}.png"],review='Reviewed: sharper adult Kamael face, pointed ears, lean anatomy, one natural ivory feather wing; female high ponytail. Alpha, full body silhouette and identity accepted.')
  if cat=='races' and 'hairEditPrompt' in j: entry['hairEditPrompt']=j['hairEditPrompt']
 (directory/'jobs.json').write_text(json.dumps(current,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
canvas=Image.new('RGB',(720,650),'#17212d')
for i,j in enumerate(jobs):
 with Image.open(root/f"art-source/avatars/races/{j['key']}.png") as im:
  assert im.getchannel('A').getextrema()[0]==0
  im=ImageOps.contain(im.convert('RGBA'),(340,610))
  canvas.paste(im,(i*360+(360-im.width)//2,(650-im.height)//2),im)
canvas.save(base/'preview.jpg',quality=90)
with (root/'docs/imagegen-prompts.md').open('a',encoding='utf-8') as f:
 f.write('\n### 17e. Kamael reference revision v2 and high ponytail\nFive user supplied screenshot/illustration references copied under art-source/avatars/revisions/kamael-reference-v2/references/. Temp originals never moved. Anatomy and wing references only; custom outfit identities retained. Built-in imagegen, one call per asset/edit.\n')
 for j in jobs:
  for field in ['prompt','hairEditPrompt','portraitPrompt']:
   if field in j: f.write('\n**'+j['key']+' '+field+'**\n\n'+j[field]+'\n')
shutil.copyfile(base/'accepted.json',base/'jobs.json')
