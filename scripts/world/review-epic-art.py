from pathlib import Path
from PIL import Image,ImageDraw
import re,json,sys
root=Path.cwd();raw=(root/'art-source/epic-art-jobs.mjs').read_text(encoding='utf-8');jobs=json.loads(raw.split(' = ',1)[1].rstrip(';\n'))
section_filter = next((arg.split('=',1)[1] for arg in sys.argv if arg.startswith('--section=')), None)
if section_filter: jobs = [job for job in jobs if job['section'] == section_filter]
records=[]
for job in jobs:
    source=root/'art-source'/job['key']
    if not source.exists():continue
    im=Image.open(source).convert('RGBA');alpha=im.getchannel('A');records.append({'key':job['key'],'size':im.size,'transparent':alpha.getextrema()[0]<255})
    if '--deliver' in sys.argv:
        if job['transparent'] and alpha.getextrema()[0]==255:raise ValueError(str(source)+': missing alpha')
        master=root/'art-source/masters/epic-batch'/job['key'];master.parent.mkdir(parents=True,exist_ok=True)
        if not master.exists():master.write_bytes(source.read_bytes())
        im=Image.open(master).convert('RGBA').resize((job['width'],job['height']),Image.Resampling.LANCZOS)
        if not job['transparent']:im=im.convert('RGB')
        im.save(source,optimize=True)
for section in ['5d','5e','5f','5g']:
    subset=[job for job in jobs if job['section']==section and (root/'art-source'/job['key']).exists()]
    if not subset:continue
    sheet=Image.new('RGB',(720,len(subset)*190),'#0b0d18');draw=ImageDraw.Draw(sheet)
    for row,job in enumerate(subset):
        im=Image.open(root/'art-source'/job['key']).convert('RGBA');draw.text((8,row*190+5),job['key'],fill='#d8b36a')
        for col,bg in enumerate(['#151c2c','#c1b5a0']):
            tile=Image.new('RGBA',(165,160),bg);thumb=im.copy();thumb.thumbnail((150,150));tile.alpha_composite(thumb,((165-thumb.width)//2,(160-thumb.height)//2));sheet.paste(tile.convert('RGB'),(8+col*180,row*190+25))
        thumb=im.copy();thumb.thumbnail((96,96));tile=Image.new('RGBA',(110,110),'#151c2c');tile.alpha_composite(thumb,((110-thumb.width)//2,(110-thumb.height)//2));sheet.paste(tile.convert('RGB'),(380,row*190+40))
        draw.text((510,row*190+50),f"Target: {job['width']}x{job['height']}\nAlpha: {job['transparent']}",fill='#eee4cf')
        if section == '5f':
            small=im.copy();small.thumbnail((48,48));tile=Image.new('RGBA',(56,56),'#151c2c');tile.alpha_composite(small,((56-small.width)//2,(56-small.height)//2));sheet.paste(tile.convert('RGB'),(510,row*190+105))
    sheet.save(root/f'docs/epic-art-{section}-review.webp',quality=85)
print(json.dumps(records))

