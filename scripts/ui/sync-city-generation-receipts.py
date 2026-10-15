"""Merge independent generation receipts without overwriting accepted revisions."""
import json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'art-source/avatars/collections'
file=BASE/'jobs.json';jobs=json.loads(file.read_text(encoding='utf-8-sig'));by={j['key']:j for j in jobs}
count=0
for receipt in sorted((BASE/'city-generation').glob('*.json')):
    data=json.loads(receipt.read_text(encoding='utf-8-sig'))
    if not isinstance(data,dict):continue
    job=by[data['key']]
    if job['status']!='pending':continue
    source=ROOT/data['source']
    with Image.open(source) as im:
        assert im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0,job['key']
    job.update(status='generated',generatedPath=data['generatedPath'],generationReferences=data['generationReferences'])
    count+=1
file.write_text(json.dumps(jobs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Merged',count,'new generated source receipts')
