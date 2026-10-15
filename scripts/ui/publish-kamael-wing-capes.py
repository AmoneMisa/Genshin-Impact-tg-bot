"""Select manually reviewed cape edits, retaining all earlier source paintings."""
import json,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
FOLDER=ROOT/'art-source/avatars/kamael-capes'
def read(path):return json.loads(path.read_text(encoding='utf-8-sig'))
def write(path,data):path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
capes=read(FOLDER/'jobs.json');motion=read(FOLDER/'motion.json')
assert len(capes)>=50 and set(j['key'] for j in capes)==set(motion)
for cape in capes:
    key=cape['key'];review=motion[key]
    assert cape['status'] in ['generated','reviewed'],key
    assert len(review['eyePixels'])==2 and len(review['coordinates'])==16 and review['clothRegions'] and review['ornament'],key
    assert (ROOT/cape['source']).exists(),key
    for width in [256,512,1024]:
        source=FOLDER/'webp'/f'{key}-{width}.webp'
        assert source.exists() and source.stat().st_size<=width*400,source
paths=[ROOT/'art-source/avatars/collections/jobs.json',ROOT/'art-source/avatars/races/jobs.json']
for path in paths:
    jobs=read(path)
    for cape in capes:
        keys=[cape['key']] if path==paths[0] else cape['defaultAliases']
        for key in keys:
            job=next(j for j in jobs if j['key']==key)
            if job['source']!=cape['source']:
                job.setdefault('capeRevisions',[]).append({'source':job['source'],'replacement':cape['source'],'reason':'User supplied Kamael wing-cape construction'})
                job['source']=cape['source']
                job['capeGenerationPrompt']=cape['prompt']
                job['capeGenerationReferences']=cape['references']
            job['capeConstruction']='Rigid wing ornament with a narrow vertical hanging cloth banner, beside the natural white wing'
    write(path,jobs)
for cape in capes:
    cape['status']='reviewed'
    cape['review']='Full body, face, original pose, white wing, rigid fitting and narrow hanging banner visually reviewed; individual cloth and eye coordinates recorded.'
write(FOLDER/'jobs.json',capes)
for cape in capes:
    for width in [256,512,1024]:
        source=FOLDER/'webp'/f"{cape['key']}-{width}.webp"
        targets=[ROOT/'webapp/art/avatars/collections/v1'/source.name]
        targets.extend(ROOT/'webapp/art/avatars/races/v2'/f'{alias}-{width}.webp' for alias in cape['defaultAliases'])
        for target in targets:
            temporary=target.with_suffix('.tmp.webp');shutil.copyfile(source,temporary);temporary.replace(target)
print('Selected',len(capes),'unique paintings for',len(capes),'costume and two base Kamael targets')
