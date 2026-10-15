"""Resize reviewed generated icons without repainting their contents."""
import json
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[2];folder=root/'art-source/avatars/shop-icons'
jobs=json.loads((folder/'jobs.json').read_text(encoding='utf-8'))
out=root/'webapp/art/avatars/shop-icons/v1';out.mkdir(parents=True,exist_ok=True)
catalog=[];report=[]
for job in jobs:
    if job['status']!='reviewed':continue
    with Image.open(root/job['source']) as original:
        assert original.width==original.height,job['costumeId']
        image=original.convert('RGBA');assert image.getchannel('A').getextrema()==(255,255)
        for size in [64,128,256]:
            file=out/(job['costumeId']+'-'+str(size)+'.webp')
            image.convert('RGB').resize((size,size),Image.Resampling.LANCZOS).save(file,'WEBP',quality=86,method=6)
            report.append({'path':file.relative_to(root).as_posix(),'bytes':file.stat().st_size})
    catalog.append({k:job[k] for k in ['costumeId','name','gender','background']})
target=root/'webapp/art/avatar-costume-icons.js'
target.write_text('// Generated from individually reviewed custom costume icons.\n'
    +'export const AVATAR_COSTUME_ICONS = Object.freeze('+json.dumps(catalog,ensure_ascii=False,indent=2)+');\n'
    +'export function avatarCostumeIconUrl(costumeId, size = 64) {\n'
    +'  if (![64,128,256].includes(size) || !AVATAR_COSTUME_ICONS.some(item => item.costumeId === costumeId)) return null;\n'
    +'  return `/art/avatars/shop-icons/v1/${costumeId}-${size}.webp`;\n}\n',encoding='utf-8')
from PIL import ImageFont
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',13)
sheet=Image.new('RGB',(1120,((len(catalog)+6)//7)*190),'#121017');draw=ImageDraw.Draw(sheet)
small=Image.new('RGB',(560,((len(catalog)+6)//7)*90),'#121017');sd=ImageDraw.Draw(small)
for index,job in enumerate(catalog):
    x=index%7*160;y=index//7*190
    with Image.open(out/(job['costumeId']+'-128.webp')) as im:sheet.paste(im,(x+16,y+8))
    name=job['name'];words=name.split();lines=['']
    for word in words:
        if draw.textlength(lines[-1]+' '+word,font=font)>150:lines.append(word)
        else:lines[-1]=(lines[-1]+' '+word).strip()
    for line,txt in enumerate(lines[:2]):draw.text((x+5,y+141+line*16),txt,font=font,fill='#eee2cc')
    sx=index%7*80;sy=index//7*90
    with Image.open(out/(job['costumeId']+'-64.webp')) as im:small.paste(im,(sx+8,sy+4))
    sd.text((sx+9,sy+69),str(index+1),font=font,fill='#eee2cc')
sheet.save(folder/'shop-icons-preview.jpg',quality=95);small.save(folder/'shop-icons-64-preview.png')
(folder/'delivery.json').write_text(json.dumps({'costumes':len(catalog),'sizes':[64,128,256],'files':report},indent=2),encoding='utf-8')
print('Built',len(catalog),'reviewed costume icons;',len(report),'WebP files')
