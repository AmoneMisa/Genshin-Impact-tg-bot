"""Pinned H5 treasure populations, special drops, Unlock and merchant key data."""
from pathlib import Path
import xml.etree.ElementTree as E
import json,hashlib,subprocess
ROOT=Path(__file__).resolve().parents[2]
D=next((ROOT/'.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
files=['spawns/Others/TreasureBoxes.xml','scripts/handlers/skill/effects/OpenChest.java','stats/skills/00000-00099.xml','stats/skills/22200-22299.xml']
groups=[];needed=set([1661,21746]);npcs={}
for i,g in enumerate(E.parse(D/files[0]).findall('spawn')):
 pool=[{'id':int(n.get('id')),'count':int(n.get('count','1')),'respawnMs':int(n.get('respawnDelay','0'))*1000,'respawnRandomMs':int(n.get('respawnRandom','0'))*1000} for n in g.findall('npc')]
 territories=[{'name':t.get('name'),'minZ':int(t.get('minZ')),'maxZ':int(t.get('maxZ')),'polygon':[[int(p.get('x')),int(p.get('y'))] for p in t.findall('node')]} for t in g.findall('territory')]
 groups.append({'id':i,'selection':g.get('selection'),'maximumNpc':int(g.get('maximumNpc',sum(n['count'] for n in pool))),'pool':pool,'territories':territories})
ids={n['id'] for g in groups for n in g['pool']}
for p in (ROOT/'.tmp/hf-npcs').glob('*.xml'):
 for n in E.parse(p).findall('npc'):
  if int(n.get('id')) not in ids:continue
  drops=[[int(i.get('id')),int(i.get('min')),int(i.get('max')),float(i.get('chance'))] for i in n.findall('dropLists/drop/item')]
  needed.update(r[0] for r in drops)
  npcs[n.get('id')]={'id':int(n.get('id')),'name':n.get('name'),'level':int(n.get('level')),'drops':drops}
skills={}
for file,id in [('stats/skills/00000-00099.xml',27),('stats/skills/22200-22299.xml',22271)]:
 s=E.parse(D/file).find(f"skill[@id='{id}']");tables={t.get('name'):t.text.split() for t in s.findall('table')}
 row={'id':id,'name':s.get('name'),'levels':int(s.get('levels'))}
 for key in ['mpConsume','itemConsumeId','itemConsumeCount','hitTime','reuseDelay','castRange']:
  value=s.findtext(key,'0');row[key]=[float(v) for v in tables.get(value,[value])]
 skills[id]=row
items={};icons={}
for p in (D/'stats/items').glob('*.xml'):
 for n in E.parse(p).findall('item'):
  if int(n.get('id')) not in needed:continue
  st={v.get('name'):v.get('val') for v in n.findall('set')};id=n.get('id')
  items[id]=[n.get('name'),n.get('type'),st.get('crystal_type','NONE'),int(st.get('price','0')),st.get('etcitem_type')]
  icons['l2_'+id]=st.get('icon','')
  file=str(p.relative_to(D)).replace('\\','/')
  if file not in files:files.append(file)
shops=[]
for p in (D/'buyLists').glob('*.xml'):
 if E.parse(p).find("item[@id='21746']") is not None:shops.append(str(p.relative_to(D)).replace('\\','/'))
assert shops and len(npcs)==22
data={'groups':groups,'npcs':npcs,'skills':skills,'keys':[{'id':id,'name':items[str(id)][0],'price':items[str(id)][3]} for id in [1661,21746]],'source':{'commit':'9fb01cb20513e55190cdde8d91e41be2c0914f84','repository':'https://gitlab.com/MobiusDevelopment/L2J_Mobius','files':{f:hashlib.sha256((D/f).read_bytes()).hexdigest() for f in files},'shops':shops,'geodataAvailable':False}}
path=ROOT/'.tmp/treasure-source.json';path.write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8')
p=ROOT/'template/l2Items.js';text=p.read_text(encoding='utf-8');head,raw=text.split('export default ',1);allitems=json.loads(raw.rstrip(';\n'));allitems.update(items);p.write_text(head+'export default '+json.dumps(allitems,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
(ROOT/'.tmp/treasure-icons.json').write_text(json.dumps(icons),encoding='utf-8')
subprocess.run(['node','scripts/l2j/map-treasure-chests.mjs'],cwd=ROOT,check=True)
