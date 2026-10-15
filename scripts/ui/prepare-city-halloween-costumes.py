"""Nine original user briefs, each fitted to all six races without replacing art."""
import json
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'art-source/avatars/collections'
BRIEFS=[
 ('chrome-district','Chrome District','female','Cyberpunk',
  'Practical CYBERPUNK street outfit: charcoal cropped technical jacket with a high collar and subtle cyan circuit piping, opaque graphite crew-neck shirt underneath, dark fitted utility trousers with pockets, gunmetal knee details, low sturdy tech boots. Small violet hair streak in a short asymmetrical bob. One compact wrist terminal; no firearms, no robot limbs, no goggles over the eyes. Fully clothed, grown-up urban adventurer. Relaxed front three-quarter standing pose, arms naturally down and slightly away from hips, both hands empty.'),
 ('obsidian-gloss','Obsidian Gloss','female','Latex',
  'A NON-SEXUAL fully covered black LATEX fashion outfit: tailored opaque glossy high-neck long-sleeved jacket, straight slim glossy black trousers, low ankle boots, tasteful silver zip and charcoal seam panels. A thin plum belt and a small matching scarf edge. Natural realistic clothing gloss, no exposed torso or thighs, no lingerie, corset, harness, fetish gear, cutouts, exaggerated anatomy or suggestive pose. Neat short dark hair. Neutral catalogue standing pose with two arms down, hands a little apart from the body.'),
 ('neon-afterglow','Neon Afterglow','female','Neon',
  'A distinct NEON dance-street costume: dark navy oversized bomber jacket with vivid magenta and electric-turquoise luminous fabric strips, opaque black high-neck top, a layered knee-length pleated skirt over opaque dark leggings, chunky flat sneakers. A loose narrow luminous ribbon from each sleeve, no floating particles or light beams. Silver hair in a high ponytail. Small glowing accents confined to clothing. Neutral energetic standing pose, one knee relaxed but both soles supported, arms down and apart, no item in hands.'),
 ('brass-meridian','Brass Meridian','male','Steampunk',
  'A practical STEAMPUNK explorer: dark brown knee-length frock coat with brass gears and restrained piping, cream collared shirt, copper waistcoat, leather belts and a small pocket-watch chain, charcoal trousers and sturdy brown boots. A compact brown top hat with brass goggles resting ABOVE the forehead, both eyes visible. One small closed leather notebook held at viewer RIGHT hip, other arm relaxed. No mechanical limbs, no weapon, no giant backpack. Restrained vintage brass-and-leather craftsmanship.'),
 ('off-duty-avenue','Off-Duty Avenue','male','City jeans and T-shirt',
  'Plain contemporary CITY clothing: medium blue straight-leg JEANS with realistic seams, an ordinary clean ivory short-sleeved crew-neck T-SHIRT with NO print or logo, simple black belt, casual white low sneakers with navy accents. No coat, armor, cape on non-Kamael, magical ornaments, weapons or big props. Short tidy chestnut hair. Relaxed adult everyday standing pose with both hands visible down beside the hips, fingers relaxed, not inside pockets. The simple T-shirt and jeans must remain unmistakable.'),
 ('midnight-formal','Midnight Formal','male','Classic black',
  'A CLASSIC BLACK formal tailored suit: matte black two-button blazer and matching straight trousers, crisp white collared shirt, narrow black tie, polished plain black Oxford shoes, one tiny silver tie bar. No ornate fantasy armor, no gold embroidery, no hat, weapon or cane. Tidy swept-back dark hair. Calm adult standing catalogue pose, jacket open just enough to read the shirt and tie, both arms relaxed down with visible hands. Refined restrained elegance.'),
 ('last-bell-reaper','Last Bell Reaper','male','Death costume',
  'A theatrical DEATH / GRIM REAPER costume: layered charcoal-black hooded robe with silver-gray tattered hems, dark belt, opaque bone-white decorative SKULL MASK with dark empty eye sockets, face entirely concealed, dark gloves and closed black boots. No real skull, wounds, blood or visible flesh. Hold a slender black scythe upright at VIEWER LEFT beside the body; its modest curved silver blade stays fully inside the portrait, never crosses the face. Viewer-right hand relaxed. This is a fully clothed Halloween masquerade costume, not an undead corpse. Separate soft robe strips readable for subtle motion.'),
 ('hollow-lantern-rider','Hollow Lantern Rider','male','Headless Horseman Halloween',
  'A HEADLESS HORSEMAN Halloween COSTUME WITH A PUMPKIN HEAD, standing on foot, NO horse: elegant black riding coat, deep burgundy lining and short riding cape, silver antique buckles, dark breeches, tall black riding boots and gloves. One carved orange JACK-O-LANTERN PUMPKIN sits on the shoulders above the collar AS THE HEAD, with warm amber light inside its carved eyes and grin. No human head, face, hair or neck stump, no blood. The pumpkin is attached as the costume head, not floating and not carried in a hand. Both gloved hands are empty and naturally down beside the body. No second pumpkin or hand-held lantern. Both boots supported and the entire pumpkin head inside the transparent portrait margins.'),
 ('moonveil-phantom','Moonveil Phantom','female','Ghost costume',
  'A spectral GHOST / WRAITH costume with visibly TORN GLOWING CLOTHING, not a bedsheet ghost: a layered pearl-gray and icy ivory high-neck long robe, ragged open hood, long torn bell sleeves and many narrow shredded cloth tails with cyan-white luminous edges. Clearly mature pale spectral female face visible beneath the ragged hood, both actual eyes visible, long wispy silver-white hair. A fully covered bodice and opaque pale underlayers keep the adult body covered beneath the torn outer fabric; no lingerie, exposed thighs or cleavage. Cold blue-white luminescence follows the actual fabric and torn seams, no large fog cloud or scene. Sleeve-covered arms slightly apart, relaxed pale gloved hands, both silver-gray closed boots visible and supported beneath the shredded hem. A haunting elegant spirit rather than a cartoon sheet with eye holes; no gore, skull mask or pumpkin.'),
]
RACES=['human','elf','darkElf','orc','dwarf','kamael']
ANATOMY={
 'human':'Clearly mature adult human, natural ears and realistic adult facial structure.',
 'elf':'Clearly mature adult light elf: pale ivory skin, long pointed ears, tall slender frame, silver-blond hair. Preserve small mature almond eyes.',
 'darkElf':'Clearly mature adult dark elf: cool blue-gray skin, long pointed ears, tall lean frame, angular adult face and silver-white hair.',
 'orc':'Clearly mature adult orc: green skin, small tusks, long pointed ears, broad powerful muscular build and dark braided hair. Never a slim human with green paint.',
 'dwarf':'Unmistakably SHORT adult DWARF with very short thighs, shins and arms. Male: elderly mature broad dwarf, white eyebrows and thick white beard. Female: MINIATURE SLENDER adult woman, narrow shoulders, slim waist and short slim limbs, mature adult face and auburn braid. NOT heavyset, bulky, chubby, childlike, baby-faced, chibi or a normal-height human. Refit all clothes to short adult dwarf proportions.',
 'kamael':'Clearly mature adult Kamael: pale skin, long pointed ears, lean adult frame, angular mature face. Male silver-pink hair; female high white-pink ponytail. Exactly ONE natural white feather wing at VIEWER RIGHT. Add a compact WING-CAPE at VIEWER LEFT: small rigid wing-shaped metal shoulder ornament above a narrow VERTICAL hanging cloth banner reaching the upper thigh. The banner matches this outfit and sits behind the arm; it is not a second spread feather wing. Keep natural white wing and narrow cloth banner separate, on opposite sides. The two construction screenshots guide only this accessory structure, not their armor or scenery.'}
