"""Publish reviewed merchant banners and their independent high resolution originals."""
from pathlib import Path
from PIL import Image
source=Path('art-source/l2-redraw/merchants')
dest=Path('webapp/art/merchants');dest.mkdir(parents=True,exist_ok=True)
for name in ['weapons','armor','jewelry','alchemist','mammon']:
    with Image.open(source/f'{name}.png') as image:
        for width in [480,720]:image.resize((width,width*2//3),Image.Resampling.LANCZOS).save(dest/f'{name}-{width}.webp',quality=88,method=6)
print('Published five merchant banners in both mobile sizes.')
with Image.open('art-source/l2-redraw/party-emblem.png') as image:
    for size in [128,256]:image.resize((size,size),Image.Resampling.LANCZOS).save(Path('webapp/art/icons')/f'party-emblem-{size}.webp',quality=92,method=6)
