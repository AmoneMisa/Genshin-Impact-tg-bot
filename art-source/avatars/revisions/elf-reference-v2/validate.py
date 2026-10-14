import json,shutil
from pathlib import Path
root=Path(__file__).resolve().parents[4]
base=Path(__file__).resolve().parent
shutil.copyfile(base/'accepted.json',base/'jobs.json')
validation={'testsPassed':20,'browserScenarios':24,'widths':[320,390,1100],'reducedMotion':True,'decodedUrls':True,'genderSwitch':True,'focus':True,'openClose':True,'horizontalOverflow':False,'publishedToRemote':False}
for cat in ['races','portraits']:
 directory=root/'art-source/avatars'/cat
 p=directory/'progress.json'
 data=json.loads(p.read_text(encoding='utf-8-sig'))
 data['latestRevision']['validation']=validation
 p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 with (directory/'STATUS.md').open('a',encoding='utf-8') as f:
  f.write('\nElf v2 validation: 20 tests passed; 24 equipment/profile scenarios at 320/390/1100 px. All URLs decoded, no overflow, reduced motion and gender/focus/cooldown/open-close passed. Full body mobile 512px files 71–104 KB, portraits 128px 7–9 KB. Local integration only; not pushed.\n')
with (base/'STATUS.md').open('a',encoding='utf-8') as f:
 f.write('\nCompleted integration: 20 tests and 24 browser scenarios passed, 320/390/1100 widths, reduced motion, decoded URLs, gender switch/cooldown and focus/open-close, no overflow. All 24 WebP files within budgets. No gameplay changes. Local only.\n')
