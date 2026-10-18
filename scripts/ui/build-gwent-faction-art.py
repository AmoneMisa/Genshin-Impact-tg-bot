"""Export existing reviewed faction art for the lightweight deck selector."""
import json
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
LEADERS = {
    'wild-hunt': 'wh-leader-lord',
    'witchers': 'wi-leader-hunter',
    'toussaint': 'to-leader-duchess',
    'velen': 've-leader-baron',
    'redania': 're-leader-king',
    'sorceresses': 'so-leader-head',
    'eternal-fire': 'ef-leader-inquisitor',
}

out = ROOT / 'webapp/art/gwent/factions'
out.mkdir(parents=True, exist_ok=True)
manifest = {}
for faction, leader in LEADERS.items():
    source = ROOT / 'output/gwent-review' / (faction + '-v1')
    crest = source / 'layers/faction-emblem.png'
    illustration = source / 'illustrations' / (leader + '.png')
    shutil.copyfile(crest, out / (faction + '-crest.png'))
    with Image.open(illustration) as image:
        image.thumbnail((480, 672), Image.Resampling.LANCZOS)
        image.convert('RGB').save(out / (faction + '-banner.webp'), quality=82, method=6)
    manifest[faction] = {
        'crest': crest.relative_to(ROOT).as_posix(),
        'banner': illustration.relative_to(ROOT).as_posix(),
        'origin': 'Existing reviewed fan expansion artwork; not an original Witcher 3 faction asset',
    }
(out / 'raster-sources.js').write_text('export const FACTION_ART_SOURCES = ' + json.dumps(manifest, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
print('Exported seven faction crests and seven unlabelled banners.')
