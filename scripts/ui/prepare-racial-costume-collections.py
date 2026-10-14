import json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
base=root/'art-source/avatars/collections';base.mkdir(exist_ok=True)
original=json.loads((root/'art-source/avatars/jobs.json').read_text(encoding='utf-8-sig'))
races=['human','elf','darkElf','orc','dwarf','kamael']
reuse={
 ('malachite-warden','elf'):'elf-male',('malachite-warden','orc'):'orc-male',
 ('azure-benediction','elf'):'elf-female',('veil-of-constellations','darkElf'):'darkElf-female',
 ('amethyst-envoy','darkElf'):'darkElf-male',('violet-courtier','kamael'):'kamael-male',
 ('dawn-emissary','dwarf'):'dwarf-male',
 ('crimson-dawn','orc'):'orc-female',('crimson-dawn','dwarf'):'dwarf-female',('crimson-dawn','kamael'):'kamael-female'}
anatomy={
 'human':'Preserve natural adult human anatomy and face.',
 'elf':'Preserve revised classic L2 light elf pale ivory skin, delicate fine face, small almond eyes, long pointed ears, straight platinum blond hair and slender build.',
 'darkElf':'Preserve revised classic L2 dark elf cool blue-gray skin, angular mature face, small almond eyes, long pointed ears, straight silver white hair and tall lean build.',
 'orc':'Preserve L2 orc green skin, strong mature facial structure, visible small tusks, pointed ears, dark hair and powerful athletic frame.',
 'dwarf':'Preserve corrected L2 dwarf racial proportions exactly: male broad elderly bald white-bearded stocky dwarf with short legs; female petite narrow-shouldered compact gamine dwarf with large relative head, short slender limbs, amber eyes and auburn twin ponytails. Never a shrunken human or a stocky/curvy dwarf woman.',
 'kamael':'Preserve corrected L2 Kamael pale skin, angular face, small almond eyes, pointed ears, lean adult build, short white/pink hair for male and HIGH white/pink ponytail with side-swept fringe for female. ONE natural ivory-white feathered wing on anatomical LEFT shoulder blade, never a second or decorated wing.'}
jobs=[]
for brief in original:
 gender=brief['key'].rsplit('-',1)[1]
 for race in races:
  key=brief['outfitId']+'-'+race+'-'+gender
  identity='art-source/avatars/'+('rogue-'+gender+'.png' if race=='human' else 'races/'+race+'-'+gender+'.png')
  job={'key':key,'costumeId':brief['outfitId'],'name':brief['name'],'race':race,'gender':gender,'source':'art-source/avatars/collections/'+key+'.png','clothingReference':brief['source'],'identityReference':identity,'status':'pending'}
  if race=='human':job.update(source=brief['source'],status='reused',reusedKey=brief['key'])
  elif (brief['outfitId'],race) in reuse:job.update(source='art-source/avatars/races/'+reuse[(brief['outfitId'],race)]+'.png',status='reused',reusedKey=reuse[(brief['outfitId'],race)])
  job['prompt']='Use case: precise-object-edit. Full-body adult '+race+' '+gender+' decorative costume variant, 1024x1536 TRUE transparent alpha. Image 1 is CLOTHING reference ONLY: reproduce the SAME custom outfit design, colors, embroidery, cloth panels and boots, adapted to racial build. Image 2 is WEARER IDENTITY/ANATOMY reference: preserve exact revised face, skin, hair, ears and racial silhouette, replace only its clothing with outfit 1. '+anatomy[race]+' Same custom costume '+brief['name']+' across all races; not a color swap or a generic similar outfit. For dwarves proportionally shorten hem and refit modest bodice; armor helmet may hide part of face but racial build stays clear. Empty hands, neutral front three-quarter standing pose, hand-painted Korean royal fantasy style. Entire head, ears, hair, hands, hem, both feet and wing if Kamael inside 8% padding. No weapons, extra wings/limbs, floor/background/haze/glow outside silhouette, text, logos, watermark or spiders. Never copy another reference racial anatomy.'
  jobs.append(job)
jobs.sort(key=lambda j:(j['costumeId']!='crimson-dawn',j['costumeId'],races.index(j['race'])))
(base/'jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(base/'reviewed.json').write_text(json.dumps([j['key'] for j in jobs if j['status']=='reused'],indent=2)+'\n',encoding='utf-8')
(base/'STATUS.md').write_text('# Costumes on all races\n\nUser confirmed each female costume on women of all six races and each male costume on men. Eight existing themes × six races = 48 full-body variants. 18 existing matching paintings reused; 30 missing variants queued. Same theme on all races; wearer anatomy from latest reviewed racial avatar. No wardrobe selector, prices or gameplay changes introduced by generation. Build accepted bodies only; portraits separately as needed. Temp references remain untouched.\n',encoding='utf-8')
print('48 variants; 18 reused; 30 pending')
