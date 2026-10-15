"""Persist the user's pumpkin-head and ragged luminous ghost corrections."""
import ast,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'art-source/avatars'
def read(path):return json.loads(path.read_text(encoding='utf-8-sig'))
def write(path,data):path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
tree=ast.parse((ROOT/'scripts/ui/prepare-city-halloween-costumes.py').read_text(encoding='utf-8'))
briefs=ast.literal_eval(next(node.value for node in tree.body if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='BRIEFS' for t in node.targets)))
designs={b[0]:b[4] for b in briefs};ids={'hollow-lantern-rider','moonveil-phantom'}
jobs=read(BASE/'collections/jobs.json')
for job in jobs:
    if job['costumeId'] not in ids:continue
    job['referenceDesign']=designs[job['costumeId']]
    job['faceConcealed']=job['costumeId']=='hollow-lantern-rider'
    if job['race']=='human':
        assert job.get('revisions'),job['key']
        job['clothingReference']=job['source']
        job['generationReferences']=[job['revisions'][-1]['source']]+(['art-source/avatars/collections/cobblestone-sunday-human-female.png'] if job['costumeId']=='moonveil-phantom' else [])
write(BASE/'collections/jobs.json',jobs)
themes=read(BASE/'collections/remaining-reference-themes.json')
for theme in themes:
    if theme['costumeId'] in ids:
        theme['design']=designs[theme['costumeId']]
        theme['clothingReference']=next(j['source'] for j in jobs if j['costumeId']==theme['costumeId'] and j['race']=='human')
write(BASE/'collections/remaining-reference-themes.json',themes)
icons=read(BASE/'shop-icons/jobs.json')
# Neither old draft icon has been generated; only refresh these two pending briefs.
icons=[job for job in icons if not(job['costumeId'] in ids and job['status']=='pending')]
write(BASE/'shop-icons/jobs.json',icons)
print('User corrections saved; two ungenerated icon briefs ready to refresh')
