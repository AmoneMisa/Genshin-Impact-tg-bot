"""Encode generated adjacent-area illustrations; never calls an image API."""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw

rows=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
target=Path('webapp/art/world/scenes')
for row in rows:
    desktop=target/(row['asset']+'-v'+str(row.get('version',1))+'.webp')
    mobile=target/(row['asset']+'-mobile-v'+str(row.get('version',1))+'.webp')
    if desktop.exists() and mobile.exists():
        continue
    with Image.open(row['path']) as source:
        image=source.convert('RGB')
        image.resize((1536,1024),Image.Resampling.LANCZOS).save(desktop,quality=87,method=6)
        image.resize((768,512),Image.Resampling.LANCZOS).save(mobile,quality=80,method=6)
metadata=[{**{key:value for key,value in row.items() if key not in ('path','base')},
           'reference':Path(row['base']).name,'source':Path(row['path']).name,
           'generator':'OpenAI imagegen, built-in tool','created':'2026-10-16',
           'notOriginalL2ClientArt':True,'notOriginalGeodata':True} for row in rows]
(target/'exploration.source.js').write_text('export const EXPLORATION_ART = '+json.dumps(metadata,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
groups=list(dict.fromkeys(row['id'] for row in rows))
for page in range((len(groups)+6)//7):
    group=groups[page*7:(page+1)*7]
    sheet=Image.new('RGB',(1200,len(group)*300),'#111018')
    draw=ImageDraw.Draw(sheet)
    for y,id in enumerate(group):
        items=sorted([row for row in rows if row['id']==id],key=lambda row:row['section'])
        files=[Path(items[0]['base'])]+[target/(row['asset']+'-mobile-v'+str(row.get('version',1))+'.webp') for row in items]
        for x,file in enumerate(files):
            with Image.open(file) as image:
                sheet.paste(image.resize((392,261),Image.Resampling.LANCZOS),(x*400+4,y*300+4))
            draw.text((x*400+8,y*300+270),id+' / '+str(x),fill='#ead7a6')
    sheet.save('docs/hunt-exploration-'+str(page+1)+'.jpg',quality=90)
print('Prepared',len(rows),'adjacent-area illustrations')
