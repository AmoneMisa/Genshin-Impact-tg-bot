"""Prepare one image-generation request for each published custom costume."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
folder=root/'art-source/avatars/shop-icons';folder.mkdir(parents=True,exist_ok=True)
jobs=json.loads((root/'art-source/avatars/collections/jobs.json').read_text(encoding='utf-8-sig'))
reviewed=json.loads((root/'art-source/avatars/collections/reviewed.json').read_text(encoding='utf-8-sig'))
violet={'azure-benediction','dawn-emissary','gilded-dragon-mantle','malachite-warden',
        'starfrost-court','opal-tide','ivory-vows','gilded-veil','rose-etiquette',
        'emerald-griffin','astral-crown-knight','golden-phoenix','prism-dragon',
        'sandglass-dawn','starlit-reverie','snow-seraph','midnight-gold-envoy',
        'ashen-dragon-mantle','sapphire-diadem','seabreeze-holiday','cozy-reef',
        'hearthside-purr','meadow-flutter','coral-bay-breeze'}
requests=[]
for job in jobs:
    if job['key'] not in reviewed or job['race']!='human':continue
    slug=job['costumeId'];background='violet' if slug in violet else 'brown'
    colour='very dark muted eggplant violet (#21132f)' if background=='violet' else 'very dark chocolate brown (#251812)'
    prompt=(
        'Use case: stylized-concept. Create ONE square 1:1 fantasy RPG shop inventory icon for the CUSTOM costume '+slug+'. '
        'Image 1 is the exact GARMENT reference, not a character identity reference. '
        'Image 2, when supplied, is STYLE reference ONLY for the same coherent icon collection; NEVER copy its red gown or colours. '
        'Repaint the SAME garment as an EMPTY clothing item arranged on an invisible mannequin. '
        'Preserve its exact colours, materials, distinctive collar/shoulder shapes, embroidered motifs, gems, bodice or jacket, belt and cape/ruffled skirt design. '
        'Show the torso and its distinctive flowing lower cloth/panels together, shortened vertically into an attractive compact square silhouette; the clothing fills 86% of the square. '
        'No person, head, face, skin, hair, hands, legs, visible mannequin, pedestal, weapon, staff, shield, hat, fan, bouquet or separate accessories. '
        'Polished hand-painted high fantasy item icon, refined fine edges, soft gold/ivory rim lighting, readable material folds, coherent simplified details readable at 64 pixels, slight three-quarter presentation. '
        'Fully opaque '+colour+' background with a faint central vignette, clean square corners. '
        'No border, ornate frame, text, letters, numbers, UI, logo or watermark. No scenery, particles or smoky effects. '
        'The subject is a unique custom cosmetic, not an original Lineage II equipment item.')
    if slug in {'cozy-reef','hearthside-purr','moonlit-mischief'}:
        prompt+=' Preserve the animal-themed fabric hood (shark/cat/raccoon), ears or fins and attached cloth tail from the garment reference. These are EMPTY costume parts, not a living animal or a wearer. Hood opening and cuffs show dark background only.'
    if slug=='quiet-rooftop':
        prompt+=' Keep the assassin hood: it is part of the empty coat. Its entire opening is dark background, no face, eyes, mask-wearer or head.'
    if slug=='meadow-flutter':
        prompt+=' Keep the butterfly-pattern CLOTH cape panels attached to the empty dress. No anatomical feather wings and no person.'
    if slug=='coral-bay-breeze':
        prompt+=' The subject is ONLY the opaque coral two-piece bikini with its small fabric bows, displayed as two clearly EMPTY clothing pieces in a compact flat-lay. No body-shaped flesh, breasts, mannequin or person. Preserve the separate top and bottoms, dark background visible between them. Do not invent a dress or armor.'
    if slug=='high-tide-rider':
        prompt+=' The subject is ONLY the navy swimming briefs with their narrow teal waistband, displayed as an EMPTY neatly arranged garment. No torso, legs, skin, mannequin or person. No long shorts or trousers. A compact simple item icon, dark background visible around it.'
    requests.append({'costumeId':slug,'name':job['name'],'gender':job['gender'],'background':background,
        'reference':'webapp/art/avatars/collections/v1/'+job['key']+'-512.webp',
        'source':'art-source/avatars/shop-icons/'+slug+'.png','prompt':prompt,'status':'pending'})
target=folder/'jobs.json'
if target.exists():
    previous={j['costumeId']:j for j in json.loads(target.read_text(encoding='utf-8'))}
    for job in requests:
        old=previous.get(job['costumeId'],{})
        # Keep exact historical prompts and provenance of already prepared art.
        # New themes are appended without rewriting any accepted icon record.
        if old:job.clear();job.update(old)
target.write_text(json.dumps(requests,ensure_ascii=False,indent=2),encoding='utf-8')
print('Prepared',len(requests),'individual costume icon requests')
