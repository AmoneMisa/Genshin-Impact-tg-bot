"""Persist the all-reference queue, source outputs, visual-review status and previews.

Generation itself uses the built-in imagegen tool. This helper only copies source
files and prepares QA composites; it does not repaint or remove backgrounds.
"""
import argparse
import hashlib
import json
import shutil
import os
import tempfile
import time
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'art-source/avatars/collections'
RACES = ['human', 'elf', 'darkElf', 'orc', 'dwarf', 'kamael']

def read(name):
    return json.loads((BASE / name).read_text(encoding='utf-8-sig'))

def write(name, value):
    target = BASE / name
    temporary = target.with_name(target.stem+'.'+str(os.getpid())+'.pending.json')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    # Windows readers and file scanning may briefly hold the destination open.
    for attempt in range(20):
        try:
            temporary.replace(target)
            break
        except PermissionError:
            if attempt==19:raise
            time.sleep(.05)

def update_progress(jobs):
    reviewed = [j['key'] for j in jobs if j['status'] in ('reviewed', 'reused')]
    write('reviewed.json', reviewed)
    old = read('progress.json')
    progress = {'total': len(jobs), 'reused': sum(j['status']=='reused' for j in jobs),
        'generated': sum(j['status']=='reviewed' for j in jobs),
        'awaitingReview': sum(j['status']=='generated' for j in jobs),
        'pending': [j['key'] for j in jobs if j['status']=='pending'],
        'allComplete': len(reviewed)==len(jobs), 'date':__import__('datetime').date.today().isoformat()}
    for key in ('delivered', 'webpFiles'):
        if key in old:
            progress[key] = old[key]
    write('progress.json', progress)
    themes = read('remaining-reference-themes.json')
    for theme in themes:
        variants = [j for j in jobs if j['costumeId']==theme['costumeId']]
        theme['status'] = 'reviewed' if len(variants)==6 and all(j['status'] in ('reviewed','reused') for j in variants) else 'pending'
    write('remaining-reference-themes.json', themes)
    inventory = read('reference-inventory.json')
    complete = {j['costumeId'] for j in jobs if sum(x['costumeId']==j['costumeId'] and x['status'] in ('reviewed','reused') for x in jobs)==6}
    for entry in inventory:
        entry['status'] = 'reviewed' if entry['themeIds'] and all(t in complete for t in entry['themeIds']) else 'pending'
    write('reference-inventory.json', inventory)
    print(json.dumps({'reviewedVariants':len(reviewed),'totalVariants':len(jobs),
        'pendingVariants':len(progress['pending']), 'awaitingReview':progress['awaitingReview'],
        'remainingThemes':sum(t['status']!='reviewed' for t in themes)},ensure_ascii=False))

def anatomy(race, gender, index):
    if race=='human':
        return 'Adult human with natural human ears and mature natural proportions. Hair suited to outfit: ' + (['short chestnut waves','short dark swept-back hair','neat ash-brown tied hair'][index%3] if gender=='male' else ['long champagne-blond loose braid','soft dark auburn curls','ink-black shoulder-length waves'][index%3]) + '.'
    if race=='elf':
        return 'Classic L2 light elf: pale ivory skin, mature delicate face, small almond eyes, long pointed ears, tall slender build; silver-blond hair ' + ['in a low tail','in a loose side braid','straight behind shoulders'][index%3] + '. Keep racial face from identity guide.'
    if race=='darkElf':
        return 'Classic L2 dark elf: cool blue-gray skin, angular mature face, small almond eyes, long pointed ears, tall lean build; silver-white hair ' + ['swept to one side','in a low ponytail','in a shoulder-length straight cut'][index%3] + '. Keep racial face from identity guide.'
    if race=='orc':
        return 'Classic L2 orc: green skin, small visible tusks, pointed ears, strong mature face, broad powerful athletic frame; dark braided hair or high braided knot matching costume. NOT slender human anatomy. Preserve racial face.'
    if race=='dwarf':
        if gender=='male':
            return 'Adult elderly L2 dwarf: bald crown, large head relative to body, white brows and thick white beard, very broad compact torso, short stocky arms and VERY SHORT thighs and shins. Four-to-five-head figure proportions, not a shrunken human or normal human legs. Refit all garments/cape to short body; full boots visible. Beard may have neat short braids.'
        return 'L2 dwarf female: petite compact gamine racial proportions, large relative head, narrow shoulders, short slender arms and VERY SHORT legs, amber eyes and auburn twin ponytails or short twin braids. NEVER curvy/stocky torso or tall human. CLOSED HIGH-NECK opaque long-sleeved outfit, plain covered bodice, knee-length opaque skirt or fully covered compact armor. NO bust cups, cleavage, bare midriff, thigh slit, corset display or lingerie. Preserve racial face and comfortable small boots.'
    return 'Classic L2 Kamael: pale skin, angular mature face, small almond eyes, long pointed ears, lean build; ' + ('short silver-pink hair' if gender=='male' else 'HIGH white-pink ponytail with side-swept fringe') + '. EXACTLY ONE natural ivory-white feathered wing on anatomical LEFT shoulder blade, viewer right, completely visible. Never a second wing or accessories on feathers. All other source wing motifs become CLOTH CAPE texture/panels only, no extra wings. Clothes tailored around wing.'

