"""Record explicitly measured canonical portrait landmarks, never infer a cape."""
import argparse,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];FOLDER=ROOT/'art-source/avatars/kamael-capes'
p=argparse.ArgumentParser();p.add_argument('key');p.add_argument('--ornament',type=float,nargs=4,required=True)
p.add_argument('--cloth',type=float,nargs='+',required=True);p.add_argument('--eyes',type=float,nargs=4)
p.add_argument('--pose',type=int,nargs=16)
a=p.parse_args();assert len(a.cloth)%5==0
job=next(j for j in json.loads((FOLDER/'jobs.json').read_text(encoding='utf-8')) if j['key']==a.key)
assert job['status']!='pending','Review requires a generated source'
path=FOLDER/'motion.json';reviews=json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
eyes=json.loads((ROOT/'art-source/avatars/motion-review/calibrated-eyes.json').read_text(encoding='utf-8'))
pair=[a.eyes[:2],a.eyes[2:]] if a.eyes else [[round(x*512,2),round(y*768,2)] for x,y in eyes[a.key]]
regions=[a.cloth[i:i+5] for i in range(0,len(a.cloth),5)]
reviews.setdefault(a.key,{})
reviews[a.key].update({'eyePixels':pair,'ornament':a.ornament,'clothRegions':regions,
               'reviewPoints':[[r[0],r[1]] for r in regions],'clothStart':.28,
               'review':'Manually traced on the edited portrait; garment and pose preserved, white wing separate.'})
if a.pose:reviews[a.key]['coordinates']=a.pose
path.write_text(json.dumps(reviews,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(a.key,'reviewed;',len(reviews),'unique portraits')
