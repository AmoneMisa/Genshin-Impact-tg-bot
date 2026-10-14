"""Create numbered full-body contact sheets for individual motion annotation."""
import json
from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[2]
folder=root/'art-source/avatars/motion-review'
jobs=json.loads((root/'art-source/avatars/collections/jobs.json').read_text(encoding='utf-8-sig'))
reviewed=json.loads((root/'art-source/avatars/collections/reviewed.json').read_text(encoding='utf-8-sig'))
items=[(j['key'],'webapp/art/avatars/collections/v1/'+j['key']+'-512.webp') for j in jobs if j['key'] in reviewed]
items+=json.loads((folder/'default-items.json').read_text(encoding='utf-8'))
(folder/'pose-items.json').write_text(json.dumps(items,indent=2),encoding='utf-8')
for start in range(0,len(items),6):
    sheet=Image.new('RGB',(1536,416),'#121926');draw=ImageDraw.Draw(sheet)
    for i,(key,file) in enumerate(items[start:start+6]):
        im=Image.open(root/file).convert('RGBA').resize((256,384))
        sheet.paste(im,(i*256,32),im)
        draw.text((i*256+3,3),str(start+i)+' '+key,fill='white')
        # Coordinates refer to the portrait, excluding the label strip.
    sheet.save(folder/f'poses-{start//6:02d}.jpg',quality=95)
print(len(items),'numbered poses')
