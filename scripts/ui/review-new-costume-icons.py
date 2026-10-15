"""Check delivered icon images and show the current additions at actual UI sizes."""
import argparse,json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parents[2]
folder=root/'art-source/avatars/shop-icons'
jobs=json.loads((folder/'jobs.json').read_text(encoding='utf-8'))
parser=argparse.ArgumentParser()
parser.add_argument('--ids-file',default='new-icon-ids.json')
parser.add_argument('--prefix',default='new-icons')
args=parser.parse_args()
ids=json.loads((folder/args.ids_file).read_text(encoding='utf-8'))
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',12)
reviewed=[job for job in jobs if job['status']=='reviewed']
for job in reviewed:
    for size in (64,128,256):
        file=root/f"webapp/art/avatars/shop-icons/v1/{job['costumeId']}-{size}.webp"
        with Image.open(file) as im:
            assert im.size==(size,size),file
            assert im.convert('RGBA').getchannel('A').getextrema()==(255,255),file
        assert file.stat().st_size<size*250,file

for size in (64,128):
    cell=size+32;row=size+48
    sheet=Image.new('RGB',(cell*5,row*((len(ids)+4)//5)),'#121017')
    draw=ImageDraw.Draw(sheet)
    for i,key in enumerate(ids):
        job=next(job for job in jobs if job['costumeId']==key)
        assert job['status']=='reviewed',key
        x=i%5*cell;y=i//5*row
        with Image.open(root/f'webapp/art/avatars/shop-icons/v1/{key}-{size}.webp') as im:
            sheet.paste(im,(x+16,y+4))
        words=job['name'].split();lines=['']
        for word in words:
            if draw.textlength(lines[-1]+' '+word,font=font)>cell-8:lines.append(word)
            else:lines[-1]=(lines[-1]+' '+word).strip()
        for line,text in enumerate(lines[:2]):draw.text((x+4,y+size+8+line*15),text,font=font,fill='#eee2cc')
    sheet.save(folder/f'{args.prefix}-{size}-preview.png')
print('Verified',len(reviewed),'icons at three sizes; prepared previews for',len(ids),'new costumes')
