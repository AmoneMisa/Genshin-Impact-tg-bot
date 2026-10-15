"""Canonical body and magnified face sheets for the nine new costume briefs."""
import json
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'art-source/avatars/collections';OUT=ROOT/'art-source/avatars/motion-review'
jobs=json.loads((BASE/'jobs.json').read_text(encoding='utf-8-sig'))
ids=json.loads((BASE/'city-halloween-theme-ids.json').read_text(encoding='utf-8'))
review_file=OUT/'city-halloween-pose-reviews.json'
reviews=json.loads(review_file.read_text(encoding='utf-8')) if review_file.exists() else {}
for theme in ids:
    group=[job for job in jobs if job['costumeId']==theme]
    body=Image.new('RGB',(1800,480),'#121926');bd=ImageDraw.Draw(body)
    faces=Image.new('RGB',(1620,980),'#121926');fd=ImageDraw.Draw(faces)
    for n,job in enumerate(group):
        bd.text((n*300+4,4),job['race']+' '+theme,fill='white')
        if not (ROOT/job['source']).is_file():continue
        im=Image.open(ROOT/job['source']).convert('RGBA');im=ImageOps.contain(im,(460,691),Image.Resampling.LANCZOS)
        p=Image.new('RGBA',(512,768));p.alpha_composite(im,((512-im.width)//2,(768-im.height)//2))
        small=p.resize((300,450));body.paste(small,(n*300,30),small)
        x=n%3*540;y=n//3*490
        crop=p.crop((130,40,400,260)).resize((540,440));faces.paste(crop,(x,y+25),crop)
        fd.text((x+5,y+3),job['race']+' offset 130,40 x2',fill='white')
        for v in range(140,400,20):fd.text((x+(v-130)*2,y+468),str(v),fill='gray')
        for v in range(60,260,20):fd.text((x+2,y+25+(v-40)*2),str(v),fill='gray')
        for ex,ey in reviews.get(job['key'],{}).get('eyePixels',[]):
            px=x+(ex-130)*2;py=y+25+(ey-40)*2
            for line in [(px-9,py,px-4,py),(px+4,py,px+9,py),(px,py-9,px,py-4),(px,py+4,px,py+9)]:fd.line(line,fill='red')
    body.save(OUT/f'city-body-{theme}.jpg',quality=95)
    faces.save(OUT/f'city-faces-{theme}.png')
print('Updated nine canonical body and face review sheets')
