import json
from pathlib import Path
root=Path(__file__).resolve().parents[4]
base=root/'art-source/avatars/revisions/dwarf-reference-v3'
accepted=json.loads((base/'accepted.json').read_text())
for category,kind in [('races','body'),('portraits','portrait')]:
 directory=root/'art-source/avatars'/category
 jobs=json.loads((directory/'jobs.json').read_text(encoding='utf-8-sig'))
 for revision in [x for x in accepted if x['kind']==kind]:
  job=next(x for x in jobs if x['key']==revision['key'])
  prior={k:v for k,v in job.items() if k!='history'}
  job.setdefault('history',[]).append(prior)
  job.update({k:v for k,v in revision.items() if k!='kind'})
 (directory/'jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 with (directory/'STATUS.md').open('a',encoding='utf-8') as f:
  f.write('\n## Dwarf reference revision v3 — 2026-10-13\nBoth dwarf appearances corrected using the three supplied L2 anatomy screenshots. Female: petite compact body, large relative head, narrow shoulders and twin ponytails. Male: broad short torso/limbs, bald head and white beard. Custom red/gold and ivory/gold costume themes retained. Versioned full-body and portrait WebP delivery; other races preserved. Exact prompts and backups: ../revisions/dwarf-reference-v3/. Temp attachments copied, never moved.\n')
doc=root/'docs/imagegen-prompts.md'
with doc.open('a',encoding='utf-8') as f:
 f.write('\n### 17c. Dwarf reference revision v3\nAuthoritative anatomy: three user-provided L2 screenshots saved in art-source/avatars/revisions/dwarf-reference-v3/references/. Costume palette only from prior avatars; replace human-like proportions with compact racial silhouettes. Exact generation prompts:\n')
 for j in accepted:
  f.write('\n**'+j['key']+' '+j['kind']+'**\n\n'+j['prompt']+'\n')
