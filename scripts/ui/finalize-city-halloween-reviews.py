"""Merge the reviewed full-costume paintings, pose annotations and integrated capes."""
import json,runpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
runpy.run_path(str(Path(__file__).with_name('finish-city-halloween-poses.py')))
def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8-sig'))
def write(path,data):(ROOT/path).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
folder='art-source/avatars/motion-review/'
city=read(folder+'city-halloween-pose-reviews.json')
jobs=read('art-source/avatars/collections/jobs.json')
ids=read('art-source/avatars/collections/city-halloween-theme-ids.json')
new=[j for j in jobs if j['costumeId'] in ids]
assert len(new)==54 and set(city)=={j['key'] for j in new}
assert all(j['status']=='reviewed' for j in new)
for key,r in city.items():
    if key.startswith('last-bell-reaper-'):
        r['props']=[([32,15,36,92] if '-dwarf-' not in key else [32,18,36,91]),[8,5,40,23],r['props'][-1]]
additional=read(folder+'additional-pose-reviews.json');additional.update(city)
write(folder+'additional-pose-reviews.json',additional)
write(folder+'city-halloween-pose-reviews.json',city)
capes=read('art-source/avatars/kamael-capes/jobs.json')
motion=read('art-source/avatars/kamael-capes/motion.json')
for job in new:
    if job['race']!='kamael':continue
    job['capeIntegrated']=True
    r=city[job['key']]
    record={k:job[k] for k in ['key','name','costumeId','gender','source','prompt','generatedPath']}
    record.update(inputSource=job['source'],references=job.get('generationReferences',[]),status='reviewed',defaultAliases=[],generationMode='full-costume-with-cape',review='Integrated rigid wing ornament and narrow cloth banner visually accepted in full-costume painting.')
    if not any(c['key']==job['key'] for c in capes):capes.append(record)
    motion[job['key']]={**r['capeReview'],'coordinates':r['coordinates'],'eyePixels':r['eyePixels'],'review':r['review']}
    if r.get('noVisibleEyes'):motion[job['key']]['noVisibleEyes']=r['noVisibleEyes']
write('art-source/avatars/collections/jobs.json',jobs)
write('art-source/avatars/kamael-capes/jobs.json',capes)
write('art-source/avatars/kamael-capes/motion.json',motion)
print('Merged',len(city),'poses;',len(capes),'Kamael paintings')
