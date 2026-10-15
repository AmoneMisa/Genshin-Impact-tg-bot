"""Copy a built-in image generation result into the project and record provenance."""
import argparse,json,shutil
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--id',required=True);parser.add_argument('--generated',required=True)
parser.add_argument('--revision',type=int,default=1)
parser.add_argument('--edit-prompt')
args=parser.parse_args();root=Path(__file__).resolve().parents[2]
file=root/'art-source/avatars/shop-icons/jobs.json'
jobs=json.loads(file.read_text(encoding='utf-8'));job=next(j for j in jobs if j['costumeId']==args.id)
source=Path(args.generated);target=root/job['source']
if args.revision>1:
    job.setdefault('earlierVersions',[]).append({'source':job['source'],'generatedPath':job.get('generatedPath')})
    target=root/('art-source/avatars/shop-icons/'+args.id+'-v'+str(args.revision)+'.png')
    job['source']=target.relative_to(root).as_posix()
assert source.is_file() and source.suffix.lower()=='.png'
assert not target.exists() or source.read_bytes()==target.read_bytes(),'Create a versioned sibling for a replacement'
shutil.copy2(source,target)
job.update(generatedPath=str(source),status='generated')
if args.edit_prompt:job['editPrompt']=args.edit_prompt
file.write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf-8')
print(args.id,'saved')
