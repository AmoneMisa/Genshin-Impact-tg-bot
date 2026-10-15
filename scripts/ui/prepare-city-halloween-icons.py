"""Prepare matching empty-garment icons for the nine original new briefs."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'art-source/avatars'
jobs=json.loads((BASE/'collections/jobs.json').read_text(encoding='utf-8-sig'))
ids=json.loads((BASE/'collections/city-halloween-theme-ids.json').read_text(encoding='utf-8'))
file=BASE/'shop-icons/jobs.json';icons=json.loads(file.read_text(encoding='utf-8'))
old={j['costumeId'] for j in icons}
for job in jobs:
    cid=job['costumeId']
    if cid not in ids or job['race']!='human' or cid in old:continue
    background='violet' if cid in {'chrome-district','brass-meridian','off-duty-avenue','moonveil-phantom'} else 'brown'
    colour='#21132f' if background=='violet' else '#251812'
    prompt=(f'Use case: stylized-concept. Create ONE square 1:1 fantasy RPG shop item icon for the original custom costume {job["name"]}. '
      'Image 1 is the EXACT GARMENT reference, not a portrait or character reference. Image 2 is ONLY the established icon PAINTING STYLE reference; do NOT copy its red dress, ornament or color palette. '
      'Repaint the actual clothing from image 1 as an entirely EMPTY garment set floating without a wearer. Preserve the actual colors, materials, practical construction, hood/collar, coat or skirt panels and distinctive costume details. '
      'Compact centered square composition, the garment occupies about 85 percent of the square, refined hand-painted RPG icon finish, simplified readable detail at 64 pixels, clean silhouette and soft ivory rim lighting. '
      f'Fully opaque very dark {background} background ({colour}) with faint central vignette and square corners. '
      'No person, face, human skin, hair, fingers, limbs or visible mannequin anywhere. Neckline, hood and cuffs must be EMPTY DARK HOLES showing the background, never pale skin-shaped filler or a mannequin. '
      'Only real garment surfaces, seams, metal fittings and fabric. No weapons or unrelated objects, no text, logo, lettering, frame, border, scenery, smoke or particles. '
      'This is custom cosmetic art, not an original Lineage II item icon. ')
    if cid=='off-duty-avenue':prompt+='Show exactly the plain ivory T-shirt with blue jeans and a black belt: no coat or armor and no person inside. Keep their ordinary modern shape, separate empty neck and cuffs, white sneakers optional below.'
    if cid=='hollow-lantern-rider':prompt+='Keep the empty black riding coat, burgundy-lined cape and riding boots. A small carved orange jack-o-lantern COSTUME HEADPIECE sits immediately above the collar as an empty wearable pumpkin mask, matching the actual pumpkin head in the costume reference. No human head, skin, neck stump, separate hand-held lantern or wearer.'
    if cid=='last-bell-reaper':prompt+='Keep the dark hood and tattered silver-gray robe hems. The bone-white theatrical SKULL MASK may remain inside the hood as an EMPTY mask item, no person or real skull; no scythe in this icon.'
    if cid=='moonveil-phantom':prompt+='Keep the ragged OPEN hood, layered pearl-gray and icy ivory robe, long shredded sleeve and skirt strips, and luminous cyan-white torn fabric edges. Empty dark hood with NO face, hair, person or mannequin. Absolutely no cartoon bedsheet ghost or two eye holes in a sheet.'
    if cid=='obsidian-gloss':prompt+='Only the closed glossy black high-neck jacket, matching trousers, low ankle boots and plum scarf from the reference. Non-sexual ordinary fashion presentation, no lingerie, harnesses, cutouts, skin or body contours filled with a mannequin.'
    refs=[job['source'],'art-source/avatars/shop-icons/crimson-dawn.png']
    icons.append(dict(costumeId=cid,name=job['name'],gender=job['gender'],background=background,
      reference=job['source'],generationReferences=refs,generationTool='built-in imagegen',
      source=f'art-source/avatars/shop-icons/{cid}.png',prompt=prompt,status='pending'))
file.write_text(json.dumps(icons,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(BASE/'shop-icons/city-halloween-icon-ids.json').write_text(json.dumps(ids,indent=2)+'\n',encoding='utf-8')
print('Prepared nine matching shop icons')
