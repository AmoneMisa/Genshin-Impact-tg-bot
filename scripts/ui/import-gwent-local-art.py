"""Import the user's complete, labelled cards without cropping or repainting them.

python scripts/ui/import-gwent-local-art.py --source C:/Users/kubai/Desktop/cards
The source folder is read-only. WebP copies retain full resolution and transparency.
"""
from pathlib import Path
import argparse
import json
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, required=True)
parser.add_argument('--metadata-only', action='store_true')
args = parser.parse_args()
workspace = Path(__file__).resolve().parents[2]
destination = workspace / 'webapp/art/gwent/printed'
destination.mkdir(parents=True, exist_ok=True)

# Explicit visual matching, not inference from ordinal file names.
groups = {
 'Королевства севера': ('sev', {
  'poor-infantry':1, 'redanian-foot':[2,3], 'kaedweni-expert':[4,5,6], 'thaler':7,
  'yarpen':8,'sheldon':9,'blue-stripes':10,'dijkstra':11,'sabrina':12,'ves':13,
  'siegfried':14,'stennis':15,'keira':16,'sile':17,'crinfrid':18,'dun-banner-medic':19,
  'dethmold':20,'trebuchet':[21,22],'ballista':23,'siege-tower':24,'catapult':25,
  'vernon':'h1','esterad':'h2','john-natalis':'h3','philippa':'h4',
 }),
 'Монстры': ('mons', {
  'ghoul':[1,2,3],'nekker':[4,5,6],'botchling':7,'wyvern':8,'gargoyle':9,'endrega':10,
  'forktail':11,'celaeno-harpy':12,'harpy':13,'foglet':14,'arachas':[15,16,17],
  'garkain':18,'bruxa':19,'ekimmara':20,'fleder':21,'frightener':22,'griffin':23,
  'werewolf':24,'plague-maiden':25,'cockatrice':26,'katakan':27,'grave-hag':28,
  'ice-giant':29,'fiend':30,'crone-brewess':31,'crone-weavess':32,'crone-whispess':33,
  'earth-elemental':34,'fire-elemental':35,'arachas-behemoth':36,'toad':37,
  'kayran':'h1','draug':'h2','imlerith':'h3','leshen':'h4',
 }),
 'Нейтральные карты': ('neit', {
  'dandelion':1,'zoltan':2,'emiel':3,'vesemir':4,'villentretemerth':5,'gaunter':6,
  'gaunter-darkness':7,'olgierd':8,'cow':9,'cow-army':10,'avallach':'h1',
  'triss':'h2','yennefer':'h3','cirilla':'h4','geralt':'h5',
 }),
 'Нильфгаард': ('nilf', {
  'siege-support':1,'archer-support':[2,3],'vreemde':4,'nausicaa':5,'sweers':6,'albrich':7,
  'morteisen':8,'impera':9,'puttkammer':10,'rotten-mangonel':11,'rainfarn':12,'vattier':13,
  'vanhemar':14,'cynthia':15,'young-emissary':[16,17],'renuald':18,'zerrikanian-scorpion':19,
  'cahir':20,'fringilla':21,'assire':22,'combat-engineer':23,'shilard':24,'stefan':25,
  'black-archer':[26,27],'heavy-scorpion':28,'letho':'h1','menno':'h2','tibor':'h3','morvran':'h4',
 }),
 'Скеллиге': ('skel', {
  'kambi':1,'young-berserker':2,'young-vildkaarl':3,'birna':4,'draig-bon-dhu':5,'svanrige':6,
  'udalryk':7,'donar':8,'holger-blackhand':9,'blacksmith':10,'heymaey-skald':11,
  'drummond':[12,13,14],'light-longship':15,'berserker':16,'vildkaarl':17,'lugos-mad':18,
  'brokvar-archer':19,'lugos-blue':20,'war-longship':21,'craite':22,'pirate':23,'olaf':24,
  'myshovur':'h1','keris':'h2','hjalmar':'h3','heimdall':'h4','mardroeme':'spec1','storm-skellige':'spec2',
 }),
 'Скоятаэли': ('skoa', {
  'havekar-healer':[1,2,3],'riordain':4,'toruviel':5,'elven-skirmisher':[6,7,8],
  'dwarf-skirmisher':[9,10,11],'ciaran':12,'vrihedd-cadet':13,'dol-archer':14,
  'mahakaman':[15,16,17,18,19],'hav-support':[20,21,22],'vrihedd-brigade':[23,24],
  'dennis':25,'ida':26,'yaevinn':27,'filavandrel':28,'barclay':29,'dol-scout':[30,31,32],
  'milva':33,'schirru':34,'isengrim':'h1','eithne':'h2','saesenthessis':'h3','iorveth':'h4',
 }),
 'Специальные карты': ('spec', {
  'decoy':1,'commanders-horn':2,'scorch':3,'biting-frost':'p1',
  'impenetrable-fog':'p2','torrential-rain':'p3','clear-weather':'p4',
 }),
 'Лидеры': ('lid', {
  'foltest-temeria':'k1','foltest-lord':'k2','foltest-siegemaster':'k3','foltest-steel':'k4','foltest-medell':'k5',
  'eredin-bringer':'m1','eredin-king':'m2','eredin-destroyer':'m3','eredin-commander':'m4',
  'emhyr-rain':'n1','emhyr-emperor':'n2','emhyr-flame':'n3','emhyr-relentless':'n4','emhyr-conqueror':'n5',
  'francesca-frost':'s1','francesca-daisy':'s2','francesca-beautiful':'s3','francesca-queen':'s4','francesca-aen-seidhe':'s5',
  'king-bran':'sk1','crach':'sk2',
 }),
}
mapping, variants, provenance = {}, {}, {}
files = list(args.source.rglob('*.png'))
for source in files:
    relative = source.relative_to(args.source)
    # Safe ASCII project paths while preserving the source hierarchy in provenance.
    group = next((prefix for folder,(prefix,_) in groups.items() if relative.parts[0] == folder), 'backs')
    if group == 'backs':
        faction = {'Королевства Севера':'northern-realms','Нильфгаард':'nilfgaard','Скоятоэли':'scoiatael','Чудовища':'monsters'}[source.stem]
        variant = '2' if 'Вариант 2' in relative.parts else '1'
        name = f'back-{faction}-{variant}.webp'
        if variant == '1': mapping['back:'+faction] = '/art/gwent/printed/'+name
    else:
        name = source.stem+'.webp'
    if not args.metadata_only:
        with Image.open(source) as im:
            im.save(destination / name, 'WEBP', quality=92, method=6)
    provenance[name] = relative.as_posix()

