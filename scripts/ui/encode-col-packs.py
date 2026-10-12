"""Resize generated transparent CoL pack artwork for the top-up UI."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
out = root / 'webapp/art/col-topup'
out.mkdir(parents=True, exist_ok=True)
for pack in ['pouch', 'sack', 'casket', 'chest', 'trove', 'vault']:
    image = Image.open(root / f'art-source/col-topup/{pack}.png').convert('RGBA')
    for size in [128, 256]:
        scaled = image.resize((size, size), Image.Resampling.LANCZOS)
        destination = out / f'{pack}-{size}.webp'
        scaled.save(destination, 'WEBP', quality=82, method=6)
        print(f'{destination.name}: {destination.stat().st_size} bytes')
