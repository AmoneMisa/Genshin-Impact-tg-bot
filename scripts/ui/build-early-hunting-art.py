"""Encode reviewed hunting paintings and series galleries; never calls an image API."""
import json
import argparse
import re
from datetime import date
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('manifest')
parser.add_argument('--name', default='early-hunting')
parser.add_argument('--gallery', default='early-hunting-locations.jpg')
args = parser.parse_args()
if not re.fullmatch(r'[a-z][a-z0-9]*(?:-[a-z0-9]+)*', args.name) or Path(args.gallery).name != args.gallery:
    parser.error('Use a simple series name and gallery filename')
rows = json.loads(Path(args.manifest).read_text(encoding='utf-8'))
out = root / 'webapp/art/world/scenes'
metadata = []
for row in rows:
    with Image.open(row['path']) as source:
        image = source.convert('RGB')
        if image.size != (1536, 1024):
            raise ValueError(f"Unexpected source aspect/size for {row['asset']}: {image.size}")
        for size, suffix, quality, budget in [((1536, 1024), '', 87, 800000), ((768, 512), '-mobile', 80, 180000)]:
            target = out / (row['asset'] + suffix + '-v1.webp')
            image.resize(size, Image.Resampling.LANCZOS).save(target, quality=quality, method=6)
            if target.stat().st_size >= budget:
                raise ValueError(f'Image exceeds budget: {target}')
    metadata.append({**{k: v for k, v in row.items() if k != 'path'},
                     'source': Path(row['path']).name,
                     'generator': 'OpenAI imagegen, built-in tool',
                     'created': date.today().isoformat(),
                     'notOriginalL2ClientArt': True, 'notOriginalGeodata': True})
(out / (args.name + '.source.js')).write_text(
    '// Environment adaptations, not original client textures or geodata.\nexport const ' + args.name.upper().replace('-', '_') + '_ART = '
    + json.dumps(metadata, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
ids = list(dict.fromkeys(r['id'] for r in rows))
sheet = Image.new('RGB', (1200, 300 * len(ids)), '#111018')
draw = ImageDraw.Draw(sheet)
for y, id in enumerate(ids):
    for row in (r for r in rows if r['id'] == id):
        x = row['section'] * 400
        with Image.open(out / (row['asset'] + '-mobile-v1.webp')) as image:
            sheet.paste(image.resize((392, 261), Image.Resampling.LANCZOS), (x + 4, y * 300 + 4))
        draw.text((x + 8, y * 300 + 274), row['asset'], fill='#ead7a6')
sheet.save(root / 'docs' / args.gallery, quality=90)
print(f'Prepared {len(rows)} scenes with mobile variants and provenance')
