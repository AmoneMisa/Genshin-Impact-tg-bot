import json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[2]
jobs=json.loads((root/'art-source/arcade/jobs.json').read_text(encoding='utf-8-sig'))
for job in jobs:
    with Image.open(root/job['source']) as im:
        im=im.convert('RGBA' if job.get('transparent') else 'RGB')
        if job.get('transparent') and im.getextrema()[3][0]==255: raise ValueError('Missing alpha: '+job['key'])
        for width in ([128,256] if job.get('transparent') else [480,960]):
            output=root/f"webapp/art/arcade/v1/{job['key']}-{width}.webp"
            output.parent.mkdir(parents=True,exist_ok=True)
            im.resize((width,round(im.height*width/im.width)),Image.Resampling.LANCZOS).save(output,'WEBP',quality=84,method=6)
print('Built',len(jobs),'reviewed arcade paintings')
