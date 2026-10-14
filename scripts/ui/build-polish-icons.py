"""Build reviewed transparent UI polish paintings, preserving alpha."""
import json
from pathlib import Path
from PIL import Image,ImageOps
root=Path(__file__).resolve().parents[2]
jobs=json.loads((root/'art-source/polish/icons/jobs.json').read_text(encoding='utf-8-sig'))
reviewed=json.loads((root/'art-source/polish/icons/reviewed.json').read_text(encoding='utf-8-sig'))
out=root/'webapp/art/polish/v1'
out.mkdir(parents=True,exist_ok=True)
for job in jobs:
    if job['key'] not in reviewed: continue
    with Image.open(root/job['source']) as original:
        im=original.convert('RGBA')
        if im.getextrema()[3][0]!=0: raise ValueError('No transparent pixels: '+job['key'])
        for size in (128,256):
            scaled=ImageOps.contain(im,(size-12,size-12),Image.Resampling.LANCZOS)
            canvas=Image.new('RGBA',(size,size))
            canvas.alpha_composite(scaled,((size-scaled.width)//2,(size-scaled.height)//2))
            canvas.save(out/f"{job['key']}-{size}.webp",'WEBP',quality=84,method=6)
print('Built',len(reviewed),'reviewed paintings in 128/256px')
