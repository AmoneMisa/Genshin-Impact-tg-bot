"""Build reviewed optional menu paintings without altering existing artwork."""
import json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[2]
for job in json.loads((root/'art-source/polish/menu/jobs.json').read_text(encoding='utf-8-sig')):
    if job['key'] not in ('passives','luckShop','auction'): raise ValueError('Unknown menu key')
    with Image.open(root/job['source']) as source:
        source=source.convert('RGB')
        for size in (480,960):
            image=source.copy()
            image.thumbnail((size,size),Image.Resampling.LANCZOS)
            target=root/f"webapp/art/menu/{job['key']}-{size}.webp"
            image.save(target,'WEBP',quality=80,method=6)
            if size==480: image.save(root/job['output'],'WEBP',quality=80,method=6)
print('Built 3 reviewed menu paintings at 480/960px; default cards use 480px')

