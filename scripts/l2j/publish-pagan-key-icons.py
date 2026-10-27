"""Publish the three original key icons without rebuilding unrelated icon IDs."""
from pathlib import Path
import hashlib,json,re,sys
from PIL import Image

source=Path(sys.argv[1] if len(sys.argv)>1 else 'C:/Users/kubai/Desktop/icons')
data=json.loads(Path('template/paganKeys.js').read_text(encoding='utf8').split('export default ',1)[1].strip().removesuffix(';'))
file=Path('webapp/art/l2-gameplay-icons.js');text=file.read_text(encoding='utf8')
match=re.search(r'export const ITEM_ICONS=(.*?);\n',text);items=json.loads(match[1]);records={}
for id,key in data['keys'].items():
 original=source/(key['icon']+'.png');assert original.is_file(), 'Missing original client pixels: '+str(original)
 name=key['icon'].replace('.','-');outputs={}
 with Image.open(original) as image:
  for size in [32,64,128]:
   target=Path('webapp/art/l2-extra')/f'{name}-{size}.webp';expected=image.convert('RGBA').resize((size,size),Image.Resampling.NEAREST)
   if target.exists():
    with Image.open(target) as existing:assert existing.convert('RGBA').tobytes()==expected.tobytes(),'Existing original icon pixels differ'
   else:expected.save(target,lossless=True)
   outputs[size]={'path':str(target).replace('\\','/'),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
 items['l2_'+id]=name
 records[id]={'icon':key['icon'],'original':original.name,'originalSha256':hashlib.sha256(original.read_bytes()).hexdigest(),'outputs':outputs}
file.write_text(text[:match.start(1)]+json.dumps(items,separators=(',',':'))+text[match.end(1):],encoding='utf8')
Path('art-source/pagan-key-icons.json').write_text(json.dumps({'conversion':'Original client PNG, nearest resize, lossless WebP','items':records},indent=2)+'\n',encoding='utf8')
