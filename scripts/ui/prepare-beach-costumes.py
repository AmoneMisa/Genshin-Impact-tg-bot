"""Persist two adult beach costume briefs and twelve racial generation jobs."""
import json
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'art-source/avatars/collections'
RACES=['human','elf','darkElf','orc','dwarf','kamael']
BRIEFS=[
 ('coral-bay-breeze','Coral Bay Breeze','female',
  'An ordinary opaque coral-red two-piece BIKINI: simple halter bikini top and standard full-coverage bikini bottoms, '
  'bare midriff, no skirt, no shorts, no shirt or cover-up. Wide-brim straw sunhat with a teal ribbon, flat beach sandals. '
  'Carry one compact teal-and-ivory inflatable swim ring upright BESIDE the viewer-left hip, held by the left hand; '
  'the ring does not encircle or conceal the torso. Relaxed neutral standing beach pose, right arm naturally free.'),
 ('high-tide-rider','High Tide Rider','male',
  'Classic opaque navy-blue fitted swimming BRIEFS with a narrow teal waistband, proper ordinary swimsuit coverage; '
  'bare chest and legs, no shirt, armor, trousers or long board shorts. Simple straw beach bucket hat, flat beach sandals. '
  'Carry one short ivory-and-teal SURFBOARD upright at viewer LEFT beside the body, one hand gripping its edge near the hip. '
  'Board is about shoulder-to-ankle height and narrow, a clearly separate sporting prop, not behind or through limbs. '
  'Relaxed neutral standing beach pose with the other arm naturally free.'),
]
ANATOMY={
 'human':'A clearly mature adult human, about 30 years old, natural human ears and adult facial features.',
 'elf':'A clearly mature adult L2 light elf, pale ivory skin, long pointed ears, slender adult frame, silver-blond hair.',
 'darkElf':'A clearly mature adult L2 dark elf, cool blue-gray skin, long pointed ears, angular adult face, silver-white hair.',
 'orc':'A clearly mature adult L2 orc, green skin, small tusks, pointed ears, broad powerful adult build and dark braided hair.',
 'dwarf':'A clearly mature adult DWARF, about 35-50 years old, very short limbs and unmistakably adult face. '
         'Female: MINIATURE SLENDER adult woman with narrow shoulders, slim waist, short slim adult limbs, mature adult facial structure and auburn braid. '
         'NOT heavyset, bulky or thick-waisted; NOT childlike, gamine, teen, chibi, doll or oversized baby head. '
         'Male: broad elderly dwarf with a white beard, adult stocky torso and very short legs. Do not turn either into a tall human.',
 'kamael':'A clearly mature adult L2 Kamael, pale skin, pointed ears, angular adult face; male short silver-pink hair, female high white-pink ponytail. '
          'Exactly ONE natural white feather wing on viewer RIGHT. Add a compact WING-CAPE on viewer LEFT: a small rigid plain brass wing ornament '
          'at the back shoulder with a narrow VERTICAL cloth banner hanging below to the upper thigh, matching the beach outfit. '
          'It stays behind the wearer, separate from ring/board and the natural wing. It is NOT a spread fan or second anatomical wing. '
          'Use the supplied wing-cape screenshots only for accessory structure; no armor or screenshot scenery.',
}
def read(name):return json.loads((BASE/name).read_text(encoding='utf-8-sig'))
jobs,themes=read('jobs.json'),read('remaining-reference-themes.json');existing={j['key'] for j in jobs}
for cid,name,gender,brief in BRIEFS:
 master=f'art-source/avatars/collections/{cid}-human-{gender}.png'
 if not any(t['costumeId']==cid for t in themes):
  themes.append(dict(costumeId=cid,name=name,gender=gender,originalReference=master,clothingReference=master,
                     partialReference=False,design=brief,status='pending',sourceType='user-original-brief',
                     requested='2026-10-15',referencesDesktopImage=False))
 for race in RACES:
  key=f'{cid}-{race}-{gender}'
  if key in existing:continue
  identity=f'art-source/avatars/collections/{"seabreeze-holiday" if gender=="female" else "saltwind-corsair"}-{race}-{gender}.png'
  # The established female dwarf reference is deliberately not an adult swimsuit
  # identity guide. This variant is a new visibly mature adult dwarf character.
  refs=[identity] if race=='human' else [master] if race=='dwarf' and gender=='female' else [master,identity]
  guide=('Image 1 guides only mature wearer identity and refined painted style; replace the clothes completely.' if race=='human' else
         'Image 1 is the adult human BEACH CLOTHING and art-style reference; refit that same design to the specified race. '+
         ('Create a NEW visibly mature adult dwarf woman; no childlike identity reference is supplied.' if race=='dwarf' and gender=='female' else
          'Image 2 guides only mature racial identity, skin and ears, not its original outfit or props.'))
  if race=='kamael':
   refs += ['art-source/avatars/collections/user-references/kamael-wing-cape-structure-01.png',
            'art-source/avatars/collections/user-references/kamael-wing-cape-structure-02.png']
  prompt=(f'Use case: stylized-concept. Asset: full-body original RPG cosmetic {name}. {guide} '
          f'Primary request: {brief} Wearer: one clearly ADULT {gender}. {ANATOMY[race]} '
          'Non-sexual swimwear catalogue presentation, neutral natural expression and posture, no suggestive pose or emphasis on intimate areas. '
          'Keep both eyes visible beneath the hat. Exactly two arms, two legs, one head, natural hands and normal fingers. '
          'Refined hand-painted Korean fantasy style matching this game, soft daylight, restrained fabric and practical accessories. '
          'No extra anatomical wings on non-Kamael races. NO additional cape on non-Kamael races. '
          'Full body, hat, hair, all props, wings and BOTH feet completely inside a 1024x1536 portrait with 8% transparent margins on every side. '
          'TRUE TRANSPARENT ALPHA background, no floor, scenery, gradient, haze or external glow. '
          'No text, logos, watermarks, UI, weapons, spiders or extra people. This is a uniquely named custom outfit, not an original L2 item.')
  jobs.append(dict(key=key,costumeId=cid,name=name,race=race,gender=gender,source=f'art-source/avatars/collections/{key}.png',
                   clothingReference=master,originalReference=master,identityReference=identity,partialReference=False,
                   referenceDesign=brief,referenceImages=refs,sourceType='user-original-brief',status='pending',prompt=prompt))
for name,data in [('jobs.json',jobs),('remaining-reference-themes.json',themes)]:
 (BASE/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
refs=list(dict.fromkeys(j['identityReference'] for j in jobs if j['costumeId'] in [b[0] for b in BRIEFS] and not (j['race']=='dwarf' and j['gender']=='female')))
sheet=Image.new('RGB',(1320,840),'#151c29');draw=ImageDraw.Draw(sheet)
for n,path in enumerate(refs):
 im=ImageOps.contain(Image.open(ROOT/path).convert('RGBA'),(210,375));x=(n%6)*220;y=(n//6)*420
 sheet.paste(im,(x,y+25),im);draw.text((x,y+3),Path(path).stem,fill='white')
sheet.save(BASE/'beach-identity-references.jpg')
print('Saved two beach briefs and twelve variants')