for folder,(prefix, cards) in groups.items():
    for card, indices in cards.items():
        indices = indices if isinstance(indices,list) else [indices]
        paths = ['/art/gwent/printed/'+prefix+'_'+str(index)+'.webp' for index in indices]
        # Alternate paintings share the existing card ID, quantity and game rules.
        for index in indices:
            alternate = prefix+'_'+str(index)+'a.webp'
            if (destination / alternate).is_file(): paths.append('/art/gwent/printed/'+alternate)
        for file in paths:
            if not (workspace / 'webapp' / file.lstrip('/')).is_file(): raise ValueError(file)
        mapping[card] = paths[0]
        if len(paths)>1: variants[card] = paths

printed = [key for key in mapping if not key.startswith('back:')]
text = '// Generated by scripts/ui/import-gwent-local-art.py; full labelled user-supplied cards.\n'
text += 'export const LOCAL_GWENT_ART = Object.freeze('+json.dumps(mapping,ensure_ascii=False,indent=2)+');\n'
text += 'export const GWENT_PRINTED_CARDS = new Set('+json.dumps(printed)+');\n'
text += 'export const GWENT_CARD_VARIANTS = Object.freeze('+json.dumps(variants,indent=2)+');\n'
(workspace / 'webapp/gwent-local-art.js').write_text(text,encoding='utf-8')
notes = '# User-supplied Gwent card images\n\nSource: `C:/Users/kubai/Desktop/cards` supplied by the user. '
notes += 'The folder attributes the set to diablo1.ru. Files are converted to WebP without cropping, painting, or changing printed text. '
notes += 'Variant 1 is the default back; variant 2 and alternate illustrations are retained. '
notes += 'No Skellige back was supplied: its previous back remains in use. '
notes += 'Printed names and ability icons are not overlaid. Combat strength is overlaid only when it differs from the card definition.\n\n'
notes += '| Project file | Supplied file |\n|---|---|\n'
notes += '\n'.join('| '+key+' | '+value+' |' for key,value in sorted(provenance.items()))+'\n'
(destination / 'source.md').write_text(notes,encoding='utf-8')
print(f'Imported {len(files)} files, mapped {len(printed)} card/leader IDs and 4 faction backs.')
