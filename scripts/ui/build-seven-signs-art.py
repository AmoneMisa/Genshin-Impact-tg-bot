"""Encode one reviewed imagegen location manifest; no image API calls."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw

rows = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
target = Path('webapp/art/world/scenes')
for row in rows:
    for compact, size, quality, budget in [(False, (1536, 1024), 87, 800000), (True, (768, 512), 80, 180000)]:
        file = target / (row['asset'] + ('-mobile' if compact else '') + '-v1.webp')
        if file.exists():
            raise FileExistsError(file)
        with Image.open(row['path']) as source:
            image = source.convert('RGB').resize(size, Image.Resampling.LANCZOS)
            image.save(file, quality=quality, method=6)
        assert file.stat().st_size < budget, file
metadata = [{**{k: v for k, v in row.items() if k != 'path'},
             'source': Path(row['path']).name,
             'generator': 'OpenAI imagegen, built-in tool', 'created': '2026-10-18',
             'notOriginalL2ClientArt': True, 'notOriginalGeodata': True} for row in rows]
id = rows[0]['id']
(target / (id + '.source.js')).write_text('export const LOCATION_ART = ' + json.dumps(metadata, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
sheet = Image.new('RGB', (400 * len(rows), 292), '#15171c')
draw = ImageDraw.Draw(sheet)
for index, row in enumerate(rows):
    with Image.open(target / (row['asset'] + '-mobile-v1.webp')) as source:
        sheet.paste(source.resize((392, 261)), (index * 400 + 4, 4))
    draw.text((index * 400 + 8, 272), row['asset'], fill='#e2d5b0')
sheet.save('docs/' + id + '.jpg', quality=90)
print('Encoded', id, 'with', len(rows), 'sections')
