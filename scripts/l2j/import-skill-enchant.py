"""Import High Five enchant groups and per-skill routes from the original XML.
Usage: python scripts/l2j/import-skill-enchant.py <skills-dir> <EnchantSkillGroups.xml>
No inferred percentages or generated costs.
"""
import json, re, sys
from pathlib import Path
import xml.etree.ElementTree as ET

def scalar(value):
    try: return float(value) if '.' in value else int(value)
    except ValueError: return value

groups = {}
for group in ET.parse(sys.argv[2]).getroot().findall('group'):
    groups[group.get('id')] = [{k: int(v) for k, v in step.attrib.items()} for step in group.findall('enchant')]
skills = {}
for path in Path(sys.argv[1]).rglob('*.xml'):
    for skill in ET.parse(path).getroot().findall('skill'):
        routes = {int(k[12:]): int(v) for k,v in skill.attrib.items() if re.fullmatch(r'enchantGroup\d+',k)}
        if not routes: continue
        tables = {t.get('name'): [scalar(x) for x in (t.text or '').split()] for t in skill.findall('table')}
        def resolve(value,index):
            if value in tables:
                values=tables[value]
                return values[min(index,len(values)-1)] if values else None
            return scalar(value)
        def fields(prefix,index):
            return {e.get('name'):resolve((e.text or '').strip(),index) for e in skill if e.tag==prefix and e.get('name') and len(e)==0}
        def node(e,index):
            return {'tag':e.tag,**e.attrib,**({'value':resolve((e.text or '').strip(),index)} if (e.text or '').strip() else {}),**({'children':[node(n,index) for n in e]} if len(e) else {})}
        def effects(tag,index):
            return [{**node(e,index),'stats':[{**n.attrib,'op':n.tag,'value':resolve((n.text or '').strip(),index)} for n in e if 'stat' in n.attrib]} for e in skill.findall('./'+tag+'/effect')]
        base={e.tag:resolve((e.text or '').strip(),int(skill.get('levels','1'))-1) for e in skill if len(e)==0 and not e.tag.startswith('enchant') and e.tag!='table'}
        skills[skill.get('id')]={'name':skill.get('name'),'baseLevel':int(skill.get('levels','1')),'base':base,'baseEffects':effects('effects',int(skill.get('levels','1'))-1),'routes':{r:{'group':g,'steps':[{'fields':fields('enchant'+str(r),i),'effects':effects('enchant'+str(r)+'effects',i)} for i in range(len(groups[str(g)]))]} for r,g in routes.items()}}
out={'source':'https://github.com/danielbarion/HighFive','chronicle':'High Five','groups':groups,'skills':skills}
Path('template/l2SkillEnchantData.js').write_text('// Imported original High Five skill enchant tables. See scripts/l2j/import-skill-enchant.py.\nexport default '+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
print('Imported',len(skills),'skills,',len(groups),'groups')
