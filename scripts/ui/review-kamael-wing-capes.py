"""Show source edits in canonical portrait coordinates for manual cape/eye review."""
import json,argparse
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
ROOT=Path(__file__).resolve().parents[2]
FOLDER=ROOT/'art-source/avatars/kamael-capes'
jobs=json.loads((FOLDER/'jobs.json').read_text(encoding='utf-8'))
eyes=json.loads((ROOT/'art-source/avatars/motion-review/calibrated-eyes.json').read_text(encoding='utf-8'))
poses=json.loads((ROOT/'art-source/avatars/motion-review/pose-motion.json').read_text(encoding='utf-8'))
ready=[j for j in jobs if j['status']!='pending']
p=argparse.ArgumentParser();p.add_argument('--unreviewed',action='store_true');a=p.parse_args()
if a.unreviewed and (FOLDER/'motion.json').exists():
    measured=json.loads((FOLDER/'motion.json').read_text(encoding='utf-8'))
    ready=[j for j in ready if j['key'] not in measured]
prefix='todo-' if a.unreviewed else ''
def portrait(file):
    im=Image.open(ROOT/file).convert('RGBA')
    scaled=ImageOps.contain(im,(460,691),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(512,768));canvas.alpha_composite(scaled,((512-scaled.width)//2,(768-scaled.height)//2))
    return canvas
for start in range(0,len(ready),6):
    body=Image.new('RGB',(1536,432),(28,30,42));draw=ImageDraw.Draw(body)
    faces=Image.new('RGB',(1536,700),(28,30,42));fd=ImageDraw.Draw(faces)
    for n,j in enumerate(ready[start:start+6]):
        p=portrait(j['source']);small=p.resize((256,384));body.paste(small,(n*256,36),small)
        draw.text((n*256+3,3),j['key'].replace('-kamael-','\n'),fill='white')
        pose=poses['/art/avatars/collections/v1/'+j['key']]['poseReview']
        for group in ['shoulders','hands','feet']:
            for x,y in pose[group]:
                px=n*256+x*256;py=36+y*384
                draw.line((px-4,py,px+4,py),fill='#f07070');draw.line((px,py-4,px,py+4),fill='#f07070')
        # Every face stays in upper portrait, crop includes ears/hair and shoulders.
        crop=p.crop((140,55,396,205)).resize((512,300))
        faces.paste(crop,((n%3)*512,(n//3)*350+25),crop)
        fd.text(((n%3)*512,(n//3)*350+3),j['key']+' offset 140,55; scale 2',fill='white')
        for x in range(160,396,20):
            fd.text(((n%3)*512+(x-140)*2,(n//3)*350+325),str(x),fill='gray')
        for ex,ey in eyes[j['key']]:
            x=(n%3)*512+(ex*512-140)*2;y=(n//3)*350+25+(ey*768-55)*2
            fd.line((x-10,y,x-5,y),fill='red');fd.line((x+5,y,x+10,y),fill='red')
            fd.line((x,y-10,x,y-5),fill='red');fd.line((x,y+5,x,y+10),fill='red')
    body.save(FOLDER/f'{prefix}review-body-{start//6:02}.jpg')
    faces.save(FOLDER/f'{prefix}review-faces-{start//6:02}.png')
print(len(ready),'ready; sheets', (len(ready)+5)//6)