def init():
    jobs = read('jobs.json')
    existing = {j['key'] for j in jobs}
    for index, theme in enumerate(read('remaining-reference-themes.json')):
        reference = ROOT / theme['clothingReference']
        reference.parent.mkdir(parents=True, exist_ok=True)
        if not reference.exists():
            shutil.copyfile(theme['originalReference'], reference)
        for race in RACES:
            key = theme['costumeId']+'-'+race+'-'+theme['gender']
            if key in existing:
                continue
            identity = 'art-source/avatars/' + ('rogue-'+theme['gender']+'.png' if race=='human' else 'races/'+race+'-'+theme['gender']+'.png')
            prompt = ('Use case: stylized-concept. Asset: original full-body decorative racial RPG costume cutout. '
                'Image 1 is CLOTHING reference only; follow ONLY the specified figure/region. Image 2 guides racial anatomy and refined painted style, not clothes, pose or hairstyle. '
                'Costume '+theme['name']+'. EXACT clothing motif to adapt: '+theme['design']+' '
                + anatomy(race,theme['gender'],index)+' '
                'One '+theme['gender']+' wearer, mature racial face, hand-painted Korean royal fantasy quality matching identity image. '
                'Same recognizable costume colors and garment construction across all races, proportionally tailored. '
                'Tasteful skin-specific pose and accessories if listed in design; natural hands and grasp, no oversized props obscuring body. '
                'Exactly TWO arms and TWO legs, one head; no mannequin, no other characters. Keep face/ears visible where possible; helmets/headpieces are costume accessories. '
                'No extra anatomical wings; wing motifs on non-Kamael costumes become coat/mantle panels. '
                'Entire head hair crown/hat hands garment hem BOTH feet and every prop/wing inside portrait 1024x1536 with 8 percent transparent padding on ALL sides. '
                'TRUE transparent alpha: no background floor scene gradient haze or external glow. Highlights confined to clothing and jewels. '
                'No text, letters, numbers, signature, watermark, UI or spiders. Do not reproduce source screenshot controls or labels. '
                'This is a uniquely named custom costume adaptation, not an original L2 item icon or exact client armor.')
            jobs.append({'key':key,'costumeId':theme['costumeId'],'name':theme['name'],'race':race,'gender':theme['gender'],
                'source':'art-source/avatars/collections/'+key+'.png','clothingReference':theme['clothingReference'],
                'originalReference':theme['originalReference'],'identityReference':identity,'partialReference':theme['partialReference'],
                'referenceDesign':theme['design'],'status':'pending','prompt':prompt})
    write('jobs.json',jobs)
    update_progress(jobs)

def record(key, generated):
    jobs = read('jobs.json')
    job = next(j for j in jobs if j['key']==key)
    assert job['status']=='pending', 'Refusing to overwrite a generated/reviewed source'
    source = Path(generated)
    with Image.open(source) as im:
        assert im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0, 'Missing transparency'
    target = (ROOT / job['source']).resolve()
    assert ROOT in target.parents, 'Unexpected outside source'
    # Resume safely if a previous copy succeeded but its queue write was held.
    if target.exists():
        assert target.read_bytes()==source.read_bytes(), 'Refusing to replace a different source'
    else:
        shutil.copyfile(source,target)
    job.update(status='generated',generatedPath=str(source),generationReferences=job.get('referenceImages',[job['clothingReference'],job['identityReference']]))
    write('jobs.json',jobs)
    update_progress(jobs)

