from pathlib import Path
from PIL import Image
import json,subprocess,urllib.request,concurrent.futures,math,hashlib
root=Path(__file__).resolve().parents[2]
script="import {CITIES,LOCATIONS} from './template/worldMap.js';import P from './template/worldBossMap.js';console.log(JSON.stringify([...CITIES,...LOCATIONS,...Object.values(P)]));"
points=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=root,text=True,encoding="utf-8"))
target=root/'webapp/art/world/l2';raw=root/'.tmp/world-map-sources';raw.mkdir(exist_ok=True)
manifest=root/'art-source/world-map-tiles/expansion-sources.js'
base='https://cdn.jsdelivr.net/gh/npetrovski/l2-world-map@0751a218798b1b759ff3555c7b48a025df49e332/Maps/'
ids=set()
for point in points:
 for x in [point['x']-4000,point['x']+4000]:
  for y in [point['y']-4000,point['y']+4000]:ids.add(f'{math.floor(x/32768)+20}_{math.floor(y/32768)+18}')
def build(id):
 if (target/(id+'.webp')).exists() and (target/(id+'-mobile.webp')).exists():return None
 try:
  source=raw/(id+'.jpg')
  if not source.exists():source.write_bytes(urllib.request.urlopen(base+id+'.jpg',timeout=25).read())
  with Image.open(source) as image:
   for side,suffix,quality in [(1536,'',84),(768,'-mobile',78)]:
    actual=min(side,image.width,image.height);image.convert('RGB').resize((actual,actual),Image.Resampling.LANCZOS).save(target/(id+suffix+'.webp'),quality=quality,method=6)
  return {'id':id,'source':base+id+'.jpg','sha256':hashlib.sha256(source.read_bytes()).hexdigest()}
 except Exception as e:return {'id':id,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:rows=[r for r in pool.map(build,sorted(ids)) if r]
available=sorted(p.stem for p in target.glob('*.webp') if p.stem!='world' and '-mobile' not in p.stem and (target/(p.stem+'-mobile.webp')).exists())
(target/'tiles.js').write_text('// Original client map tiles; bounded versions. Missing geography is explicit.\nexport const MAP_TILE_IDS = '+json.dumps(available)+';\n',encoding='utf-8')
prefix='export const EXPANSION_MAP_SOURCES='
previous=json.loads(manifest.read_text().removeprefix(prefix).rstrip(';\n')) if manifest.exists() else []
merged={r['id']:r for r in previous};merged.update({r['id']:r for r in rows})
manifest.write_text('export const EXPANSION_MAP_SOURCES='+json.dumps(list(merged.values()),indent=2)+';\n',encoding='utf-8')
print('Added',sum('error' not in r for r in rows),'source tiles; unavailable:',[r for r in rows if 'error' in r])
