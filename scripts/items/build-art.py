"""Pack approved transparent item paintings into responsive WebP (requires Pillow).

Used references live in C:/Users/kubai/Desktop/images/done. This only converts/crops approved
paintings in art-source/items; it does not render Blender models.
"""
from pathlib import Path
from PIL import Image, ImageOps
import argparse

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, default=ROOT / 'art-source/items')
parser.add_argument('--out', type=Path, default=ROOT / 'webapp/art/items/v1')
parser.add_argument('--only', nargs='+', help='Build only these newly approved source names')
parser.add_argument('--prefix', default='', help='Prefix for the output names (epic jewellery uses epic-)')
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)
sources = sorted(args.source.glob('*.png'))
if args.only:
    sources = [source for source in sources if source.stem in args.only]
    missing = set(args.only) - {source.stem for source in sources}
    if missing:
        raise SystemExit('Missing approved paintings: ' + ', '.join(sorted(missing)))
if not sources:
    raise SystemExit('No approved source paintings found')
for source in sources:
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert('RGBA')
        alpha = image.getchannel('A')
        if alpha.getextrema()[0] == 255:
            raise ValueError(f'{source.name}: expected transparent cutout')
        bounds = alpha.point(lambda p: 255 if p > 8 else 0).getbbox()
        if not bounds:
            raise ValueError(f'{source.name}: empty painting')
        image = image.crop(bounds)
        for width in (128, 256, 512):
            height = width * 3 // 2
            scaled = ImageOps.contain(image, (round(width * .9), round(height * .9)), Image.Resampling.LANCZOS)
            canvas = Image.new('RGBA', (width, height))
            canvas.alpha_composite(scaled, ((width-scaled.width)//2, (height-scaled.height)//2))
            out = args.out / f'{args.prefix}{source.stem}-{width}.webp'
            # Atomic replacement keeps a concurrent preview from decoding a partial file.
            temporary = out.with_suffix('.webp.tmp')
            budget = {128: 18000, 256: 45000, 512: 130000}[width]
            # Preserve dimensions and alpha; use the highest quality that fits phones.
            for quality in (82, 78, 74, 70):
                canvas.save(temporary, 'WEBP', quality=quality, method=6)
                if temporary.stat().st_size <= budget:
                    break
            if temporary.stat().st_size > budget:
                raise ValueError(f'{out.name} exceeds mobile budget {budget}')
            temporary.replace(out)
        print(f'{source.stem}: 128 / 256 / 512 WebP')
