"""Magnified pixel-coordinate face sheets and full-body sheets for manual QA."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
ROOT=Path(__file__).resolve().parents[2]
FOLDER=ROOT/'art-source/avatars/motion-review'
reviews=json.loads((FOLDER/'additional-pose-reviews.json').read_text(encoding='utf-8'))
jobs=json.loads((ROOT/'art-source/avatars/collections/jobs.json').read_text(encoding='utf-8'))
for theme in dict.fromkeys(j['costumeId'] for j in jobs if j['key'] in reviews):
    group=[j for j in jobs if j['costumeId']==theme and j['key'] in reviews]
    faces=Image.new('RGB',(900,460),'#121926');d=ImageDraw.Draw(faces)
    bodies=Image.new('RGB',(1800,480),'#121926');bd=ImageDraw.Draw(bodies)
    for i,j in enumerate(group):
        file=ROOT/f"webapp/art/avatars/collections/v1/{j['key']}-512.webp"
        if file.exists():im=Image.open(file).convert('RGBA')
        else:
            source=Image.open(ROOT/j['source']).convert('RGBA')
            scaled=ImageOps.contain(source,(460,691),Image.Resampling.LANCZOS)
            im=Image.new('RGBA',(512,768));im.alpha_composite(scaled,((512-scaled.width)//2,(768-scaled.height)//2))
        bodies.paste(im.resize((300,450)),(i*300,30),im.resize((300,450)))
        bd.text((i*300+3,4),j['race']+' '+theme,fill='white')
        x,y=reviews[j['key']]['faceHint'];left,top=round(x*5.12)-65,round(y*7.68)-45
        crop=im.crop((left,top,left+130,top+90)).resize((260,180))
        px,py=(i%3)*300,(i//3)*230
        faces.paste(crop,(px+30,py+30),crop)
        d.text((px+5,py+3),j['race']+f' offset {left},{top} x2',fill='white')
        for xx in range((left//10+1)*10,left+130,10):
            sx=px+30+(xx-left)*2;d.text((sx-7,py+18),str(xx),fill='#91a8bd')
            d.line((sx,py+30,sx,py+210),fill='#334151',width=1)
        for yy in range((top//10+1)*10,top+90,10):
            sy=py+30+(yy-top)*2;d.text((px,sy-4),str(yy),fill='#91a8bd')
            d.line((px+30,sy,px+290,sy),fill='#334151',width=1)
    faces.save(FOLDER/f'new-faces-{theme}.png');bodies.save(FOLDER/f'new-body-{theme}.jpg',quality=95)
print('Prepared magnified face coordinates and body sheets for',len(reviews),'paintings')
