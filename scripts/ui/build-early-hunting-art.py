"""Encode reviewed early hunting paintings; never calls an image API."""
import json
import sys
from datetime import date
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[2]
rows = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
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
(out / 'early-hunting.source.js').write_text(
    '// Environment adaptations, not original client textures or geodata.\nexport const EARLY_HUNTING_ART = '
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
sheet.save(root / 'docs/early-hunting-locations.jpg', quality=90)
print(f'Prepared {len(rows)} scenes with mobile variants and provenance')
