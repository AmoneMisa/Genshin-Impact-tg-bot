from pathlib import Path
from PIL import Image,ImageDraw
import json
root=Path(__file__).resolve().parents[2]
rows=[json.loads(p.read_text(encoding='utf-8')) for p in sorted((root/'.tmp/world-art-receipts').glob('*.json'))]
target=root/'webapp/art/world/scenes'
for row in rows:
 with Image.open(row['path']) as im:
  for compact,size,quality,limit in [(False,(1536,1024),87,800000),(True,(768,512),80,180000)]:
   p=target/(row['asset']+('-mobile' if compact else '')+'-v1.webp')
   if not p.exists():im.convert('RGB').resize(size,Image.Resampling.LANCZOS).save(p,quality=quality,method=6)
   assert p.stat().st_size<limit,p
(target/'missing-world.source.js').write_text('export const MISSING_WORLD_ART='+json.dumps([{**{k:v for k,v in r.items() if k!='path'},'source':Path(r['path']).name} for r in rows],ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
for page in range((len(rows)+7)//8):
 sheet=Image.new('RGB',(1200,1200),'#16191c');draw=ImageDraw.Draw(sheet)
 for i,row in enumerate(rows[page*8:page*8+8]):
  with Image.open(target/(row['asset']+'-mobile-v1.webp')) as im:sheet.paste(im.resize((588,260)),(i%2*600+4,i//2*300+4))
  draw.text((i%2*600+8,i//2*300+272),row['asset'],fill='#eddfb0')
 sheet.save(root/f'docs/missing-world-art-{page+1}.jpg',quality=90)
print('Encoded',len(rows),'new scene paintings and mobile variants')
