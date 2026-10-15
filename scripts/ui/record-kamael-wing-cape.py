"""Copy one generated edit without overwriting its original source painting."""
import argparse,json,shutil
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
FOLDER=ROOT/'art-source/avatars/kamael-capes'
p=argparse.ArgumentParser();p.add_argument('key');p.add_argument('generated');a=p.parse_args()
file=FOLDER/'jobs.json';jobs=json.loads(file.read_text(encoding='utf-8'))
job=next(j for j in jobs if j['key']==a.key)
assert job['status']=='pending',a.key
with Image.open(a.generated) as im:
    assert im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0,'Missing alpha'
    assert im.size==(1024,1536),im.size
target=ROOT/job['source'];assert not target.exists(),target
shutil.copyfile(a.generated,target)
job.update(status='generated',generatedPath=a.generated)
temporary=file.with_suffix('.pending.json')
temporary.write_text(json.dumps(jobs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');temporary.replace(file)
print(a.key,'saved;',sum(j['status']=='pending' for j in jobs),'remaining')
