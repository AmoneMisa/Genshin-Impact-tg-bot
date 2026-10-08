from pathlib import Path
from PIL import Image,ImageDraw
import json
root=Path(__file__).resolve().parents[2]
jobs=json.loads((root/'art-source/epic-collection/jobs.json').read_text())
rows=[j for j in jobs if (root/'art-source/items/epic-collection'/f"{j['key']}.png").exists()]
for page in range(0,len(rows),8):
 batch=rows[page:page+8];sheet=Image.new('RGB',(700,len(batch)*185),'#101522');draw=ImageDraw.Draw(sheet)
 for n,j in enumerate(batch):
  im=Image.open(root/'art-source/items/epic-collection'/f"{j['key']}.png").convert('RGBA')
  if im.getchannel('A').getextrema()[0]==255:raise ValueError(j['key']+': missing alpha')
  draw.text((8,n*185+4),j['key'],fill='#e3c789')
  for x,size,bg in [(8,150,'#151c2c'),(180,150,'#c1b5a0'),(365,96,'#151c2c'),(500,48,'#151c2c')]:
   thumb=im.copy();thumb.thumbnail((size,size));tile=Image.new('RGBA',(size+8,size+8),bg);tile.alpha_composite(thumb,((tile.width-thumb.width)//2,(tile.height-thumb.height)//2));sheet.paste(tile.convert('RGB'),(x,n*185+25))
 sheet.save(root/f'docs/epic-collection-review-{page//8+1}.webp',quality=85)
print(len(rows))
