"""Import source vortex NPCs, summon spots, materials and bone drops; grids are adapted."""
from pathlib import Path
import xml.etree.ElementTree as E
import json,hashlib,re
ROOT=Path(__file__).resolve().parents[2]
D=next((ROOT/'.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
script='scripts/ai/areas/DragonValley/DragonVortex/DragonVortex.java'
java=(D/script).read_text(encoding='utf-8')
spots=[list(map(int,m)) for m in re.findall(r'SPOT_\d = new Location\((-?\d+), (-?\d+), (-?\d+)\)',java)]
xs=[int(x) for x in re.findall(r'case (\d+):',java)]
destinations=dict(zip(xs,spots))
level=json.loads((ROOT/'template/world-extension/dragon-valley.js').read_text(encoding='utf-8').split('export default ',1)[1].rstrip(';\n'))['levels']['floors'][0]
b=level['sourceBounds'];points=[];hashes={script:hashlib.sha256((D/script).read_bytes()).hexdigest()}
for p in sorted((D/'spawns/Others').glob('*.xml')):
 for n in E.parse(p).findall('.//npc[@id="32871"]'):
  xyz={k:int(n.get(k)) for k in ['x','y','z']}
  col=max(0,min(3,int((xyz['x']-b[0])/max(1,b[2]-b[0])*4)))
  row=max(0,min(2,int((xyz['y']-b[1])/max(1,b[3]-b[1])*3)))
  # Within-room position is authored, separate from the original world coordinate.
  fx=max(.2,min(.8,.2+((xyz['x']-b[0])/max(1,b[2]-b[0])*4-col)*.6))
  fy=max(.2,min(.8,.2+((xyz['y']-b[1])/max(1,b[3]-b[1])*3-row)*.6))
  file=str(p.relative_to(D)).replace('\\','/');hashes[file]=hashlib.sha256(p.read_bytes()).hexdigest()
  points.append({'id':str(xyz['x']),'npcId':32871,'source':xyz,'spawn':dict(zip(['x','y','z'],destinations[xyz['x']])),'floor':1,'room':f'r{row}c{col}','point':{'x':round(fx,3),'y':round(fy,3)},'sourceFile':file})
items={}
for p in sorted((D/'stats/items').glob('*.xml')):
 for n in E.parse(p).findall('item'):
  if n.get('id') not in ['17248','17249']:continue
  st={s.get('name'):s.get('val') for s in n.findall('set')}
  items[n.get('id')]=[n.get('name'),n.get('type'),st.get('crystal_type','NONE'),int(st.get('price','0')),st.get('etcitem_type')]
drops={}
for n in E.parse(ROOT/'.tmp/hf-npcs/22800-22899.xml').findall('npc'):
 i=n.find("dropLists/drop/item[@id='17248']")
 if i is not None:drops[n.get('id')]=float(i.get('chance'))
thresholds=[int(x) for x in re.findall(r'random < (\d+)',java)]+[100]
symbols=re.findall(r'raid = ([A-Z_]+);',java)
ids={name:int(n) for name,n in re.findall(r'private static final int (\w+) = (\d+);',java)}
rolls=[[ids[name],limit] for name,limit in zip(symbols,thresholds)]
assert len(points)==4 and len(rolls)==7
text='// Pinned High Five DragonVortex.java and original NPC spawns/drop tables. Room markers are authored.\n'
for k,v in [('DRAGON_VORTICES',points),('DRAGON_VORTEX_ROLLS',rolls),('DRAGON_VORTEX_ITEMS',items),('DRAGON_BONE_DROPS',drops),('DRAGON_VORTEX_SOURCE',{'commit':'9fb01cb20513e55190cdde8d91e41be2c0914f84','files':hashes,'cooldownMs':60000,'boneId':17248})]:
 text+='export const '+k+'='+json.dumps(v,ensure_ascii=False)+';\n'
(ROOT/'template/dragonVortex.js').write_text(text,encoding='utf-8')
print('Imported four Dragon Vortex NPCs, seven weighted raids and',len(drops),'bone drops')
