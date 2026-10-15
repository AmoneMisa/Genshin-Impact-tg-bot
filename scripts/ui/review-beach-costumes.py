"""Canonical body and magnified face sheets for the two new beach paintings."""
import json
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'art-source/avatars/collections'
FOLDER=ROOT/'art-source/avatars/motion-review'
jobs=json.loads((BASE/'jobs.json').read_text(encoding='utf-8'))
reviews=json.loads((FOLDER/'beach-pose-reviews.json').read_text(encoding='utf-8'))
for theme in ['coral-bay-breeze','high-tide-rider']:
 group=[j for j in jobs if j['costumeId']==theme]
 body=Image.new('RGB',(1800,480),'#121926');bd=ImageDraw.Draw(body)
 faces=Image.new('RGB',(1620,980),'#121926');fd=ImageDraw.Draw(faces)
 for n,j in enumerate(group):
  bd.text((n*300+4,4),j['race']+' '+theme,fill='white')
  if j['status']=='pending':continue
  source=Image.open(ROOT/j['source']).convert('RGBA')
  scaled=ImageOps.contain(source,(460,691),Image.Resampling.LANCZOS)
  p=Image.new('RGBA',(512,768));p.alpha_composite(scaled,((512-scaled.width)//2,(768-scaled.height)//2))
  small=p.resize((300,450));body.paste(small,(n*300,30),small)
  x=(n%3)*540;y=(n//3)*490
  crop=p.crop((130,40,400,260)).resize((540,440))
  faces.paste(crop,(x,y+25),crop);fd.text((x+5,y+3),j['race']+' offset 130,40 x2',fill='white')
  for value in range(140,400,20):fd.text((x+(value-130)*2,y+468),str(value),fill='gray')
  for value in range(60,260,20):fd.text((x+2,y+25+(value-40)*2),str(value),fill='gray')
  for ex,ey in reviews.get(j['key'],{}).get('eyePixels',[]):
   px=x+(ex-130)*2;py=y+25+(ey-40)*2
   fd.line((px-9,py,px-4,py),fill='red');fd.line((px+4,py,px+9,py),fill='red')
   fd.line((px,py-9,px,py-4),fill='red');fd.line((px,py+4,px,py+9),fill='red')
 body.save(FOLDER/f'beach-body-{theme}.jpg',quality=95)
 faces.save(FOLDER/f'beach-faces-{theme}.png')
print('Prepared beach body and face review sheets')
