"""Publish original client action icons without redrawing their pixels."""
from pathlib import Path
from PIL import Image

dest=Path('webapp/art/l2-extra')
for action in ('003','006'):
    source=Path('C:/Users/kubai/Desktop/icons')/f'icon.action{action}.png'
    with Image.open(source) as image:
        for size in (32,64):
            image.convert('RGBA').resize((size,size),Image.Resampling.NEAREST).save(dest/f'icon-action{action}-{size}.webp',lossless=True)
