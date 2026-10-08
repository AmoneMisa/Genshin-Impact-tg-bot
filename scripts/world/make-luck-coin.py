"""Draws the Coin of Luck icon (the donation currency): an original gold coin with a four-leaf clover.

    python scripts/world/make-luck-coin.py            # writes webapp/art/world/v1/currency/luck-coin-{128,256,512}.webp

The icon is drawn here, not copied from any game. After changing it, keep "currency/luck-coin"
in webapp/art/world-art-manifest.js (REVIEWED_WORLD_ART) so the screens show it.
"""
import math
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'webapp/art/world/v1/currency'
S = 1024
C = S // 2


def radial(size, inner, outer, center=(0.5, 0.5), spread=1.0):
    """Radial gradient image: `inner` colour at `center`, `outer` colour at the edge."""
    base = Image.radial_gradient('L').resize((size * 2, size * 2), Image.Resampling.BICUBIC)
    ox = int((center[0] - 0.5) * size)
    oy = int((center[1] - 0.5) * size)
    canvas = Image.new('L', (size, size), 255)
    canvas.paste(base, (-size // 2 + ox, -size // 2 + oy))
    if spread != 1.0:
        canvas = canvas.point(lambda v: min(255, int(v * spread)))
    return ImageOps.colorize(canvas, inner, outer).convert('RGBA')


def disc_mask(radius, size=S):
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).ellipse((C - radius, C - radius, C + radius, C + radius), fill=255)
    return mask


def heart_points(scale):
    points = []
    for step in range(0, 361, 2):
        t = math.radians(step)
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        points.append((x * scale, -y * scale))
    tip = max(y for _, y in points)
    return [(x, y - tip) for x, y in points]  # the tip sits at (0, 0), lobes above it


def leaf_mask(angle, scale, grow=0):
    mask = Image.new('L', (S, S), 0)
    pts = []
    sin, cos = math.sin(math.radians(angle)), math.cos(math.radians(angle))
    for x, y in heart_points(scale):
        y -= 16  # a small gap between the leaves in the middle
        pts.append((C + x * cos - y * sin, C + x * sin + y * cos))
    ImageDraw.Draw(mask).polygon(pts, fill=255)
    if grow:
        mask = mask.filter(ImageFilter.MaxFilter(grow * 2 + 1))
    return mask


def coin():
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))

    # Body: warm gold with the light coming from the top left.
    body = radial(S, (255, 233, 150), (173, 112, 22), center=(0.38, 0.32), spread=1.15)
    img.paste(body, (0, 0), disc_mask(470))

    # Outer rim and the bevel lines on it.
    rim = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    draw = ImageDraw.Draw(rim)
    draw.ellipse((C - 470, C - 470, C + 470, C + 470), outline=(112, 70, 12, 255), width=26)
    draw.ellipse((C - 444, C - 444, C + 444, C + 444), outline=(255, 232, 150, 235), width=10)
    draw.ellipse((C - 392, C - 392, C + 392, C + 392), outline=(139, 88, 16, 255), width=14)
    draw.ellipse((C - 378, C - 378, C + 378, C + 378), outline=(255, 214, 110, 200), width=6)
    img.alpha_composite(rim)

    # Inner field, a little deeper in colour so the clover stands out.
    field = radial(S, (250, 205, 96), (190, 126, 28), center=(0.45, 0.4), spread=1.2)
    img.paste(field, (0, 0), disc_mask(372))

    # Little studs around the field.
    studs = ImageDraw.Draw(img)
    for index in range(24):
        a = math.radians(index * 15)
        x, y = C + 418 * math.cos(a), C + 418 * math.sin(a)
        studs.ellipse((x - 9, y - 9, x + 9, y + 9), fill=(255, 238, 170, 255), outline=(125, 80, 14, 255), width=3)

    # Clover: a shadow, a dark outline, then green leaves with a light top edge.
    shadow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    for angle in (0, 90, 180, 270):
        shadow.paste((90, 52, 6, 150), (14, 20), leaf_mask(angle, 10.9))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(10)))

    for angle in (0, 90, 180, 270):
        outline = leaf_mask(angle, 10.9, grow=7)
        img.paste((10, 82, 36, 255), (0, 0), outline)
    for angle in (0, 90, 180, 270):
        mask = leaf_mask(angle, 10.9)
        green = radial(S, (132, 240, 150), (8, 112, 48), center=(0.42, 0.22), spread=0.9)
        img.paste(green, (0, 0), mask)
        vein = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        sin, cos = math.sin(math.radians(angle)), math.cos(math.radians(angle))
        ImageDraw.Draw(vein).line(
            [(C - 18 * sin * -1 + 0, C), (C + 96 * -sin * -1 * 0 + 0, C)], fill=(0, 0, 0, 0))
        highlight = ImageChops.subtract(mask, mask.filter(ImageFilter.GaussianBlur(5)).point(lambda v: min(255, v * 2)))
        img.paste((214, 255, 220, 170), (0, 0), highlight.filter(ImageFilter.GaussianBlur(2)))

    # Stem.
    draw = ImageDraw.Draw(img)
    stem = [(C + 18, C + 22), (C + 62, C + 120), (C + 112, C + 196)]
    draw.line(stem, fill=(10, 82, 36, 255), width=34, joint='curve')
    draw.line(stem, fill=(56, 188, 96, 255), width=18, joint='curve')

    # Sparkle on the top left.
    spark = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    sx, sy = 292, 262
    sd = ImageDraw.Draw(spark)
    sd.polygon([(sx, sy - 74), (sx + 13, sy - 13), (sx + 74, sy), (sx + 13, sy + 13),
                (sx, sy + 74), (sx - 13, sy + 13), (sx - 74, sy), (sx - 13, sy - 13)], fill=(255, 255, 255, 235))
    img.alpha_composite(spark.filter(ImageFilter.GaussianBlur(1.5)))
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    master = coin()
    for size in (512, 256, 128):
        small = master.resize((size, size), Image.Resampling.LANCZOS)
        target = OUT / f'luck-coin-{size}.webp'
        small.save(target, format='WEBP', quality=92, method=6)
        print(target.relative_to(ROOT), target.stat().st_size)


if __name__ == '__main__':
    main()
