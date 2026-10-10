"""High Five classes: the class list, every class skill tree (active, passive, with level / SP / items), the
clan skill tree, and the numbers of the skills the trees teach.

    python scripts/l2j/extract-classes.py

Reads .tmp/l2-high-five (all-skills, players) and writes template/l2Classes.js:
  classes  {classId: {name, parent}}
  skills   {skillId: {name, levels, op, target, magic, mp[], reuse[], hit[], power[], effects[], stats[], debuff, icon}}
  learn    {classId: [[skillId, level, needLevel, sp, [[itemId, count]]]]}
  clan     [[skillId, level, clanLevel, reputation, [[itemId, count]]]]
"""
import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path('.tmp/l2-high-five')
skills_xml = {}
for p in (ROOT / 'all-skills').rglob('*.xml'):
    for s in ET.parse(p).getroot().findall('skill'):
        skills_xml[int(s.get('id'))] = s


def tables(s):
    return {t.get('name'): (t.text or '').split() for t in s.findall('table')}


def number(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def per_level(s, raw, levels):
    """A value of a skill as a list by level: a #table reference, a constant, or None."""
    if raw is None:
        return None
    raw = raw.strip()
    if raw.startswith('#'):
        table = tables(s).get(raw)
        if not table:
            return None
        values = [number(v) for v in table]
        if any(v is None for v in values):
            return None
        if len(values) < levels:
            values += [values[-1]] * (levels - len(values))
        return values[:levels]
    value = number(raw)
    return [value] * levels if value is not None else None


def field(s, tag):
    e = s.find(tag)
    return e.text.strip() if e is not None and e.text else None


def stat_nodes(s, levels):
    """The stat changes of a skill's effects: [{tag, stat, value[], when}] (when = the weapon / armor kind it needs)."""
    rows = []
    for effect in s.findall('./effects/effect'):
        for node in effect.iter():
            stat = node.get('stat')
            if not stat or node.tag not in ('add', 'mul', 'sub', 'set', 'basemul'):
                continue
            raw = node.get('value')
            if raw is None and node.find('value') is not None:
                raw = node.find('value').text
            if raw is None and node.text and node.text.strip():
                raw = node.text.strip()
            values = per_level(s, raw, levels)
            if values is None:
                continue
            when = []
            for cond in node.iter():
                if cond.tag == 'using' and cond.get('kind'):
                    when.append(cond.get('kind'))
                if cond.tag == 'player' and cond.get('hp'):
                    when.append('hp<=' + cond.get('hp'))
            rows.append({'tag': node.tag, 'stat': stat, 'value': values, **({'when': when} if when else {})})
    return rows


used = {}


def record(skill_id):
    if skill_id in used:
        return used[skill_id]
    s = skills_xml.get(skill_id)
    if s is None:
        return None
    levels = int(s.get('levels', '1'))
    effects = [e.get('name') for e in s.findall('./effects/effect')]
    power = None
    for e in s.findall('./effects/effect'):
        if power is None and e.get('name') in ('PhysicalDamage', 'MagicalDamage', 'FatalBlow', 'HpDrain', 'PhysicalSoulDamage', 'MagicalSoulDamage', 'Heal', 'HealPercent', 'Resurrection'):
            node = e.find('power')
            power = per_level(s, node.text if node is not None and node.text else None, levels)
    if power is None:
        power = per_level(s, field(s, 'power'), levels)
    mp = per_level(s, field(s, 'mpConsume'), levels)
    init = per_level(s, field(s, 'mpInitialConsume'), levels)
    if mp and init:
        mp = [a + b for a, b in zip(mp, init)]
    icon = field(s, 'icon') or ''
    if icon.startswith('#'):
        t = tables(s).get(icon)
        icon = t[0] if t else ''
    used[skill_id] = {
        'name': s.get('name'),
        'levels': levels,
        'op': field(s, 'operateType') or 'A1',
        'target': field(s, 'targetType'),
        'magic': field(s, 'isMagic'),
        'mp': mp,
        'reuse': per_level(s, field(s, 'reuseDelay'), levels),
        'hit': per_level(s, field(s, 'hitTime'), levels),
        'power': power,
        'effects': effects,
        'stats': stat_nodes(s, levels),
        'debuff': field(s, 'isDebuff') in ('true', '#isDebuff'),
        'icon': icon.lower(),
    }
    return used[skill_id]


players = next(p for p in (ROOT / 'players').rglob('players') if p.is_dir() and (p / 'classList.xml').exists())
classes = {}
for row in ET.parse(players / 'classList.xml').getroot().findall('class'):
    classes[row.get('classId')] = {'name': row.get('name'), 'parent': row.get('parentClassId')}

learn = {}
for p in players.joinpath('skillTrees').rglob('*.xml'):
    if p.parent.name not in ('StartingClass', '1stClass', '2ndClass', '3rdClass'):
        continue
    for t in ET.parse(p).getroot().findall('skillTree'):
        if t.get('type') != 'classSkillTree':
            continue
        rows = learn.setdefault(t.get('classId'), [])
        for s in t.findall('skill'):
            skill_id = int(s.get('skillId'))
            if record(skill_id) is None:
                continue
            items = [[int(i.get('id')), int(i.get('count'))] for i in s.findall('item')]
            rows.append([skill_id, int(s.get('skillLevel')), int(s.get('getLevel')), int(s.get('levelUpSp', '0')), items])

clan = []
pledge = players / 'skillTrees' / 'pledgeSkillTree.xml'
for s in ET.parse(pledge).getroot().iter('skill'):
    if s.get('skillId') is None or record(int(s.get('skillId'))) is None:
        continue
    clan.append([
        int(s.get('skillId')), int(s.get('skillLevel', '1')), int(s.get('getLevel', '0')),
        int(s.get('levelUpSp', '0')), [[int(i.get('id')), int(i.get('count'))] for i in s.findall('item')],
    ])

out = {'classes': classes, 'skills': {str(k): v for k, v in sorted(used.items())}, 'learn': learn, 'clan': clan}
Path('template/l2Classes.js').write_text(
    '// High Five classes, class skill trees, skill numbers and the clan skill tree. Generated by scripts/l2j/extract-classes.py.\n'
    'export default ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print(len(classes), 'classes', len(used), 'skills', sum(len(v) for v in learn.values()), 'learn rows', len(clan), 'clan rows')
