"""Save the user's eight everyday costume briefs and per-race imagegen jobs.

Human paintings establish clothing references for the other five races. This
prepares metadata only; generation uses the built-in imagegen tool.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'art-source/avatars/collections'
RACES = ['human', 'elf', 'darkElf', 'orc', 'dwarf', 'kamael']
BRIEFS = [
    ('saltwind-corsair', 'Saltwind Corsair', 'male',
     'Grounded pirate captain: weathered brown leather tricorn, ivory linen shirt, '
     'worn navy short coat with rolled sleeves, oxblood waist sash, plain brass '
     'buckles, dark cropped trousers, practical brown sea boots, small belt pouch. '
     'No weapons or magic. One relaxed hand on belt, other resting naturally.'),
    ('quiet-rooftop', 'Quiet Rooftop', 'male',
     'Practical hooded assassin: deep charcoal linen hood, muted slate short '
     'shoulder cape, fitted layered leather jerkin, cloth forearm wraps, plain '
     'belt and two small pouches, dark trousers, soft leather boots. Face and '
     'eyes visible inside the hood; no mask over eyes. No blades or weapons. '
     'Subtle watchful three-quarter standing pose, hands away from torso.'),
    ('cobblestone-sunday', 'Cobblestone Sunday', 'female',
     'Grounded medieval town clothing: oatmeal linen blouse with full sleeves, '
     'sage-green buttoned waistcoat, rust-brown calf-length skirt, simple narrow '
     'belt and small leather satchel, brown ankle boots. Simple hair ribbon. '
     'Comfortable everyday materials, no armor, crown, gems or magic. '
     'Relaxed standing pose, one hand lightly on satchel strap.'),
    ('seabreeze-holiday', 'Seabreeze Holiday', 'female',
     'Tasteful practical seaside swimwear: opaque teal athletic one-piece '
     'swimsuit with ivory piping, matching loose mid-thigh swim shorts, open '
     'light cream linen beach overshirt, flat cork sandals. Straw sunhat '
     'worn on head. All races use exactly this covered sporty design, '
     'including petite dwarf: flat plain covered bodice, no bust shaping. '
     'Neutral relaxed standing pose, arms free at sides. No pinup, bikini, '
     'lingerie, transparent fabric, cleavage or sexual pose.'),
    ('cozy-reef', 'Cozy Reef', 'male',
     'Cozy gray-blue SHARK hooded kigurumi costume, soft fleece fully covering '
     'body, ivory belly panel, small dorsal fabric fin, short sewn tail, '
     'fabric triangular teeth edging hood above visible wearer face, '
     'tiny round dark embroidered shark eyes on hood. Two normal arms in '
     'sleeves, two normal legs with soft matching slippers. No animal paws '
     'or transformed anatomy. Gentle playful standing pose. No weapons.'),
    ('hearthside-purr', 'Hearthside Purr', 'female',
     'Cozy ginger tabby CAT hooded kigurumi: opaque soft caramel fleece '
     'one-piece suit, cream belly, simple darker tabby stripes, small triangular '
     'fabric ears on hood, sewn soft curved tail, mitten-like sleeve cuffs '
     'with visible human/racial fingers, two normal legs with fleece slippers. '
     'Visible recognizable wearer face inside hood. Fully covered body, '
     'loose comfortable fit, no cleavage, bust cups or lingerie. Gentle '
     'playful standing pose, arms slightly outward, no props.'),
    ('moonlit-mischief', 'Moonlit Mischief', 'male',
     'Cozy RACCOON hooded kigurumi: soft medium-gray opaque full-body fleece '
     'suit, cream belly, rounded fabric hood ears, black embroidered raccoon '
     'mask pattern ABOVE visible wearer face, wide sewn gray-black ringed '
     'tail, comfortable dark cuffs and slippers. Two normal arms and legs. '
     'Face unobscured, no animal transformation, no weapons. Relaxed '
     'slightly cheeky standing pose with empty hands.'),
    ('meadow-flutter', 'Meadow Flutter', 'female',
     'Lightweight BUTTERFLY festival costume: modest opaque periwinkle '
     'knee-length tunic dress with full sleeves, dark plum tights and soft '
     'ankle boots; delicate fabric butterfly motif, simple tiny antenna '
     'headband. Back cape made of two butterfly-shaped fabric halves in '
     'muted lavender, amber and black vein pattern, visibly sewn cloth '
     'attached at shoulders, no magic or extra anatomical wings. '
     'For Kamael specifically retain exactly ONE natural ivory feather wing '
     'on viewer RIGHT; the viewer LEFT butterfly half is a separate '
     'butterfly-shaped CLOTH CAPE creating the second wing-like silhouette, '
     'with visible fabric folds and hem. Do not put cloth on white feathers. '
     'Open relaxed standing pose with visible hands, no weapons.'),
]
ANATOMY = {
    'human': 'Mature adult human, natural human ears, realistic proportions.',
    'elf': 'Classic L2 light elf: pale ivory skin, long pointed ears, delicate mature face, tall slender body, silver-blond hair.',
    'darkElf': 'Classic L2 dark elf: cool blue-gray skin, long pointed ears, angular mature face, lean tall body, silver-white hair.',
    'orc': 'Classic L2 orc: green skin, small tusks, pointed ears, mature broad face, broad powerful athletic body, dark braided hair.',
    'dwarf': 'Classic L2 dwarf: very short legs and compact racial proportions, large relative head. Male: elderly broad stocky dwarf with thick white beard and white brows, bald crown. Female: petite gamine proportions, amber eyes, auburn twin ponytails, narrow shoulders, flat plain fully covered bodice, short modest outfit with opaque shorts/tights; no cleavage, slit, bust shaping or exposed midriff. Do not make a scaled-down tall human.',
    'kamael': 'Classic L2 Kamael: pale skin, angular mature face, pointed ears, slim body. Male short silver-pink hair, female high white-pink ponytail. EXACTLY ONE natural ivory-white feather wing attached at anatomical LEFT shoulder blade, viewer RIGHT, fully inside image; no second feather wing. Tailor clothes around the wing.',
}

def read(name):
    return json.loads((BASE / name).read_text(encoding='utf-8-sig'))

jobs, themes = read('jobs.json'), read('remaining-reference-themes.json')
existing = {j['key'] for j in jobs}
for costume_id, name, gender, design in BRIEFS:
    master = f'art-source/avatars/collections/{costume_id}-human-{gender}.png'
    if not any(t['costumeId'] == costume_id for t in themes):
        themes.append(dict(costumeId=costume_id, name=name, gender=gender,
                           originalReference=master, clothingReference=master,
                           partialReference=False, design=design, status='pending',
                           sourceType='user-original-brief',
                           requested='2026-10-15', referencesDesktopImage=False))
    for race in RACES:
        key = f'{costume_id}-{race}-{gender}'
        if key in existing:
            continue
        identity = 'art-source/avatars/' + (f'rogue-{gender}.png' if race == 'human' else f'races/{race}-{gender}.png')
        refs = [identity] if race == 'human' else [master, identity]
        guide = ('Image 1 guides ONLY painted art style and wearer identity; replace clothing completely.' if race == 'human' else
                 'Image 1 is the human CLOTHING design reference: preserve its garment construction and palette. Image 2 guides ONLY racial identity and painted style, not clothing. Refit clothes to this race.')
        prompt = (f'Use case: stylized-concept. Original decorative game costume {name}. {guide} '
                  f'Design: {design} Wearer: one {gender}. {ANATOMY[race]} '
                  'Refined hand-painted Korean fantasy character quality matching identity reference, '
                  'grounded cloth and leather with soft natural light. Full body standing from head '
                  'to BOTH feet, exactly two arms, two legs, one head, natural hands. '
                  'Race-specific ears, skin and face must be recognizable; hood frames face. '
                  'Portrait 1024x1536, entire costume, hair, hat, tail, cape and wing inside image '
                  'with at least 8 percent transparent margin on EVERY side. '
                  'TRUE TRANSPARENT ALPHA background: no floor, scenery, gradient, shadow cloud '
                  'or external glow. No letters, labels, text, UI, signature, watermark or spiders. '
                  'Original uniquely named custom costume, not an original L2 equipment item.')
        jobs.append(dict(key=key, costumeId=costume_id, name=name, race=race, gender=gender,
                         source=f'art-source/avatars/collections/{key}.png',
                         clothingReference=master, originalReference=master,
                         identityReference=identity, partialReference=False,
                         referenceDesign=design, referenceImages=refs,
                         sourceType='user-original-brief', status='pending', prompt=prompt))
for name, data in [('jobs.json', jobs), ('remaining-reference-themes.json', themes)]:
    (BASE / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Saved eight original briefs and 48 racial variants; existing paintings preserved')
