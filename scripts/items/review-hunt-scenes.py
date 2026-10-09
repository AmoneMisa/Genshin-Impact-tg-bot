from pathlib import Path
from PIL import Image,ImageDraw
import json
root=Path.cwd();jobs=json.loads((root/'art-source/hunt-ui/jobs.json').read_text())
for group in ['zone','mob']:
 rows=[j for j in jobs if j['group']==group and (root/j['source']).exists()]
 if not rows:continue
 sheet=Image.new('RGB',(600,((len(rows)+1)//2)*160),'#101522');draw=ImageDraw.Draw(sheet)
 for i,j in enumerate(rows):
  x=(i%2)*300;y=(i//2)*160;draw.text((x+5,y+3),j['key'],fill='#e3c789');im=Image.open(root/j['source']).convert('RGB');im.thumbnail((285,130));sheet.paste(im,(x+5+(285-im.width)//2,y+24))
 sheet.save(root/f'docs/hunt-{group}-review.webp',quality=86)
