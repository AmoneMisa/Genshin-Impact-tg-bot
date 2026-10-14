import json
import argparse
from pathlib import Path
from PIL import Image, ImageOps
root=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser()
parser.add_argument('--keys',nargs='*')
parser.add_argument('--trim-transparent-padding',action='store_true')
parser.add_argument('--source',default='art-source/avatars/jobs.json')
parser.add_argument('--reviewed',default='art-source/avatars/reviewed.json')
parser.add_argument('--output',default='webapp/art/avatars/v1')
args=parser.parse_args()
jobs=json.loads((root/args.source).read_text(encoding='utf-8-sig'))
reviewed=json.loads((root/args.reviewed).read_text(encoding='utf-8-sig'))
out=root/args.output
out.mkdir(parents=True,exist_ok=True)
for job in jobs:
    if job['key'] not in reviewed or (args.keys and job['key'] not in args.keys): continue
    with Image.open(root/job['source']) as source:
        im=source.convert('RGBA')
        if im.getchannel('A').getextrema()[0]!=0: raise ValueError('Missing alpha: '+job['key'])
        if args.trim_transparent_padding:
            bounds=im.getchannel('A').getbbox()
            if not bounds: raise ValueError('Empty avatar: '+job['key'])
            im=im.crop(bounds)
        for width in (256,512,1024):
            height=width*3//2
            scaled=ImageOps.contain(im,(int(width*.9),int(height*.9)),Image.Resampling.LANCZOS)
            canvas=Image.new('RGBA',(width,height))
            canvas.alpha_composite(scaled,((width-scaled.width)//2,(height-scaled.height)//2))
            file=out/f"{job['key']}-{width}.webp"
            temporary=file.with_suffix('.tmp.webp')
            for quality in (82,76,70,64):
                canvas.save(temporary,'WEBP',quality=quality,method=6)
                if temporary.stat().st_size<=width*400: break
            if temporary.stat().st_size>width*400: raise ValueError('Avatar size budget exceeded: '+str(file))
            temporary.replace(file)
print('Built',len(reviewed),'avatars, three responsive widths; preserved alpha and silhouette padding')
