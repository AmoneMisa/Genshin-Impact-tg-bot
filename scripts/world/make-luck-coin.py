"""Writes the Coin of Luck icon (the donation currency) from the original Lineage II client icon.

    python scripts/world/make-luck-coin.py <path to icon.etc_coins_gold_i00.png>

The client icon (32x32) is scaled with nearest neighbour, without repainting, to
webapp/art/world/v1/currency/luck-coin-{128,256,512}.webp (every Coin of Luck of the Mini App shows this file)
and to webapp/art/l2/icon-etc_coins_gold_i00-{128,256,512}.webp. Keep "currency/luck-coin"
in webapp/art/world-art-manifest.js (REVIEWED_WORLD_ART) so the screens show it.
"""
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SIZES = (128, 256, 512)

source = Path(sys.argv[1]) if len(sys.argv) > 1 else None
if not source or not source.exists():
    raise SystemExit('Pass the path to icon.etc_coins_gold_i00.png from the Lineage II client icons.')
icon = Image.open(source).convert('RGBA')
for size in SIZES:
    scaled = icon.resize((size, size), Image.Resampling.NEAREST)
    scaled.save(ROOT / f'webapp/art/world/v1/currency/luck-coin-{size}.webp', lossless=True)
    scaled.save(ROOT / f'webapp/art/l2/icon-etc_coins_gold_i00-{size}.webp', lossless=True)
print('Coin of Luck icon written from', source)
