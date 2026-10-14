"""Delivery resizing only; the portrait framing is made by built-in imagegen."""
import json
import argparse
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--keys', nargs='*')
parser.add_argument('--output', default='webapp/art/avatars/portraits/v1')
args = parser.parse_args()
directory = root / 'art-source/avatars/portraits'
jobs = json.loads((directory / 'jobs.json').read_text(encoding='utf-8-sig'))
reviewed = json.loads((directory / 'reviewed.json').read_text(encoding='utf-8-sig'))
output = root / args.output
output.mkdir(parents=True, exist_ok=True)
for job in jobs:
    if job['key'] not in reviewed or (args.keys and job['key'] not in args.keys):
        continue
    with Image.open(root / job['source']) as source:
        image = source.convert('RGBA')
        if image.getchannel('A').getextrema()[0] != 0:
            raise ValueError('Missing alpha: ' + job['key'])
        for width in (128, 256, 512):
            scaled = ImageOps.contain(image, (width, width), Image.Resampling.LANCZOS)
            canvas = Image.new('RGBA', (width, width))
            canvas.alpha_composite(scaled, ((width-scaled.width)//2, (width-scaled.height)//2))
            file = output / f"{job['key']}-{width}.webp"
            temporary = file.with_suffix('.tmp.webp')
            for quality in (82, 76, 70, 64, 58, 52, 46):
                canvas.save(temporary, 'WEBP', quality=quality, method=6)
                if temporary.stat().st_size <= width * 160:
                    break
            if temporary.stat().st_size > width * 160:
                raise ValueError('Portrait delivery budget exceeded: ' + str(file))
            temporary.replace(file)
print('Built', len(reviewed), 'reviewed portraits at 128/256/512px')