def preview(theme_id):
    group = [j for j in read('jobs.json') if j['costumeId']==theme_id]
    assert len(group)==6 and all(j['status'] in ('generated','reviewed') for j in group)
    canvas = Image.new('RGB',(1200,720),'#111725')
    draw = ImageDraw.Draw(canvas)
    for index,job in enumerate(group):
        with Image.open(ROOT / job['source']) as im:
            assert im.mode=='RGBA'
            low,high=im.getchannel('A').getextrema()
            assert low==0 and high>=250
            scaled=ImageOps.contain(im,(190,310))
            canvas.paste(scaled,(index*200,10),scaled)
            canvas.paste(Image.new('RGB',(200,360),'#f6efdf'),(index*200,360))
            canvas.paste(scaled,(index*200,370),scaled)
        draw.text((index*200+8,330),job['race'],fill='white')
    target=BASE / (theme_id+'-review.jpg')
    canvas.save(target,quality=88)
    print(str(target))

def revise(key, generated, prompt_file):
    jobs=read('jobs.json')
    job=next(j for j in jobs if j['key']==key)
    assert job['status']=='generated', 'Revise unaccepted art only'
    with Image.open(generated) as im:
        assert im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0
    job.setdefault('revisions',[]).append({k:job.get(k) for k in ('source','prompt','generatedPath','generationReferences')})
    target=Path(job['source']).with_name(key+'-v'+str(len(job['revisions'])+1)+'.png')
    assert not (ROOT / target).exists()
    shutil.copyfile(generated,ROOT / target)
    job.update(source=target.as_posix(),generatedPath=generated,prompt=Path(prompt_file).read_text(encoding='utf-8'),
        generationReferences=[job['revisions'][-1]['source']])
    write('jobs.json',jobs)
    update_progress(jobs)

def accept(theme_id):
    jobs=read('jobs.json')
    group=[j for j in jobs if j['costumeId']==theme_id]
    assert len(group)==6 and all(j['status']=='generated' for j in group)
    assert (BASE / (theme_id+'-review.jpg')).exists(), 'Prepare and visually inspect preview before accepting'
    for job in group:
        job.update(status='reviewed',review='Visually accepted: costume/reference motif, racial anatomy, complete silhouette and props; navy/ivory alpha composite inspected. Custom adaptations, with cropped-source extension explicitly marked where applicable.')
    write('jobs.json',jobs)
    update_progress(jobs)

parser=argparse.ArgumentParser()
parser.add_argument('action',choices=['init','record','preview','accept','summary','revise'])
parser.add_argument('key',nargs='?')
parser.add_argument('generated',nargs='?')
parser.add_argument('--prompt-file')
args=parser.parse_args()
# Multiple independent image generations may finish together. Serialize the
# complete read/modify/write operation so no accepted painting gets lost.
with open(Path(tempfile.gettempdir())/'genshin-costume-queue.lock','a+b') as lock:
    if lock.tell()==0:lock.write(b'0');lock.flush()
    lock.seek(0)
    if os.name=='nt':
        import msvcrt
        msvcrt.locking(lock.fileno(),msvcrt.LK_LOCK,1)
    else:
        import fcntl
        fcntl.flock(lock,fcntl.LOCK_EX)
    try:
        if args.action=='init': init()
        elif args.action=='record': record(args.key,args.generated)
        elif args.action=='preview': preview(args.key)
        elif args.action=='accept': accept(args.key)
        elif args.action=='revise': revise(args.key,args.generated,args.prompt_file)
        else: update_progress(read('jobs.json'))
    finally:
        lock.seek(0)
        if os.name=='nt':msvcrt.locking(lock.fileno(),msvcrt.LK_UNLCK,1)
        else:fcntl.flock(lock,fcntl.LOCK_UN)
