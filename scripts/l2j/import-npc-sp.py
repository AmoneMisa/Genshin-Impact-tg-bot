"""Import original High Five SP rewards for the hunting catalog from NPC XML files."""
import pathlib, re, json, sys
root=pathlib.Path(__file__).resolve().parents[2]
source=pathlib.Path(sys.argv[1])
text=(root/'template/huntingTemplate.js').read_text(encoding='utf-8')
fields=json.loads(text.split('export default ',1)[1].strip().rstrip(';'))
needed={str(m['id']) for f in fields for m in f['mobs']}
rewards={}
for file in source.glob('*.xml'):
 for npc in re.finditer(r'<npc\b[^>]*\bid="(\d+)"[^>]*>([\s\S]*?)</npc>',file.read_text(encoding='utf-8')):
  acquire=re.search(r'<acquire\b[^>]*\bsp="([\d.]+)"',npc[2])
  if acquire: rewards[npc[1]]=int(float(acquire[1]))
missing=needed-rewards.keys()
if missing: raise SystemExit(f'Missing native NPC SP: {sorted(missing)}')
(root/'template/l2NpcSp.js').write_text('// Generated from L2J Mobius High Five NPC acquire.sp; x1 values.\nexport default '+json.dumps(rewards,sort_keys=True,separators=(',',':'))+';\n',encoding='utf-8')
print(f'Imported {len(rewards)} original NPC SP rewards')
