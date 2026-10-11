from pathlib import Path
import xml.etree.ElementTree as E
import json
items={};passives={};triggers={};pairs=[];needed=set()
for p in Path('.tmp/l2-high-five/items').rglob('*.xml'):
    for n in E.parse(p).getroot().findall('item'):items[int(n.get('id'))]=n
for p in Path('.tmp/l2-high-five/multisell').rglob('*.xml'):
    if 'custom' in str(p):continue
    for entry in E.parse(p).getroot().findall('item'):
        product=entry.find('production')
        if product is None:continue
        target=items.get(int(product.get('id')))
        if target is None or '{PvP}' not in target.get('name',''):continue
        ins={int(n.get('id')):int(n.get('count')) for n in entry.findall('ingredient')}
        if -300 not in ins:continue
        source=next((items[i] for i in ins if i>0 and i!=57 and i in items and items[i].get('type') in ['Weapon','Armor']),None)
        if source is None:continue
        rows=[{'id':int(s.get('id')),'level':int(s.get('level'))} for s in target.findall('.//skill')]
        srcids={int(s.get('id')) for s in source.findall('.//skill')};rows=[s for s in rows if s['id'] not in srcids]
        needed.update(s['id'] for s in rows)
        pairs.append({'from':int(source.get('id')),'to':int(target.get('id')),'name':source.get('name'),'pvpName':target.get('name'),'gold':ins.get(57,0),'fame':ins.get(-300,0),'skills':rows})
def tree(n):return {'tag':n.tag,**n.attrib,**({'value':n.text.strip()} if n.text and n.text.strip() else {}),**({'children':[tree(c) for c in n]} if len(n) else {})}
for p in Path('.tmp/l2-high-five/all-skills').rglob('*.xml'):
    for s in E.parse(p).getroot().findall('skill'):
        id=int(s.get('id'))
        if id in needed or id in range(5681,5688):
            row={'id':id,'name':s.get('name'),'levels':int(s.get('levels','1')),'operate':s.findtext('operateType','P'),'fields':{c.tag:c.text.strip() for c in s if not len(c) and c.text and c.text.strip()},'tables':{t.get('name'):t.text.split() for t in s.findall('table') if t.text},'effects':[tree(e) for e in s.findall('./effects/effect')]}
            (passives if id in needed else triggers)[id]=row
Path('template/l2PvpConversions.js').write_text('// Imported H5 PvP conversion costs and added passives.\nexport const PVP_CONVERSIONS='+json.dumps(pairs,ensure_ascii=False)+';\nexport const PVP_PASSIVES='+json.dumps(passives,ensure_ascii=False)+';\nexport const PVP_TRIGGERS='+json.dumps(triggers,ensure_ascii=False)+';\n',encoding='utf-8')
print('Imported',len(pairs),'conversions and',len(passives),'passives')
