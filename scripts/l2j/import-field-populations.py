"""Add source populations to existing Atlas fields, one reviewable location at a time."""
from pathlib import Path
import json, sys, hashlib, re
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
# Reuse only the source reader/builders; never execute the vertical-zone import.
helper = ROOT / 'scripts/l2j/import-location-levels.py'
scope = {'__file__': str(helper)}
exec(compile(helper.read_text(encoding='utf-8').split('# Source spawn-height bands')[0], str(helper), 'exec'), scope)
DATA, NPCS = scope['DATA'], scope['NPCS']
# Read the pinned archive directly. The legacy cache contains normalized type names
# and flattened drop groups, so its byte hash is not the source archive hash.
NPCS = {n.get('id'): n for p in (DATA / 'stats/npcs').glob('*.xml') for n in scope['E'].parse(p).findall('npc')}
for npc in NPCS.values():
 for table in npc.findall('dropLists/*'):
  for group in list(table.findall('group')):
   for item in group.findall('item'):
    item.set('chance', str(float(item.get('chance')) * float(group.get('chance')) / 100))
    table.append(item)
   table.remove(group)
scope['NPCS'] = NPCS
FIELDS = [
 ('plains-of-dion', 'Равнины Диона', 'Dion/PlainsOfDion.xml', 'woodland'),
 ('cruma-marshlands', 'Болота Крумы', 'Dion/CrumaMarshlands.xml', 'marsh'),
 ('turek-orcs', 'Лагерь орков Турек', 'Gludin/TurekOrcs.xml', 'woodland'),
 ('brekas-stronghold', 'Крепость Брека', 'Giran/BrekasStronghold.xml', 'woodland'),
 ('alligator-beach', 'Берег Аллигаторов', 'Innadril/AlligatorBeach.xml', 'woodland'),
 ('sea-of-spores', 'Море Спор', 'Oren/SeaOfSpores.xml', 'marsh'),
 ('timak-outpost', 'Застава Тимак', 'Oren/TimakOutpost.xml', 'woodland'),
 ('plains-of-glory', 'Равнины Славы', 'Aden/PlainsOfGlory.xml', 'woodland'),
 ('outlaw-forest', 'Лес Изгоев', 'Oren/OutlawForest.xml', 'woodland'),
 ('fields-of-massacre', 'Поля Резни', 'Aden/FieldsOfMassacre.xml', 'woodland'),
 ('cemetery', 'Кладбище Адена', 'Aden/Cemetery.xml', 'woodland'),
 ('valley-of-saints', 'Долина Святых', 'Rune/ValleyOfSaints.xml', 'woodland'),
 ('blazing-swamp', 'Пылающее болото', 'Aden/BlazingSwamp.xml', 'volcanic'),
 ('swamp-of-screams', 'Болото Криков', 'Rune/SwampOfScreams.xml', 'marsh'),
 ('hot-springs', 'Горячие источники', 'Goddard/HotSprings.xml', 'springs'),
 ('wall-of-argos', 'Стена Аргоса', 'Goddard/WallOfArgos.xml', 'desert'),
 ('ketra-outpost', 'Застава орков Кетра', 'Goddard/KetraOrcOutpost.xml', 'woodland'),
 ('varka-outpost', 'Лагерь силеносов Варка', 'Goddard/VarkaSlenosOutpost.xml', 'desert'),
 ('sel-mahums', 'Лагерь Сел Махум', 'Oren/SelMahums.xml', 'woodland'),
 ('field-of-whispers', 'Поле Шёпота', 'Innadril/FieldOfWhispers.xml', 'marsh'),
 ('talking-island', 'Окрестности Острова Говорящих', 'TalkingIsland/TalkingIslandMonsters.xml', 'woodland'),
 ('elven-fields', 'Эльфийские луга', 'ElvenTerritory/ElvenStarting.xml', 'woodland'),
 ('bee-hive', 'Улей', 'Dion/BeeHive.xml', 'woodland'),
 ('catacomb-heretic', 'Катакомбы Еретиков', 'Catacombs/CatacombOfTheHeretic.xml', 'catacomb'),
 ('catacomb-branded', 'Катакомбы Отлучённых', 'Catacombs/CatacombOfTheBranded.xml', 'catacomb'),
 ('catacomb-apostate', 'Катакомбы Отступников', 'Catacombs/CatacombOfTheApostate.xml', 'catacomb'),
 ('catacomb-witch', 'Катакомбы Ведьм', 'Catacombs/CatacombOfTheWitch.xml', 'catacomb'),
 ('catacomb-dark-omens', 'Катакомбы Тёмных Знамений', 'Catacombs/CatacombOfDarkOmens.xml', 'catacomb'),
 ('necropolis-sacrifice', 'Некрополь Жертвоприношений', 'Catacombs/NecropolisOfSacrifice.xml', 'necropolis'),
 ('necropolis-pilgrims', 'Некрополь Пилигримов', 'Catacombs/NecropolisOfThePilgrims.xml', 'necropolis'),
 ('necropolis-worship', 'Некрополь Поклонения', 'Catacombs/NecropolisOfWorship.xml', 'necropolis'),
 ('necropolis-patriots', 'Некрополь Патриотов', 'Catacombs/NecropolisOfThePatriots.xml', 'necropolis'),
 ('necropolis-devotion', 'Некрополь Посвящения', 'Catacombs/NecropolisOfDevotion.xml', 'necropolis'),
 ('necropolis-martyrdom', 'Некрополь Мучеников', 'Catacombs/NecropolisOfMartyrdom.xml', 'necropolis'),
 ('necropolis-saints', 'Некрополь Святых', 'Catacombs/NecropolisOfTheSaints.xml', 'necropolis'),
 ('necropolis-disciples', 'Некрополь Учеников', 'Catacombs/NecropolisOfTheDisciples.xml', 'necropolis'),
 ('catacomb-forbidden-path', 'Катакомбы Запретного Пути', 'Catacombs/CatacombOfTheForbiddenPath.xml', 'catacomb'),
 ('marsh-zombies', 'Топи зомби', 'Others/19_19.xml', 'marsh'),
 ('dark-forest', 'Тёмный лес', 'DarkElfTerritory/DarkElfStarting.xml', 'woodland'),
 ('vuku-lands', 'Земли орков Вуку', 'Others/19_20.xml', 'woodland'),
]
VUKU_IDS = {'20009', '20011', '20039', '20043', '20049'}
SOURCE_FILTERS = {'vuku-lands': VUKU_IDS}
EXTRA_SOURCES = {
 'dark-forest': [('Others/18_20.xml', {'20021', '20380', '20034', '20038', '20418', '20043'})],
 'vuku-lands': [('Others/19_21.xml', VUKU_IDS)],
}