def read(name):return json.loads((BASE/name).read_text(encoding='utf-8-sig'))
jobs=read('jobs.json');themes=read('remaining-reference-themes.json');existing={j['key'] for j in jobs}
for cid,name,gender,style,brief in BRIEFS:
 master=next((j['source'] for j in jobs if j['key']==f'{cid}-human-{gender}'),f'art-source/avatars/collections/{cid}-human-{gender}.png')
 if not any(t['costumeId']==cid for t in themes):
  themes.append(dict(costumeId=cid,name=name,gender=gender,originalReference=master,clothingReference=master,
    partialReference=False,design=brief,status='pending',sourceType='user-original-brief',requested='2026-10-15',
    referenceStyle=style,referencesDesktopImage=False))
 for race in RACES:
  key=f'{cid}-{race}-{gender}'
  if key in existing:continue
  identity=f'art-source/avatars/collections/{"cobblestone-sunday" if gender=="female" else "saltwind-corsair"}-{race}-{gender}.png'
  if race=='dwarf' and gender=='female':identity='art-source/avatars/collections/coral-bay-breeze-dwarf-female-v2.png'
  refs=[identity] if race=='human' else [master,identity]
  guide=('Image 1 guides only mature identity and hand-painted style; COMPLETELY replace its clothing and pose with the brief.' if race=='human' else
    'Image 1 is the exact newly designed CLOTHING and POSE reference; refit the same garment and stance to this race. Image 2 guides ONLY adult racial identity and anatomy, never its clothes, props or pose.')
  if race=='kamael':refs+=['art-source/avatars/collections/user-references/kamael-wing-cape-structure-01.png','art-source/avatars/collections/user-references/kamael-wing-cape-structure-02.png']
  hidden=cid in {'last-bell-reaper','hollow-lantern-rider'}
  face=('The requested skull mask or carved pumpkin head overrides any human face or hair in identity guides. Preserve racial body proportions.' if hidden else
    'Both actual eyes visible and readable, natural mature face, no opaque visor or sunglasses over the eyes.')
  head=('Exactly ONE carved pumpkin for the HEAD on the shoulders, no human head, no hand-held pumpkin.' if cid=='hollow-lantern-rider' else 'One head, exactly two arms, exactly two legs, natural hands.')
  prompt=(f'Use case: stylized-concept. Asset: original full-body RPG cosmetic {name}. {guide} Primary request: {brief} '
    f'One ADULT {gender} wearer. {ANATOMY[race]} {face} {head} '
    'Refined Korean fantasy hand-painted game-art finish matching references, softly lit fabric and clear compact silhouette, neutral non-sexual costume catalogue presentation. '
    'Full body and every hat, prop, wing and BOTH feet inside 1024x1536 portrait with at least 8 percent TRANSPARENT padding on ALL sides. '
    'TRUE transparent alpha, no floor, scenery, gradient, background haze, cast shadow or external glow. Light effects confined to clothing. '
    'No text, logos, letters, watermarks, UI, spiders or other characters. No anatomical wings on non-Kamael races. '
    'This is a uniquely named custom cosmetic, not an original Lineage II equipment item.')
  jobs.append(dict(key=key,costumeId=cid,name=name,race=race,gender=gender,source=f'art-source/avatars/collections/{key}.png',
    clothingReference=master,originalReference=master,identityReference=identity,partialReference=False,referenceDesign=brief,
    referenceImages=refs,sourceType='user-original-brief',referenceStyle=style,status='pending',prompt=prompt,
    faceConcealed=hidden))
for name,data in [('jobs.json',jobs),('remaining-reference-themes.json',themes)]:
 (BASE/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
ids=[b[0] for b in BRIEFS]
(BASE/'city-halloween-theme-ids.json').write_text(json.dumps(ids,indent=2)+'\n',encoding='utf-8')
identities=list(dict.fromkeys(j['identityReference'] for j in jobs if j['costumeId'] in ids))
sheet=Image.new('RGB',(1320,840),'#151c29');draw=ImageDraw.Draw(sheet)
for n,path in enumerate(identities):
 im=ImageOps.contain(Image.open(ROOT/path).convert('RGBA'),(210,375));x=n%6*220;y=n//6*420
 sheet.paste(im,(x,y+25),im);draw.text((x,y+3),Path(path).stem,fill='white')
sheet.save(BASE/'city-halloween-identity-references.jpg')
print('Prepared nine original themes / 54 variants')
