"""Persist one built-in image edit per unique published Kamael painting."""
import json
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
ROOT=Path(__file__).resolve().parents[2]
FOLDER=ROOT/'art-source/avatars/kamael-capes'
FOLDER.mkdir(parents=True,exist_ok=True)
BASE=ROOT/'art-source/avatars/collections'
jobs=json.loads((BASE/'jobs.json').read_text(encoding='utf-8-sig'))
reviewed=set(json.loads((BASE/'reviewed.json').read_text(encoding='utf-8-sig')))
references=['art-source/avatars/collections/user-references/kamael-wing-cape-structure-01.png',
            'art-source/avatars/collections/user-references/kamael-wing-cape-structure-02.png']
requests=[]
for job in jobs:
    if job['key'] not in reviewed or job['race']!='kamael':continue
    key=job['key']
    existing=job['costumeId']=='meadow-flutter' or job.get('capeIntegrated',False)
    casual=job['costumeId'] in ['saltwind-corsair','quiet-rooftop','cobblestone-sunday','seabreeze-holiday','cozy-reef','hearthside-purr','moonlit-mischief']
    finish=('Use a small plain brass/silver wing-shaped fitting and matte cloth in the costume palette; keep it restrained and practical, without a large gemstone or new luxury armor.' if casual else
            'Match the rigid wing ornament to the existing garment metal, gold or silver, and match the narrow silk banner to the existing costume colors and embroidery. One small matching brooch is acceptable.')
    prompt=(
        'Use case: precise-object-edit. EDIT ONLY one additional back cape accessory on the EXACT Kamael in Image 1. '
        'Images 2 and 3 are the USER STRUCTURE REFERENCE: a SMALL RIGID wing-shaped shoulder ornament '
        'with a long NARROW VERTICAL rectangular CLOTH BANNER hanging BELOW it toward the knee. '
        'Add this compact one-sided Kamael wing-cape on VIEWER LEFT, opposite the natural white wing. '
        'The rigid wing ornament stays near the upper back/shoulder, never above the head. The narrow '
        'banner hangs with gravity, vertical folds and a fabric hem; about one forearm wide, close '
        'to the body, visibly behind the arm. It is not a second anatomical wing, not a spread '
        'butterfly fan, not an enormous full-width cloak. '+finish+' '
        'Keep the SAME SINGLE natural WHITE FEATHER WING on viewer RIGHT EXACTLY UNCHANGED. '
        'Preserve the EXACT identity, face, eyes, pointed ears, hairstyle, gender, body proportions, '
        'stance, hand gestures, all fingers, footwear, clothes, existing skirt and coat tails, '
        'hats, spectacles and EVERY held object in Image 1. Do not simplify or redesign the outfit. '
        'Do not move, mirror, recenter, rescale or re-pose the wearer: keep all anatomical features '
        'at the SAME positions on the SAME 1024x1536 canvas, because the original pose is animated. '
        'The only changed pixels should belong to the new wing ornament and hanging cloth behind '
        'the wearer. Keep the original refined painted style and matching illumination. '
        'Entire hair, both feet, original natural wing, props and new cape fit inside transparent '
        'margins. TRUE TRANSPARENT ALPHA; no background, ground, gradient, external glow, text, '
        'watermarks or spiders. Do not copy screenshot characters, armor, logos, UI or scenery. '
        'This is an original custom cosmetic accessory adapted to the user cape construction.')
    aliases=[]
    if key=='violet-courtier-kamael-male':aliases=['kamael-male']
    if key=='crimson-dawn-kamael-female':aliases=['kamael-female']
    requests.append(dict(key=key,name=job['name'],costumeId=job['costumeId'],gender=job['gender'],
                         inputSource=job['source'],source=job['source'] if existing else f'art-source/avatars/kamael-capes/{key}.png',
                         references=[job['source']]+references,prompt=job['prompt'] if existing else prompt,
                         status='reviewed' if existing else 'pending',defaultAliases=aliases,
                         review=job.get('review') if existing else None))
target=FOLDER/'jobs.json'
if target.exists():
    previous={j['key']:j for j in json.loads(target.read_text(encoding='utf-8'))}
    for job in requests:
        old=previous.get(job['key'],{})
        for field in ['inputSource','source','generatedPath','status','review','revisionHistory','prompt','references','generationMode']:
            if field in old:job[field]=old[field]
target.write_text(json.dumps(requests,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for start in range(0,len(requests),6):
    sheet=Image.new('RGB',(1536,416),'#121926');d=ImageDraw.Draw(sheet)
    for i,j in enumerate(requests[start:start+6]):
        im=Image.open(ROOT/j['inputSource']).convert('RGBA')
        im=ImageOps.contain(im,(230,345))
        sheet.paste(im,(i*256+(256-im.width)//2,32+(384-im.height)//2),im)
        d.text((i*256+3,3),str(start+i)+' '+j['key'],fill='white')
    sheet.save(FOLDER/f'inputs-{start//6:02d}.jpg',quality=95)
print(len(requests),'costumes +',sum(len(j['defaultAliases']) for j in requests),'matching base avatars;',sum(j['status']=='pending' for j in requests),'edits remaining')
