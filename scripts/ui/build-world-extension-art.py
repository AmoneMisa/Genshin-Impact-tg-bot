"""Optimize generated town/hunting/interior studies and preserve prompt provenance."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,sys
rows=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'));out=Path('webapp/art/world/scenes')
for row in rows:
    with Image.open(row['path']) as source:
        image=source.convert('RGB')
        for size,suffix,quality in [((1536,1024),'',87),((768,512),'-mobile',80)]:
            file=out/(row['asset']+suffix+'-v1.webp')
            if not file.exists():image.resize(size,Image.Resampling.LANCZOS).save(file,quality=quality,method=6)
metadata=[{**{k:v for k,v in r.items() if k not in ['path','reference']},'reference':str(Path(r['reference']).relative_to(Path.cwd())),'source':Path(r['path']).name,'generator':'OpenAI imagegen, built-in tool','notOriginalL2ClientArt':True,'notOriginalGeodata':True} for r in rows]
(out/'settlements.source.js').write_text('export const WORLD_EXTENSION_ART = '+json.dumps(metadata,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
for category in ['city','hunting','interior']:
    group=sorted([r for r in rows if r['category']==category],key=lambda r:(r['id'],r.get('section',0)))
    sheet=Image.new('RGB',(1200,((len(group)+2)//3)*300),'#111018');draw=ImageDraw.Draw(sheet)
    for i,row in enumerate(group):
        with Image.open(out/(row['asset']+'-mobile-v1.webp')) as im:sheet.paste(im.resize((392,261),Image.Resampling.LANCZOS),((i%3)*400+4,(i//3)*300+4))
        draw.text(((i%3)*400+8,(i//3)*300+272),row['asset'],fill='#ead7a6')
    sheet.save('docs/world-extension-'+category+'.jpg',quality=90)
print('Prepared',len(rows),'new world studies')
