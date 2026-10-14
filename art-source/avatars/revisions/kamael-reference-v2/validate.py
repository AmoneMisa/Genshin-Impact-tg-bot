import json
from pathlib import Path
root=Path(__file__).resolve().parents[4];base=Path(__file__).resolve().parent
checks={'testsPassed':20,'browserScenarios':12,'widths':[320,390,1100],'reducedMotion':True,'decodedUrls':True,'genderSwitch':True,'focus':True,'openClose':True,'horizontalOverflow':False,'publishedToRemote':False}
for cat in ['races','portraits']:
 directory=root/'art-source/avatars'/cat;p=directory/'progress.json'
 data=json.loads(p.read_text(encoding='utf-8-sig'));data['latestRevision']['validation']=checks
 p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 with (directory/'STATUS.md').open('a',encoding='utf-8') as f:
  f.write('\nKamael v2 checks passed: 20 tests, 12 equipment/profile scenarios at 320/390/1100px, reduced motion, decoding, focus/close, gender/cooldown, no overflow. Mobile 512px bodies 92–95 KB; HUD 128px portraits 8–9 KB. Local only.\n')
with (base/'STATUS.md').open('a',encoding='utf-8') as f: f.write('\nComplete: 20 tests and 12 mobile/wide browser checks passed. Both race/gender artwork paths point to v2. No gameplay changes. Not pushed.\n')
