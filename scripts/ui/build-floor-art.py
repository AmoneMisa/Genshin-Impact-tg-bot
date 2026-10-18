"""Encode reviewed floor paintings; no image API calls."""
from pathlib import Path
from PIL import Image, ImageDraw
import json
rows=[json.loads(p.read_text(encoding='utf-8')) for p in sorted(Path('.tmp/floor-art').glob('*.json'))]
target=Path('webapp/art/world/scenes')
for row in rows:
 with Image.open(row['path']) as source:
  for compact,size,quality,budget in [(False,(1536,1024),87,800000),(True,(768,512),80,180000)]:
   file=target/(row['asset']+('-mobile' if compact else '')+'-v1.webp')
   if not file.exists():source.convert('RGB').resize(size,Image.Resampling.LANCZOS).save(file,quality=quality,method=6)
   assert file.stat().st_size<budget,file
meta=[{**{k:v for k,v in row.items() if k!='path'},'source':Path(row['path']).name,'generator':'OpenAI imagegen, built-in tool','created':'2026-10-18','notOriginalL2ClientArt':True,'notOriginalGeodata':True} for row in rows]
(target/'floors.source.js').write_text('export const FLOOR_ART = '+json.dumps(meta,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
for page in range((len(rows)+7)//8):
 batch=rows[page*8:page*8+8];sheet=Image.new('RGB',(1200,1200),'#15171c');draw=ImageDraw.Draw(sheet)
 for i,row in enumerate(batch):
  with Image.open(target/(row['asset']+'-mobile-v1.webp')) as im:sheet.paste(im.resize((588,260)),((i%2)*600+4,(i//2)*300+4))
  draw.text(((i%2)*600+8,(i//2)*300+272),row['asset'],fill='#eddfb0')
 sheet.save('docs/floor-art-'+str(page+1)+'.jpg',quality=90)
print('Encoded',len(rows),'floor paintings and mobile versions')