def module(name):
 return json.loads((ROOT / 'template' / name).read_text(encoding='utf-8-sig').split('export default ', 1)[1].strip().rstrip(';'))

def build(row):
 id, title, file, environment = row
 spawns, selection = [], []
 sourcefiles = [(file, SOURCE_FILTERS.get(id)), *EXTRA_SOURCES.get(id, [])]
 for sourcefile, allowed in sourcefiles:
  rows = scope['rows'](sourcefile, lambda n: scope['hostile'](n) and (allowed is None or n.get('id') in allowed))
  tree = scope['read_source']('spawns/' + sourcefile)
  assert all(g.get('selection') is None and g.get('maximumNpc') is None for g in tree.findall('spawn')), sourcefile
  for s in rows: s['sourceFile'] = 'spawns/' + sourcefile
  spawns.extend(rows)
  selection.append({'file': 'spawns/' + sourcefile, 'npcIds': sorted(allowed, key=int) if allowed else None})
 assert spawns, id
 level = scope['make_level'](1, title, spawns, id, environment)
 ids = sorted({s['id'] for s in spawns}, key=int)
 loot, sp = module('l2Loot.js'), module('l2NpcSp.js')
 items, wanted, dropids = module('l2Items.js'), set(), set()
 for nid in ids:
  drops = NPCS[nid].findall('dropLists/death/item') or NPCS[nid].findall('dropLists/drop/item')
  loot[nid] = [[int(d.get('id')), int(d.get('min')), int(d.get('max')), float(d.get('chance'))] for d in drops if d.get('id') != '57']
  wanted.update(str(d[0]) for d in loot[nid] if str(d[0]) not in items)
  dropids.update(str(d[0]) for d in loot[nid])
  assert nid in sp, 'Missing native SP: ' + nid
  assert float(NPCS[nid].find('acquire').get('sp', '0')) == sp[nid], nid
 iconfile = ROOT / 'webapp/art/l2-gameplay-icons.js'
 icontext = iconfile.read_text(encoding='utf-8')
 match = re.search(r'export const ITEM_ICONS=(.*?);\n', icontext)
 icons = json.loads(match[1])
 missingicons = []
 for p in (DATA / 'stats/items').glob('*.xml'):
  for n in scope['E'].parse(p).findall('item'):
   if n.get('id') not in dropids: continue
   st = {s.get('name'): s.get('val') for s in n.findall('set')}
   if n.get('id') in wanted: items[n.get('id')] = [n.get('name'), n.get('type'), st.get('crystal_type', 'NONE'), int(st.get('price', '0')), st.get('etcitem_type')]
   key = 'l2_' + n.get('id')
   if key in icons: continue
   icon = st.get('icon', '').lower()
   if not icon: missingicons.append([key, None]); continue
   png = Path('C:/Users/kubai/Desktop/icons') / (icon + '.png')
   if not png.exists(): png = png.with_name(icon.replace('.icon.', '.') + '.png')
   if not png.exists(): missingicons.append([key, icon]); continue
   name = icon.replace('.', '-')
   with Image.open(png) as im:
    for size in [32, 64, 128]:
     target = ROOT / f'webapp/art/l2-extra/{name}-{size}.webp'
     if not target.exists(): im.convert('RGBA').resize((size, size), Image.Resampling.NEAREST).save(target, lossless=True)
   icons[key] = name
 assert not [r for r in missingicons if r[1]], missingicons
 iconfile.write_text(icontext[:match.start(1)] + json.dumps(icons, separators=(',', ':')) + icontext[match.end(1):], encoding='utf-8')
 metadata = ROOT / 'docs/item-metadata/icon-import-ids.json'
 imported = json.loads(metadata.read_text(encoding='utf-8'))
 imported.extend(str(id) for id in sorted(map(int, dropids)) if str(id) not in set(map(str, imported)))
 metadata.write_text(json.dumps(imported, separators=(',', ':')) + '\n', encoding='utf-8')
 assert wanted <= items.keys(), 'Missing item metadata'
 for name, value in [('l2Loot.js', loot), ('l2Items.js', items)]:
  p = ROOT / 'template' / name
  if value != module(name):
   db = ROOT / 'db/templates.js'
   key = name[:-3]
   db.write_text(re.sub(r"(key: '" + key + r"', source: " + key + r", version: )(\d+)", lambda m: m[1] + str(int(m[2]) + 1), db.read_text(encoding='utf-8')), encoding='utf-8')
  header = p.read_text(encoding='utf-8').split('export default ', 1)[0]
  p.write_text(header + 'export default ' + json.dumps(value, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
 files = {'spawns/' + f: hashlib.sha256((DATA / 'spawns' / f).read_bytes()).hexdigest() for f, _ in sourcefiles}
 for p in (DATA / 'stats/npcs').glob('*.xml'):
  if any(n.get('id') in ids for n in scope['E'].parse(p).findall('npc')):
   files['stats/npcs/' + p.name] = hashlib.sha256(p.read_bytes()).hexdigest()
 value = {'version': 1, 'floors': [level], 'mobs': [scope['mob'](nid) for nid in ids],
  'source': {'commit': scope['SOURCE_COMMIT'], 'files': files, 'geodataAvailable': False, 'coordinateSpace': 'underground' if file.startswith('Catacombs/') else 'surface', 'missingItemIcons': missingicons}}
 if id in ['marsh-zombies', 'dark-forest', 'vuku-lands']: value['source']['selection'] = selection
 if id in ['marsh-zombies', 'dark-forest']:
  routefile = 'teleporters/town/30134.xml'
  target = 'Swampland' if id == 'marsh-zombies' else 'Dark Forest'
  tree = scope['E'].parse(DATA / routefile)
  group, destination = next((g, n) for g in tree.findall('.//teleport') if g.get('type') == 'NORMAL' for n in g.findall('location') if n.get('name') == target)
  point = {k: int(destination.get(k)) for k in ['x','y','z']}
  fee = int(destination.get('feeCount','0'))
  value['atlas'] = {**point, 'region': 'dark-elven-village', 'entrySource': {**point, 'file': routefile, 'name': target, 'type': group.get('type')},
   'entryRoutes': [{'npcId': 30134, 'npcName': NPCS['30134'].get('name'), 'item': 57, 'fee': fee, 'type': 'NORMAL', 'source': routefile}], 'entryFare': {'item': 57, 'count': fee}, 'teleportGold': fee}
  files[routefile] = hashlib.sha256((DATA / routefile).read_bytes()).hexdigest()
 if id == 'vuku-lands':
  native = [s for s in spawns if s['id'] in ['20009','20011'] and s['coordinateSource'] == 'point']
  cx,cy = sum(s['x'] for s in native)/len(native),sum(s['y'] for s in native)/len(native)
  anchor = min(native,key=lambda s: (s['x']-cx)**2+(s['y']-cy)**2)
  point = {k: anchor[k] for k in ['x','y','z']}
  value['atlas'] = {**point, 'entrySource': {**point, 'file': anchor['sourceFile'], 'npcId': int(anchor['id']), 'coordinateSource': 'point'}, 'entryRoutes': []}
 if 'atlas' in value:
  x,y = value['atlas']['x'],value['atlas']['y']
  value['atlas'].update(polygon=[[x-5000,y-5000],[x+5000,y-5000],[x+5000,y+5000],[x-5000,y+5000]],selectionGeometry='authored-extent')
 return value

folder = ROOT / 'template/field-populations'
folder.mkdir(exist_ok=True)
for row in FIELDS:
 if len(sys.argv) > 1 and row[0] not in sys.argv[1:]: continue
 value = build(row)
 (folder / (row[0] + '.js')).write_text('// Original H5 spawns; room partition is adapted, not client geodata.\nexport default ' + json.dumps(value, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
 print(row[0], len(value['mobs']), 'NPC types;', sum(r['cap'] for r in value['floors'][0]['rooms']), 'slots')
present = [r[0] for r in FIELDS if (folder / (r[0] + '.js')).exists()]
(ROOT / 'template/fieldPopulations.js').write_text('// Existing Atlas fields with source-backed populations.\n' + ''.join(f"import z{i} from './field-populations/{id}.js';\n" for i, id in enumerate(present)) + 'export const FIELD_POPULATIONS = {' + ','.join(json.dumps(id) + f':z{i}' for i, id in enumerate(present)) + '};\n', encoding='utf-8')
lines = ['# Наполнение охотничьих зон', '',
 'Существующие точки Атласа дополнены исходными статическими спавнами High Five. Состав, количество, координаты или полигоны, высоты и таймеры сохраняются; локальная сетка 4×3 — адаптация, не клиентская геодата. Пустые исходные участки не заполняются случайными монстрами.', '',
 '| Локация | Виды NPC | Места появления |', '| --- | ---: | ---: |']
for id, title, _, _ in FIELDS:
 if id not in present: continue
 value = module('field-populations/' + id + '.js')
 lines.append(f"| {title} | {len(value['mobs'])} | {sum(r['cap'] for r in value['floors'][0]['rooms'])} |")
lines.extend(['', 'Окружение переиспользует согласованные рисунки соответствующих локаций. Навигация и цели активных заданий используют Атлас; старое сохранение переносится в исходное население однократно без выдачи наград. Сохранение комнат, здоровья и отложенных возрождений использует общий движок охоты. На телефоне отображается до восьми ближайших целей, на широком экране — до 16; выбранная цель всегда входит в этот набор.', '',
 'Источник: L2J Mobius High Five, commit `9fb01cb20513e55190cdde8d91e41be2c0914f84`. Исходные файлы и SHA-256 записаны в `source.files` каждой локации. Импортёр читает закреплённый архив напрямую, а не нормализованный кеш NPC. SP проверяется против исходного `acquire.sp`. Награды и боевое поведение используют существующий движок проекта: групповые таблицы дропа представлены вероятностями отдельных предметов; взаимное исключение предметов внутри исходной группы не моделируется. Это не перенос всех специальных сценариев NPC.', '',
 'Новые предметы используют оригинальные клиентские иконки. У трав без поля icon в исходном XML пробел перечислен в `source.missingItemIcons`, и похожая картинка им не подставляется.', '',
 'Новые подземелья имеют source.coordinateSpace = underground, наземные зоны — surface. Это отметка пространства исходных спавнов, а не обещание геоданных для бесшовного перехода. Катакомбы и некрополи переносят статические группы XML; недельный цикл Семи Печатей и сценарная смена населения этим импортом не реализуются.', '',
 'Воспроизведение: `python scripts/l2j/import-field-populations.py <zone-id>`; затем обновить AI через `python scripts/l2j/import-npc-ai.py` и хеши seed-таблиц через `node scripts/templates/hash.mjs`. Проверки: `node --test test/field-populations.test.js test/location-levels.test.js test/hunt-exploration.test.js`; мобильный интерфейс — `scripts/ui/check-location-levels.mjs` с перечнем ID в `LOCATION_LEVEL_ZONE`.', ''])
(ROOT / 'docs/field-populations.md').write_text('\n'.join(lines), encoding='utf-8')
