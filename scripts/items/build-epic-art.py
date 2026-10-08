"""Pack the epic art batch (docs/imagegen-prompts.md 5d, 5f) into WebP for phones (requires Pillow).

  bosses  art-source/bosses/<boss>.png      -> webapp/art/bosses/<boss>.webp          960x960
  icons   art-source/icons/<icon>.png       -> webapp/art/icons/<icon>-{128,256}.webp transparent
Epic jewellery and fist weapons are item paintings: python scripts/items/build-art.py (see items:build).
"""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]


def save(image, target, budget, qualities=(84, 80, 76, 72, 68, 62, 56, 50)):
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix('.webp.tmp')
    for quality in qualities:
        image.save(temporary, 'WEBP', quality=quality, method=6)
        if temporary.stat().st_size <= budget:
            break
    if temporary.stat().st_size > budget:
        raise ValueError(f'{target.name} exceeds {budget} bytes')
    temporary.replace(target)
    return target.stat().st_size


for source in sorted((ROOT / 'art-source/bosses').glob('*.png')):
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert('RGB')
        if image.size != (960, 960):
            image = image.resize((960, 960), Image.Resampling.LANCZOS)
        size = save(image, ROOT / 'webapp/art/bosses' / f'{source.stem}.webp', 200000)
        print(f'boss {source.stem}: {size} bytes')

for source in sorted((ROOT / 'art-source/icons').glob('*.png')):
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert('RGBA')
        if image.getchannel('A').getextrema()[0] == 255:
            raise ValueError(f'{source.name}: expected a transparent icon')
        for width, budget in ((128, 14000), (256, 42000)):
            scaled = image.resize((width, width), Image.Resampling.LANCZOS)
            size = save(scaled, ROOT / 'webapp/art/icons' / f'{source.stem}-{width}.webp', budget)
            print(f'icon {source.stem}-{width}: {size} bytes')
