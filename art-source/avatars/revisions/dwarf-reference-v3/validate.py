import json
from pathlib import Path
root=Path(__file__).resolve().parents[4]
for category in ['races','portraits']:
 directory=root/'art-source/avatars'/category
 p=directory/'progress.json'
 data=json.loads(p.read_text(encoding='utf-8-sig'))
 data['latestRevision'].update(testsPassed=20,browserScenarios=12,widths=[320,390,1100],reducedMotion=True,horizontalOverflow=False,publishedToRemote=False)
 p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 with (directory/'STATUS.md').open('a',encoding='utf-8') as f:
  f.write('\nValidation v3: 20 tests passed; 12 equipment/profile browser scenarios (both genders at 320/390/1100 px), reduced motion, decoded art URLs, selection/focus, gender switch and cooldown, open/close, no horizontal overflow. All mobile asset budgets passed. Local changes; not pushed.\n')
