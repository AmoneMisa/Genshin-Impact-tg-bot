"""Bundle pinned original map tiles, with bounded decoded mobile/desktop variants."""
from pathlib import Path
import json,math,urllib.request,concurrent.futures,sys
from PIL import Image
root=Path(__file__).resolve().parents[2];data=json.loads((root/'.tmp/settlement-data.json').read_text(encoding='utf-8'))
out=root/'webapp/art/world/l2';raw=root/'art-source/world-map-tiles';raw.mkdir(parents=True,exist_ok=True)
points=[(c['x'],c['y']) for c in data['settlements']]+[(p['x'],p['y']) for rows in data['creation'].values() for p in rows]
ids={p.stem for p in out.glob('*.jpg')}
for x,y in points:
    for tx in range(math.floor((x-10000)/32768)+20,math.floor((x+10000)/32768)+21):
        for ty in range(math.floor((y-22000)/32768)+18,math.floor((y+22000)/32768)+19):ids.add(str(tx)+'_'+str(ty))
base='https://cdn.jsdelivr.net/gh/npetrovski/l2-world-map@0751a218798b1b759ff3555c7b48a025df49e332/Maps/'
def build(id):
    try:
        source=out/(id+'.jpg')
        if not source.exists():
            source=raw/(id+'.jpg')
            if not source.exists() and '--offline' in sys.argv:raise FileNotFoundError('Original tile unavailable in local sources')
            if not source.exists():source.write_bytes(urllib.request.urlopen(base+id+'.jpg',timeout=35).read())
        with Image.open(source) as image:
            image=image.convert('RGB')
            for side,suffix,quality in [(1536,'',84),(768,'-mobile',78)]:
                target=out/(id+suffix+'.webp')
                actual=min(side,image.width,image.height)
                if not target.exists() or Image.open(target).width>actual:image.resize((actual,actual),Image.Resampling.LANCZOS).save(target,quality=quality,method=6)
        return {'id':id,'url':base+id+'.jpg','bytes':source.stat().st_size}
    except Exception as e:return {'id':id,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:rows=list(pool.map(build,sorted(ids)))
available=[r['id'] for r in rows if 'error' not in r]
(out/'tiles.js').write_text('// Original map tiles; bounded display variants. Missing tiles are never substituted with fake geography.\nexport const MAP_TILE_IDS = '+json.dumps(available)+';\n',encoding='utf-8')
(raw/'sources.js').write_text('export const MAP_TILE_SOURCES = '+json.dumps(rows,indent=2)+';\n',encoding='utf-8')
print('Prepared',len(available),'tiles; missing:',[r for r in rows if 'error' in r])
