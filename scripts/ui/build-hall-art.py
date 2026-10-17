"""Encode reviewed hall location/development art, preserving prompts and references."""
from pathlib import Path
import json
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[2];out=root/'webapp/art/world/scenes'
rows=[json.loads(p.read_text(encoding='utf-8-sig')) for p in sorted((root/'.tmp/hall-art').glob('*.json'))]
for row in rows:
    source=Path(row['path'].split(' as ')[-1]);row['path']=str(source)
    with Image.open(source) as im:
        im=im.convert('RGB')
        for size,suffix,quality in [((1536,1024),'',87),((768,512),'-mobile',80)]:
            target=out/(row['asset']+suffix+'-v1.webp')
            if not target.exists():im.resize(size,Image.Resampling.LANCZOS).save(target,quality=quality,method=6)
metadata=[{**{k:v for k,v in r.items() if k!='path'},'source':Path(r['path']).name,'generator':'OpenAI imagegen built-in tool','created':'2026-10-16','notOriginalL2ClientArt':True,'notOriginalGeodata':True} for r in rows]
(out/'halls.source.js').write_text('export const HALL_ART = '+json.dumps(metadata,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
for group,name in [(sorted([r for r in rows if 'level' not in r],key=lambda r:r['id']),'locations'),(sorted([r for r in rows if 'level' in r],key=lambda r:r['level']),'development')]:
    if name=='development':group.insert(2,{'asset':'interior-hall','title':'Hall level 3'})
    sheet=Image.new('RGB',(1200,((len(group)+2)//3)*300),'#111018');draw=ImageDraw.Draw(sheet)
    for i,r in enumerate(group):
        with Image.open(out/(r['asset']+'-mobile-v1.webp')) as im:sheet.paste(im.resize((392,261),Image.Resampling.LANCZOS),((i%3)*400+4,(i//3)*300+4))
        draw.text(((i%3)*400+8,(i//3)*300+272),r['asset'],fill='#ead7a6')
    sheet.save(root/('docs/halls-'+name+'.jpg'),quality=90)
print('Prepared',len(rows),'hall images and two galleries')
