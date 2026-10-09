from pathlib import Path
from PIL import Image, ImageDraw
import json
root=Path.cwd()
jobs=json.loads((root/'art-source/hunt-ui/jobs.json').read_text())
icons=[j for j in jobs if j['group']=='icon' and (root/j['source']).exists()]
for start in range(0,len(icons),10):
 rows=icons[start:start+10]; sheet=Image.new('RGB',(620,len(rows)*130),'#101522'); draw=ImageDraw.Draw(sheet)
 for row,j in enumerate(rows):
  im=Image.open(root/j['source']).convert('RGBA')
  if im.getchannel('A').getextrema()[0]==255:raise ValueError(j['key']+' missing alpha')
  draw.text((8,row*130+3),j['key'],fill='#e3c789')
  for x,size,bg in [(8,96,'#151c2c'),(125,96,'#c1b5a0'),(250,48,'#151c2c'),(320,22,'#151c2c')]:
   thumb=im.copy();thumb.thumbnail((size,size));tile=Image.new('RGBA',(size+8,size+8),bg);tile.alpha_composite(thumb,((tile.width-thumb.width)//2,(tile.height-thumb.height)//2));sheet.paste(tile.convert('RGB'),(x,row*130+22))
 sheet.save(root/f'docs/hunt-icons-review-{start//10+1}.webp',quality=86)
print('Reviewed sheets:',len(icons))
