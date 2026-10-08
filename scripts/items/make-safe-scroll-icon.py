"""Draws the icon of the indestructible enchant scroll: the plain scroll with a steel shield badge.

    python scripts/items/make-safe-scroll-icon.py   # writes webapp/art/icons/scroll-safe-{128,256}.webp

The scrolls are neutral gold paintings tinted per grade in CSS (see webapp/material-icons.js).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
ICONS = ROOT / 'webapp/art/icons'


def shield(size):
    """A heater shield with a steel face, gold rim and a light edge, on a transparent square."""
    big = size * 4
    img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    w, h = big, big
    outline = [(w * .5, 0), (w * .96, h * .16), (w * .9, h * .58), (w * .5, h), (w * .1, h * .58), (w * .04, h * .16)]
    draw.polygon(outline, fill=(122, 82, 20, 255))
    inner = [(w * .5, h * .07), (w * .89, h * .21), (w * .84, h * .55), (w * .5, h * .92), (w * .16, h * .55), (w * .11, h * .21)]
    draw.polygon(inner, fill=(78, 112, 168, 255))
    left = [(w * .5, h * .07), (w * .5, h * .92), (w * .16, h * .55), (w * .11, h * .21)]
    draw.polygon(left, fill=(124, 160, 214, 255))
    draw.line([(w * .5, h * .12), (w * .5, h * .86)], fill=(238, 214, 128, 255), width=max(2, big // 40))
    draw.line([(w * .2, h * .34), (w * .8, h * .34)], fill=(238, 214, 128, 255), width=max(2, big // 40))
    return img.resize((size, size), Image.Resampling.LANCZOS)


for size in (128, 256):
    scroll = Image.open(ICONS / f'scroll-{size}.webp').convert('RGBA')
    badge = shield(round(size * .46))
    shadow = Image.new('RGBA', scroll.size, (0, 0, 0, 0))
    spot = (scroll.width - badge.width - round(size * .04), scroll.height - badge.height - round(size * .04))
    shadow.paste((0, 0, 0, 120), (spot[0] + 2, spot[1] + 3), badge.getchannel('A'))
    scroll.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(size / 64)))
    scroll.alpha_composite(badge, spot)
    target = ICONS / f'scroll-safe-{size}.webp'
    scroll.save(target, format='WEBP', quality=90, method=6)
    print(target.relative_to(ROOT), target.stat().st_size)
