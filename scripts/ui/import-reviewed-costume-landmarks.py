"""Merge manually reviewed coordinates for new paintings into rig inputs."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
FOLDER=ROOT/'art-source/avatars/motion-review'
def read(name):return json.loads((FOLDER/name).read_text(encoding='utf-8-sig'))
reviews=read('additional-pose-reviews.json')
eyes,landmarks,wings=read('calibrated-eyes.json'),read('landmarks.json'),read('wing-motion.json')
races=['human','elf','darkElf','orc','dwarf','kamael']
for key,review in reviews.items():
    theme,race,gender=key.rsplit('-',2)
    assert 'eyePixels' in review,'Missing manual eye coordinates: '+key
    pair=review['eyePixels']
    assert len(pair)==2 or (not pair and review.get('noVisibleEyes')),key
    eyes[key]=[[round(x/512,7),round(y/768,7)] for x,y in pair]
    points=None
    if pair:
        x=sum(p[0] for p in pair)/2*300/512
        y=sum(p[1] for p in pair)/2*450/768
        distance=abs(pair[1][0]-pair[0][0])*300/512
        tilt=(pair[1][1]-pair[0][1])*450/768
        points=[x,y,distance,tilt]
    landmarks.setdefault(theme,[None]*6)[races.index(race)]=points
    if race=='kamael':
        assert 'wing' in review,'Missing manual wing outline: '+key
        wings[key]=review['wing']
for name,data in [('calibrated-eyes.json',eyes),('landmarks.json',landmarks),('wing-motion.json',wings)]:
    (FOLDER/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Imported',len(reviews),'individual eye pairs and pose records')
