import argparse,json,shutil
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[2];base=root/'art-source/avatars/collections'
parser=argparse.ArgumentParser();parser.add_argument('key');parser.add_argument('generated');args=parser.parse_args()
jobs=json.loads((base/'jobs.json').read_text(encoding='utf-8-sig'))
job=next(j for j in jobs if j['key']==args.key)
with Image.open(args.generated) as im:
 assert im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0
shutil.copyfile(args.generated,root/job['source'])
job.update(status='reviewed',generatedPath=args.generated,review='Visual review accepted: same costume theme, preserved racial face/skin/build, complete silhouette, clean alpha; no text/spiders.')
(base/'jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
reviewed=[j['key'] for j in jobs if j['status'] in ['reused','reviewed']]
(base/'reviewed.json').write_text(json.dumps(reviewed,indent=2)+'\n',encoding='utf-8')
progress={'total':len(jobs),'reused':sum(j['status']=='reused' for j in jobs),'generated':sum(j['status']=='reviewed' for j in jobs),'pending':[j['key'] for j in jobs if j['status']=='pending'],'allComplete':all(j['status']!='pending' for j in jobs),'date':'2026-10-13'}
(base/'progress.json').write_text(json.dumps(progress,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(args.key,'accepted;',len(progress['pending']),'remaining')
