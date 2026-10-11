"""Import item eligibility and innate cloak defenses from the audited H5 XML snapshot."""
import json
from pathlib import Path
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[2]
eligible, cloaks = {}, {}
resists = {}
attacks = {}
for path in (root / '.tmp/hf-npcs').glob('*.xml'):
    for npc in ET.parse(path).getroot().findall('npc'):
        attack=npc.find('stats/attribute/attack')
        if attack is not None:attacks[npc.get('id')]={str(attack.get('type','')).lower():float(attack.get('value',0))}
        defense=npc.find('stats/attribute/defence')
        if defense is not None:resists[npc.get('id')]={k:float(v) for k,v in defense.attrib.items()}
for path in (root / '.tmp/l2-high-five/items').rglob('*.xml'):
    for item in ET.parse(path).getroot().findall('item'):
        data = {s.get('name'): s.get('val') for s in item.findall('set')}
        if data.get('element_enabled') == 'true':
            eligible[item.get('name')] = int(item.get('id'))
        if 21716 <= int(item.get('id', 0)) <= 21721:
            values = {}
            for s in item.findall('.//stat'):
                if s.get('type', '').endswith('Res'):
                    values[s.get('type')[:-3]] = float(s.text)
            cloaks[item.get('name')] = {'id': int(item.get('id')), 'resist': values}
(root / 'template/l2AttributeRules.js').write_text(
    '// Generated from High Five XML commit 9fb01cb20513e55190cdde8d91e41be2c0914f84.\n'
    + 'export const ATTRIBUTE_ITEMS = ' + json.dumps(eligible, ensure_ascii=False) + ';\n'
    + 'export const CLOAK_ATTRIBUTES = ' + json.dumps(cloaks, ensure_ascii=False) + ';\n'
    + 'export const NPC_ATTRIBUTE_ATTACKS = ' + json.dumps(attacks) + ';\n'
    + 'export const NPC_ATTRIBUTES = ' + json.dumps(resists) + ';\n', encoding='utf-8')
print(f'Imported {len(eligible)} eligible items and {len(cloaks)} cloaks')
