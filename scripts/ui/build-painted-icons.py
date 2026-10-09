"""Convert reviewed source paintings to small, shared, alpha WebP UI icons."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[2]
catalog = json.loads((root / 'art-source/ui-icons/catalog.json').read_text(encoding='utf-8-sig'))
output_dir = root / 'webapp/art/ui/v1'
output_dir.mkdir(parents=True, exist_ok=True)
for key, source in catalog['sources'].items():
    with Image.open(root / source) as original:
        im = original.convert('RGBA')
        if source.startswith('art-source/ui-icons/') and im.getextrema()[3][0] == 255:
            raise ValueError('Missing transparency: ' + key)
        for size in (128, 256):
            target = output_dir / f'{key}-{size}.webp'
            if '--force' not in sys.argv and target.is_file() and target.stat().st_mtime >= (root/source).stat().st_mtime:
                continue
            scaled = ImageOps.contain(im, (size, size), Image.Resampling.LANCZOS)
            canvas = Image.new('RGBA', (size, size))
            canvas.alpha_composite(scaled, ((size-scaled.width)//2, (size-scaled.height)//2))
            canvas.save(target, 'WEBP', quality=84, method=6)
print('Built', len(catalog['sources']), 'shared paintings for', len(catalog['aliases']), 'UI icons')
(root/'webapp/art/ui-icon-art.js').write_text(
    '// Reviewed paintings; related actions reuse one cached image.\n'
    + 'export const UI_ICON_ART = Object.freeze(' + json.dumps(catalog['aliases'], indent=2) + ');\n'
    + '''export function uiIconUrl(name, size=128) {
 const key=Object.hasOwn(UI_ICON_ART,name)?UI_ICON_ART[name]:null;
 return key?`/art/ui/v1/${key}-${size===256?256:128}.webp`:null;
}
''', encoding='utf-8')
