"""Publish browser-rendered inventory UI icons as lossless WebP; original paintings remain intact."""
import json,zipfile
from pathlib import Path
from PIL import Image
render=Path('.tmp/l2-style')
dest=Path('webapp/art/items/l2-style');dest.mkdir(parents=True,exist_ok=True)
rows=json.loads((render/'manifest.json').read_text(encoding='utf-8'))
for row in rows:
    with Image.open(render/(row['key']+'.png')) as image:
        assert image.size==(32,32),row['key']
        for size in [32,64,128,256,512]:
            image.resize((size,size),Image.Resampling.NEAREST).save(dest/f"{row['key']}-{size}.webp",lossless=True)
    row['icon']=f"{row['key']}-32.webp"
    row['source']=f"../v1/{row['key']}-512.webp"
with Image.open('art-source/l2-style/slot-background.png') as image:
    image.resize((32,32),Image.Resampling.LANCZOS).save(dest/'slot-background-32.webp',lossless=True)
(dest/'manifest.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with zipfile.ZipFile(dest/'collection.zip','w',compression=zipfile.ZIP_DEFLATED) as archive:
    archive.write(dest/'manifest.json','manifest.json')
    archive.write(dest/'slot-background-32.webp','slot-background-32.webp')
    for row in rows:
        for size in [32,64]:
            name=f"{row['key']}-{size}.webp";archive.write(dest/name,name)
print(f"Published {len(rows)} individual icons, manifest and downloadable collection")
