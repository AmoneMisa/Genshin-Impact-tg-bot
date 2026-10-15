"""Prepare responsive assets while edits arrive, without changing live artwork."""
import json,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];FOLDER=ROOT/'art-source/avatars/kamael-capes'
jobs=json.loads((FOLDER/'jobs.json').read_text(encoding='utf-8'))
(FOLDER/'stage-reviewed.json').write_text(json.dumps([j['key'] for j in jobs]),encoding='utf-8')
while True:
    jobs=json.loads((FOLDER/'jobs.json').read_text(encoding='utf-8'))
    keys=[j['key'] for j in jobs if j['status']!='pending' and not all((FOLDER/'webp'/f"{j['key']}-{w}.webp").exists() for w in [256,512,1024])]
    if keys:
        subprocess.run([sys.executable,str(ROOT/'scripts/ui/build-avatar-art.py'),'--source','art-source/avatars/kamael-capes/jobs.json',
            '--reviewed','art-source/avatars/kamael-capes/stage-reviewed.json','--output','art-source/avatars/kamael-capes/webp','--keys',*keys],cwd=ROOT,check=True)
        print('Staged',len(keys),'cape portraits',flush=True)
    if all(j['status']!='pending' for j in jobs):break
    time.sleep(5)
print('All 50 responsive cape portraits staged',flush=True)
