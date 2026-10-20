"""Publish the original ticket icon from the user's client; no painted substitutes."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image

source=Path(sys.argv[1])
tickets=json.loads(Path('template/ferryTickets.js').read_text(encoding='utf-8').split('=',1)[1].strip().removesuffix(';'))
icons={}
for ticket in tickets.values():
    icon=ticket['icon'];original=source/(icon+'.png') if source.is_dir() else source
    assert original.name.lower()==icon+'.png', 'Supply the original client icon directory'
    key=icon.replace('.','-')
    with Image.open(original) as image:
        for size in [128,256,512]:
            image.convert('RGBA').resize((size,size),Image.Resampling.NEAREST).save(Path('webapp/art/l2')/f'{key}-{size}.webp',lossless=True)
    icons[icon]={'original':original.name,'sha256':hashlib.sha256(original.read_bytes()).hexdigest()}
file=Path('webapp/art/l2-icon-art.js')
text=file.read_text(encoding='utf-8')
prefix='export const L2_MATERIAL_ART=Object.freeze('
start=text.index(prefix)+len(prefix);end=text.index(');',start)
items=json.loads(text[start:end]);items.update({'l2_'+str(t['id']):t['icon'].replace('.','-') for t in tickets.values()})
file.write_text(text[:start]+json.dumps(items,ensure_ascii=False)+text[end:],encoding='utf-8')
Path('art-source/ferry-ticket-icon.json').write_text(json.dumps({'icons':icons,'items':list(map(int,tickets)),'conversion':'nearest, lossless WebP','sizes':[128,256,512]},indent=2)+'\n')
