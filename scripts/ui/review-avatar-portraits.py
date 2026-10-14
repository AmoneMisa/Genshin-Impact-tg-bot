"""Contact sheet for visual QA; never used as a game asset."""
import json
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
root=Path(__file__).resolve().parents[2]
directory=root/'art-source/avatars/portraits'
jobs=json.loads((directory/'jobs.json').read_text(encoding='utf-8-sig'))
sheet=Image.new('RGB',(1200,800),(18,22,32))
draw=ImageDraw.Draw(sheet)
for index,job in enumerate(jobs):
    file=root/job['source']
    if not file.exists(): continue
    with Image.open(file) as source:
        image=source.convert('RGBA')
        x=(index%6)*200;y=(index//6)*400
        large=ImageOps.contain(image,(192,240),Image.Resampling.LANCZOS)
        sheet.paste(large,(x+4,y+25),large)
        draw.text((x+6,y+5),job['key'],fill='white')
        small=ImageOps.contain(image,(48,48),Image.Resampling.LANCZOS)
        for offset,color in [(4,(18,22,32)),(64,(239,232,217))]:
            sheet.paste(color,(x+offset,y+290,x+offset+48,y+338))
            sheet.paste(small,(x+offset,y+290),small)
        print(job['key'],image.size,'alpha',image.getchannel('A').getextrema())
sheet.save(directory/'review.jpg',quality=90)
