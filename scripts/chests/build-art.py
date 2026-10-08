"""Build transparent, mobile-sized chest paintings from offline PNG masters."""
from pathlib import Path
from PIL import Image
import io

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'webapp/art/chests/v1'
OUT.mkdir(parents=True, exist_ok=True)
for state in ('closed', 'open'):
    image = Image.open(ROOT / f'art-source/chests/{state}.png').convert('RGBA')
    image = image.crop(image.getchannel('A').getbbox())
    for size, budget in ((128, 18000), (256, 45000), (512, 130000)):
        fitted = image.copy()
        fitted.thumbnail((int(size * .90), int(size * .90)), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (size, size))
        canvas.alpha_composite(fitted, ((size - fitted.width) // 2, int(size * .95) - fitted.height))
        for quality in (82, 78, 74, 70):
            data = io.BytesIO()
            canvas.save(data, format='WEBP', quality=quality, method=6)
            if data.tell() <= budget:
                break
        if data.tell() > budget:
            raise ValueError(f'{state}-{size} exceeds {budget} bytes')
        target = OUT / f'{state}-{size}.webp'
        temporary = target.with_suffix('.tmp')
        temporary.write_bytes(data.getvalue())
        temporary.replace(target)
        print(target.name, data.tell())
