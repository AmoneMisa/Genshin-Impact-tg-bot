"""Apply measured cape edit landmarks after the existing pose/eye import."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
FOLDER=ROOT/'art-source/avatars/motion-review'
CAPES=ROOT/'art-source/avatars/kamael-capes'
def read(path):return json.loads(path.read_text(encoding='utf-8-sig'))
jobs=read(CAPES/'jobs.json');reviews=read(CAPES/'motion.json')
eyes=read(FOLDER/'calibrated-eyes.json');landmarks=read(FOLDER/'landmarks.json')
for job in jobs:
    key=job['key'];pair=reviews[key]['eyePixels']
    for target in [key]+job['defaultAliases']:
        eyes[target]=[[round(x/512,7),round(y/768,7)] for x,y in pair]
    theme=key.rsplit('-kamael-',1)[0]
    assert len(pair)==2 or (not pair and reviews[key].get('noVisibleEyes')),key
    landmarks[theme][5]=([sum(p[0] for p in pair)/2*300/512,sum(p[1] for p in pair)/2*450/768,
                         abs(pair[1][0]-pair[0][0])*300/512,(pair[1][1]-pair[0][1])*450/768] if pair else None)
for name,data in [('calibrated-eyes.json',eyes),('landmarks.json',landmarks)]:
    (FOLDER/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Imported eye coordinates for',sum(1+len(j['defaultAliases']) for j in jobs),'Kamael portraits')
