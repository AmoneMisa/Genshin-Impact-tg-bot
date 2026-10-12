"""Publish lossless original L2 icons; pass the client PNG directory as an argument."""
import sys
from pathlib import Path
from PIL import Image

source = Path(sys.argv[1])
for key in ['etc_resonance_amulet_i00', 'etc_badge_gold_i00', 'etc_coins_gold_i00']:
    with Image.open(source / ('icon.' + key + '.png')) as original:
        for size in [128, 256, 512]:
            original.convert('RGBA').resize((size, size), Image.Resampling.NEAREST).save(
                Path('webapp/art/l2') / f'icon-{key}-{size}.webp', lossless=True)
with Image.open(source / 'icon.skill1050.png') as original:
    Path('webapp/art/map').mkdir(exist_ok=True)
    original.convert('RGBA').resize((64, 64), Image.Resampling.NEAREST).save(
        'webapp/art/map/teleport.webp', lossless=True)
