"""Render generated world assets on dark/light backgrounds for visual review."""
from pathlib import Path
from PIL import Image, ImageDraw
import json
import sys

ROOT = Path(__file__).resolve().parents[2]
records = []
category = sys.argv[1] if len(sys.argv) > 1 else 'builds'
sources = sorted((ROOT / 'art-source' / category).rglob('*.png'))
if category == 'chests':
    sources = [source for source in sources if source.stem not in ('closed', 'open')]
gallery = Image.new('RGB', (900, max(1, len(sources)) * 210), '#0b0d18')
draw = ImageDraw.Draw(gallery)
for row, source in enumerate(sources):
    image = Image.open(source).convert('RGBA')
    alpha = image.getchannel('A')
    opaque = alpha.getextrema()[0] == 255
    bbox = alpha.getbbox()
    name = source.relative_to(ROOT / 'art-source').with_suffix('').as_posix()
    draw.text((12, row * 210 + 5), name, fill='#d8b36a')
    for col, background in enumerate(('#131a29', '#b3a998')):
        card = Image.new('RGBA', (190, 180), background)
        reduced = image.copy()
        reduced.thumbnail((175, 175), Image.Resampling.LANCZOS)
        card.alpha_composite(reduced, ((190 - reduced.width) // 2, (180 - reduced.height) // 2))
        gallery.paste(card.convert('RGB'), (col * 205 + 12, row * 210 + 25))
    thumb = image.copy()
    thumb.thumbnail((96, 96), Image.Resampling.LANCZOS)
    card = Image.new('RGBA', (110, 110), '#131a29')
    card.alpha_composite(thumb, ((110 - thumb.width) // 2, (110 - thumb.height) // 2))
    gallery.paste(card.convert('RGB'), (450, row * 210 + 45))
    record = {'key': name, 'size': image.size, 'transparent': not opaque, 'bounds': bbox}
    records.append(record)
    draw.text((580, row * 210 + 45), f'Alpha: {not opaque}\nSize: {image.size}\nBounds: {bbox}', fill='#eee4cf')
label = 'buildings' if category == 'builds' else category
path = ROOT / f'docs/world-{label}-review.webp'
gallery.save(path, quality=85, method=6)
for offset in range(0, len(sources), 7):
    page = gallery.crop((0, offset * 210, 900, min(len(sources), offset + 7) * 210))
    page.save(ROOT / f'docs/world-{label}-review-{offset // 7 + 1}.webp', quality=85, method=6)
print(json.dumps(records))
