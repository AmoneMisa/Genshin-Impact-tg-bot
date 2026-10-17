"""Add Varka and High Five Monastery mobs, drops and original gatekeeper entry coordinates."""
from pathlib import Path
import xml.etree.ElementTree as E
import json,re
root=Path(__file__).resolve().parents[2];data=next((root/'.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
npcs={n.get('id'):n for p in (root/'.tmp/hf-npcs').glob('*.xml') for n in E.parse(p).getroot().findall('npc')}
exp={int(n.get('level')):int(n.get('tolevel')) for n in E.parse(data/'stats/players/experience.xml').findall('experience')}
def read_module(path):return json.loads(path.read_text(encoding='utf-8').split('export default ',1)[1].strip().rstrip(';'))
loot=read_module(root/'template/l2Loot.js');items=read_module(root/'template/l2Items.js');wanted_items=set()
zones=[];locations=[]
for id,title,file,select,match in [('ketra-outpost','Застава орков Кетра','Goddard/KetraOrcOutpost.xml',lambda n:n.get('name','').startswith('Ketra Orc'),'Ketra'),('varka-outpost','Лагерь силеносов Варка','Goddard/VarkaSlenosOutpost.xml',lambda n:n.get('name','').startswith('Varka Silenos'),'Varka'),('monastery-of-silence','Монастырь Безмолвия','Others/23_15.xml',lambda n:22789<=int(n.get('id'))<=22798,'Monastery')]:
    spawned={n.get('id') for n in E.parse(data/'spawns'/file).findall('.//npc')};mobs=[]
    for nid in sorted(spawned,key=int):
        n=npcs.get(nid)
        if n is None or not select(n) or n.get('type','').removeprefix('L2')!='Monster':continue
        acquire=n.find('acquire');st=n.find('stats')
        if acquire is None or float(acquire.get('exp','0'))<=0:continue
        v=st.find('vitals');a=st.find('attack');d=st.find('defence');level=int(n.get('level'));ad=st.find('attribute/defence')
        drops=n.findall('dropLists/death/item') or n.findall('dropLists/drop/item')
        if not drops:drops=n.findall('.//drop/item')
        gold=next((x for x in drops if x.get('id')=='57'),None)
        loot[nid]=[[int(x.get('id')),int(x.get('min')),int(x.get('max')),float(x.get('chance'))] for x in drops if x.get('id')!='57' and float(x.get('chance','0'))>0]
        wanted_items.update(str(x[0]) for x in loot[nid])
        mobs.append({'id':nid,'name':n.get('name'),'level':level,'expShare':round(float(acquire.get('exp'))/(exp[level+1]-exp[level]),7),
          'hp':float(v.get('hp')),'pAtk':float(a.get('physical')),'mAtk':float(a.get('magical')),'pDef':float(d.get('physical')),
          'accuracy':float(a.get('accuracy','0')),'crit':float(a.get('critical','0')),'attackSpeed':float(a.get('attackSpeed','253')),
          'resist':{k:float(value) for k,value in ad.attrib.items()} if ad is not None else {},
          'gold':{'min':int(gold.get('min')),'max':int(gold.get('max')),'chance':float(gold.get('chance'))} if gold is not None else None,'drops':[]})
    if not mobs:raise ValueError('Missing mobs: '+id)
    levels=sorted(n['level'] for n in mobs);zones.append({'id':id,'title':title,'min':levels[0],'max':levels[-1],'level':levels[len(levels)//2],'mobs':mobs})
    gate=next(n for p in (data/'teleporters/town').glob('*.xml') for n in E.parse(p).findall('.//teleport[@type="NORMAL"]/location') if match in n.get('name',''))
    x,y,z=int(gate.get('x')),int(gate.get('y')),int(gate.get('z'))
    locations.append({'id':id,'name':title,'x':x,'y':y,'z':z,'region':'goddard','polygon':[[x-5000,y-5000],[x+5000,y-5000],[x+5000,y+5000],[x-5000,y+5000]],'levelMin':levels[0],'levelMax':levels[-1],'teleportGold':int(gate.get('feeCount','0')),'floors':1,'mob':{k:mobs[0][k] for k in ['id','name','level']},'source':'H5 gatekeeper NORMAL destination; polygon is authored selection extent'})
for p in (data/'stats/items').glob('*.xml'):
    for item in E.parse(p).findall('item'):
        id=item.get('id')
        if id not in wanted_items or id in items:continue
        st={s.get('name'):s.get('val') for s in item.findall('set')}
        items[id]=[item.get('name'),item.get('type'),st.get('crystal_type','NONE'),int(st.get('price','0')),st.get('etcitem_type')]
for file,rows in [('l2Loot.js',loot),('l2Items.js',items)]:
    path=root/'template'/file;s=path.read_text(encoding='utf-8').split('export default ',1)[0];path.write_text(s+'export default '+json.dumps(rows,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
(root/'template/huntingExpansion.js').write_text('// Pinned High Five XML; no fabricated monsters, rewards or entrance points.\nexport const HUNTING_EXPANSION = '+json.dumps(zones,ensure_ascii=False,indent=2)+';\nexport const HUNTING_EXPANSION_LOCATIONS = '+json.dumps(locations,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
print('Imported',[(z['id'],len(z['mobs'])) for z in zones],sum(len(loot[m['id']]) for z in zones for m in z['mobs']),'drop rows')
