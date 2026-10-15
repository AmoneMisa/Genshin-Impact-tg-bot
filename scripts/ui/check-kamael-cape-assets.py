"""Verify all live responsive cape bodies, including the two matching base aliases."""
import json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];FOLDER=ROOT/'art-source/avatars/kamael-capes'
jobs=json.loads((FOLDER/'jobs.json').read_text(encoding='utf-8'));files=[]
for job in jobs:
    original=job['key'];assert job['status']=='reviewed',original
    targets=[(original,ROOT/'webapp/art/avatars/collections/v1')]
    targets.extend((key,ROOT/'webapp/art/avatars/races/v2') for key in job['defaultAliases'])
    for key,folder in targets:
        for width in [256,512,1024]:
            file=folder/f'{key}-{width}.webp'
            with Image.open(file) as im:
                assert im.size==(width,width*3//2),file
                assert im.getchannel('A').getextrema()[0]==0,file
                bounds=im.getchannel('A').getbbox()
                assert bounds[0]>0 and bounds[1]>0 and bounds[2]<im.width and bounds[3]<im.height,file
            assert file.stat().st_size<=width*400,file
            if key!=original:
                assert file.read_bytes()==(ROOT/'webapp/art/avatars/collections/v1'/f'{original}-{width}.webp').read_bytes()
            files.append({'path':file.relative_to(ROOT).as_posix(),'bytes':file.stat().st_size})
motion=json.loads((FOLDER/'motion.json').read_text(encoding='utf-8'))
report={'uniquePaintings':len(jobs),'costumeTargets':len(jobs),'baseTargets':sum(len(j['defaultAliases']) for j in jobs),
        'newImageEdits':sum(bool(j.get('generatedPath')) and j.get('generationMode')!='full-costume-with-cape' for j in jobs),
        'integratedCostumeCapes':sum(j.get('generationMode')=='full-costume-with-cape' for j in jobs),
        'previouslyAcceptedCape':1,'responsiveFiles':len(files),'allReviewed':True,
        'manualPoseRecords':sum(len(r.get('coordinates',[]))==16 for r in motion.values()),
        'checks':['decoded WebP','transparent alpha','three responsive widths','silhouette inset','size budgets','base aliases match selected costume painting'],
        'motionReport':'../motion-review/kamael-cape-motion-review.json','files':files}
(FOLDER/'delivery.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(len(files),'responsive files verified')
