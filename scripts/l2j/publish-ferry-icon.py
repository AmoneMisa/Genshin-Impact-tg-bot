"""Publish the original ticket icon from the user's client; no painted substitutes."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image

source=Path(sys.argv[1])
key='icon-etc_ticket_red_i00'
with Image.open(source) as original:
    for size in [128,256,512]:
        original.convert('RGBA').resize((size,size),Image.Resampling.NEAREST).save(Path('webapp/art/l2')/f'{key}-{size}.webp',lossless=True)
file=Path('webapp/art/l2-icon-art.js')
text=file.read_text(encoding='utf-8')
prefix='export const L2_MATERIAL_ART=Object.freeze('
start=text.index(prefix)+len(prefix);end=text.index(');',start)
items=json.loads(text[start:end]);items.update({'l2_7904':key,'l2_7905':key})
file.write_text(text[:start]+json.dumps(items,ensure_ascii=False)+text[end:],encoding='utf-8')
Path('art-source/ferry-ticket-icon.json').write_text(json.dumps({'original':source.name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'items':[7904,7905],'clientIcon':'icon.etc_ticket_red_i00','conversion':'nearest, lossless WebP','sizes':[128,256,512]},indent=2)+'\n')
