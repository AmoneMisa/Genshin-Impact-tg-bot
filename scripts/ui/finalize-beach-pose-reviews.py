"""Merge the twelve visually measured beach paintings, preserving earlier reviews."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'art-source/avatars'
def read(path): return json.loads(path.read_text(encoding='utf-8-sig'))
def write(path, value): path.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

reviews = read(BASE/'motion-review/beach-pose-reviews.json')
reviews['coral-bay-breeze-dwarf-female'] = {
    'coordinates':[38,62,28,24,48,75,58,46,43,87,62,90,23,54,76,27],
    'hair':'l','held':'L','faceHint':[47,17], 'eyePixels':[[229,133],[257,125]],
    'eyeRadiusY':.0065,
    'props':[[16,44,45,77],[34,6,62,12],[25,9,42,19],[58,10,80,24]],
    'hairRegions':[[.42,.29,.024,.055,1],[.65,.34,.026,.07,1.4]],
    'clothRegions':[[.78,.28,.02,.025,1]],'clothStart':.18,
    'review':'Miniature slender clearly mature adult; shorter limbs, no juvenile face. Eyes, braid, ring and hat traced from revised v2 painting.'}
reviews['coral-bay-breeze-kamael-female'] = {
    'coordinates':[39,61,23,28,51,76,48,39,40,88,54,90,30,38,72,25],
    'hair':'l','held':'R','faceHint':[47,15], 'eyePixels':[[230,122],[249,115]],
    'props':[[65,41,85,75],[37,6,60,12],[27,8,43,18],[57,11,70,22]],
    'hairRegions':[[.57,.27,.025,.07,1.3],[.61,.33,.02,.05,1]],
    'clothRegions':[[.70,.24,.02,.025,1]],'clothStart':.15,
    'wing':{'pivot':[.62,.25], 'outline':[[.66,.12],[.82,.16],[.99,.41],[.98,.82],[.86,.71],[.68,.34],[.62,.25]],
            'amplitude':.022,'period':7.8,'phase':0,'reviewPoints':[[.91,.57],[.92,.62]],
            'foregroundAreas':[[.65,.41,.85,.75,.008],[.37,.06,.60,.12,.008],[.27,.08,.43,.18,.008],[.57,.11,.70,.22,.008]]}}
reviews['high-tide-rider-kamael-male'] = {
    'coordinates':[34,61,21,13,37,59,48,37,34,89,68,91,32,29,32.5,34],
    'hair':'l','held':'L','faceHint':[42,13], 'eyePixels':[[204,101],[221,96]],
    'props':[[9,17,31,88],[33,5,53,11],[25,9,36,18],[51,7,61,14]],
    'hairRegions':[[.58,.24,.022,.055,1.3]],'clothRegions':[],'clothStart':.24,
    'wing':{'pivot':[.61,.22], 'outline':[[.66,.09],[.82,.14],[.99,.35],[.98,.83],[.83,.88],[.68,.39],[.61,.22]],
            'amplitude':.022,'period':7.8,'phase':0,'reviewPoints':[[.87,.50],[.89,.58]],
            'foregroundAreas':[[.09,.17,.31,.88,.008],[.33,.05,.53,.11,.008],[.25,.09,.36,.18,.008],[.51,.07,.61,.14,.008]]}}
assert len(reviews)==12
write(BASE/'motion-review/beach-pose-reviews.json', reviews)
additional = read(BASE/'motion-review/additional-pose-reviews.json')
additional.update(reviews)
write(BASE/'motion-review/additional-pose-reviews.json', additional)

jobs = read(BASE/'collections/jobs.json')
male = next(j for j in jobs if j['key']=='high-tide-rider-kamael-male')
male['generationReferences']=[male['revisions'][-1]['source'], 'art-source/avatars/collections/coral-bay-breeze-kamael-female.png']
male['revisions'][-1]['generationReferences']=[male['revisions'][0]['source']]+[
    'art-source/avatars/collections/user-references/kamael-wing-cape-structure-01.png',
    'art-source/avatars/collections/user-references/kamael-wing-cape-structure-02.png']
cape_jobs = read(BASE/'kamael-capes/jobs.json')
cape_motion = read(BASE/'kamael-capes/motion.json')
for key,ornament,cloth in [
    ('coral-bay-breeze-kamael-female',[.28,.12,.43,.24],[[.305,.35,.02,.06,1.3],[.275,.43,.02,.06,1.3]]),
    ('high-tide-rider-kamael-male',[.29,.17,.43,.25],[[.32,.29,.012,.035,1.5],[.325,.34,.012,.04,1.5]])]:
    job = next(j for j in jobs if j['key']==key)
    assert job['status']=='reviewed', 'Accept visual alpha composites first'
    job['capeIntegrated']=True
    entry={k:job[k] for k in ['key','name','costumeId','gender','source','prompt','generatedPath']}
    entry.update(inputSource=job['source'],references=job['generationReferences'],status='reviewed',defaultAliases=[],
                 generationMode='full-costume-with-cape',review='Full costume painting visually reviewed: white wing viewer right, compact metal ornament and narrow hanging banner viewer left.')
    cape_jobs=[j for j in cape_jobs if j['key']!=key]+[entry]
    cape_motion[key]={'eyePixels':reviews[key]['eyePixels'],'coordinates':reviews[key]['coordinates'],
                      'ornament':ornament,'clothRegions':cloth,'reviewPoints':[r[:2] for r in cloth],
                      'clothStart':.24,'review':'Banner edges traced separately from rigid ring/board and shoulder ornament.'}
write(BASE/'collections/jobs.json',jobs)
write(BASE/'kamael-capes/jobs.json',cape_jobs)
write(BASE/'kamael-capes/motion.json',cape_motion)
print('Merged 12 beach reviews; cape queue:',len(cape_jobs))
