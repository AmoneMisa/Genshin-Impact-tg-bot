"""Optimize generated location paintings and render QA contact sheets; never calls an image API."""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw

rows = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
out = Path('webapp/art/world/scenes')
out.mkdir(parents=True, exist_ok=True)
for row in ([] if '--metadata-only' in sys.argv else rows):
    with Image.open(row['path']) as source:
        image = source.convert('RGB')
        image.resize((1536, 1024), Image.Resampling.LANCZOS).save(out / (row['asset'] + '-v1.webp'), quality=87, method=6)
        image.resize((768, 512), Image.Resampling.LANCZOS).save(out / (row['asset'] + '-mobile-v1.webp'), quality=80, method=6)
for category in ([] if '--metadata-only' in sys.argv else sorted({row['category'] for row in rows})):
    group = [row for row in rows if row['category'] == category]
    sheet = Image.new('RGB', (1200, ((len(group)+2)//3)*300), '#111018')
    draw = ImageDraw.Draw(sheet)
    for index, row in enumerate(group):
        with Image.open(out / (row['asset'] + '-mobile-v1.webp')) as image:
            tile = image.resize((392, 261), Image.Resampling.LANCZOS)
            x, y = (index%3)*400, (index//3)*300
            sheet.paste(tile, (x+4, y+4))
            draw.text((x+8,y+270), row['asset'], fill='#ead7a6')
    sheet.save(Path('docs') / ('scene-expansion-' + category + '.jpg'), quality=90)
print('Prepared', len(rows), 'desktop/mobile scenes and grouped contact sheets')
metadata = [{**{key:value for key,value in row.items() if key != 'path'},
             'source':Path(row['path']).name,
             'desktop':row['asset']+'-v1.webp',
             'mobile':row['asset']+'-mobile-v1.webp',
             'generator':'OpenAI imagegen, built-in tool',
             'created':'2026-10-16',
             'notOriginalL2ClientArt':True,
             'notOriginalGeodata':True} for row in rows]
(out/'expansion.source.js').write_text('// Artistic adaptations; no invented transport coordinates.\nexport const SCENE_EXPANSION = '+json.dumps(metadata,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
