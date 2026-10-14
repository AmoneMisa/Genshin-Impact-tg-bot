"""Publish original engraved symbol pixels, never the dye item icons."""
from pathlib import Path
import sys
from PIL import Image
source = Path(sys.argv[1])
destination = Path('webapp/art/henna')
destination.mkdir(exist_ok=True)
for stat in ('str', 'con', 'dex', 'int', 'wit', 'men'):
    for tier in ('00', '01'):
        key = f'icon.etc_{stat}_symbol_i{tier}'
        with Image.open(source / (key + '.png')) as image:
            image.convert('RGBA').save(destination / (key.replace('.', '-') + '.webp'), lossless=True)
