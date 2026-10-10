// Builds docs/l2-image-references.md: which images the game needs, with the real Lineage II (High Five) item icon of
// each one, and which existing images should be redrawn after the Lineage II originals.
//
//   node scripts/l2j/image-references.mjs <items dir of the datapack>
import fs from 'node:fs';
import path from 'node:path';
import {getCatalog} from '../../functions/game/equipment/catalog.js';
import {CATALOG_ITEM_ART} from '../../webapp/art/catalog-item-art.js';
import merchantData from '../../template/merchantData.js';
import {LOOT_KINDS} from '../../functions/game/hunt/lootTable.js';
import {MERCHANTS, merchantStock} from '../../functions/game/shop/merchants.js';

const itemDir = process.argv[2];
if (!itemDir) { console.error('usage: node scripts/l2j/image-references.mjs <datapack stats/items dir>'); process.exit(1); }
const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const byName = new Map();
const byId = new Map();
for (const file of walk(itemDir).filter(f => f.endsWith('.xml'))) {
  for (const m of fs.readFileSync(file, 'utf8').matchAll(/<item id="(\d+)" type="(\w+)" name="([^"]+)">([\s\S]*?)<\/item>/g)) {
    const row = {id: +m[1], type: m[2], name: m[3].replaceAll('&apos;', "'"), icon: m[4].match(/<set name="icon" val="([^"]*)"/)?.[1] || '', grade: m[4].match(/<set name="crystal_type" val="([^"]*)"/)?.[1] || 'NONE'};
    byId.set(row.id, row);
    if (!byName.has(row.name.toLowerCase())) byName.set(row.name.toLowerCase(), row);
  }
}
const icon = name => byName.get(String(name).toLowerCase())?.icon.replace(/^icon\./, '') || '—';
const ref = name => `${name} — \`${icon(name)}\``;
const exists = key => ['128', '256'].every(size => fs.existsSync(`webapp/art/items/v1/${key}-${size}.webp`));
const lines = [];
const out = (...rows) => lines.push(...rows);
const table = (head, rows) => out(`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map(row => `| ${row.join(' | ')} |`), '');

out('# Изображения: что нужно нарисовать и что заменить на Lineage 2',
  '',
  'Сгенерировано `scripts/l2j/image-references.mjs` из данных L2J Mobius CT 2.6 High Five. Колонка «Референс L2» — настоящее имя предмета и',
  'имя его иконки в клиенте (`icon.<имя>`, файл `Icon.<имя>` пакета интерфейса; размер оригинала 32×32). Игра рисует иконки 128/256 px',
  '(`webapp/art/icons`, `webapp/art/items/v1`), поэтому референс нужен как образец силуэта и цвета, а не как готовый файл.',
  '');

// ---- 1. new
out('## 1. Нужно нарисовать (новые)', '');
out('### 1.1 Торговцы (экран «Торговцы»)', '', 'Баннер 3:2 на торговца (как у зон охоты) и иконка раздела.', '');
table(['Торговец', 'Игровой id', 'Образ из L2 (NPC High Five)', 'Что сидит на прилавке'], [
  ['Торговец оружием', 'weapons', 'Lector, Weapon Merchant (Talking Island); Altran, Pinter — кузнецы', 'мечи, луки, посохи без грейда, D, C'],
  ['Торговец доспехами', 'armor', 'Jackson, Armor Merchant', 'шлемы, нагрудники, перчатки, сапоги, щиты'],
  ['Торговец бижутерией', 'jewelry', 'Silvia, Accessory Merchant', 'кольца, серьги, ожерелья'],
  ['Лавка мастеров', 'alchemist', 'Blueprint Seller (Dwarf), Mineral Trader', 'самоцветы D/C/B, книги рецептов, лак Маммона'],
  ['Торговец Маммона', 'mammon', 'Merchant of Mammon, Priest of Dawn, Blacksmith of Mammon (Aden, Seven Signs)', 'самоцветы A/S, свитки заточки, свитки ОП'],
]);

out('### 1.2 Группа', '', 'Эмблема экрана и три значка режима добычи (как в окне группы L2: «Looting Method»).', '');
table(['Что', 'Игровой id', 'Референс L2'], [
  ['Эмблема группы', 'party', 'кнопка «Party Matching» системного меню L2: три силуэта героев в круге'],
  ['Режим «Нашедшему»', 'finders', 'Finder\'s Keepers (меню группы)'],
  ['Режим «Случайно»', 'random', 'Random (в L2 — кубик)'],
  ['Режим «По очереди»', 'turn', 'By Turn (стрелка по кругу)'],
  ['Лидер', 'leader', 'значок лидера группы в рамке Party'],
]);

out('### 1.3 Категории дропа', '', 'Иконка заголовка группы в списке дропа и в инвентаре.', '');
const kindRef = {
  full: 'Short Sword', piece: 'Sealed Dynasty Breast Plate Piece', recipe: 'Recipe: Willow Staff', scroll: 'Scroll: Enchant Weapon (S-Grade)',
  lifestone: 'Life Stone - Level 76', attribute: 'Fire Stone', seal: 'Blue Seal Stone', dye: 'Dye of STR (Str+1 Con-1)', crystal: 'Crystal (S-Grade)',
  material: 'Iron Ore', consumable: 'Greater Healing Potion', herb: 'Herb of Life', other: 'Adena',
};
table(['Категория', 'Id', 'Референс L2'], LOOT_KINDS.map(kind => [kind.label, kind.id, ref(kindRef[kind.id] || 'Adena')]));

out('### 1.4 Предметы, у которых нет своей иконки (показывается общий значок)', '');
const seen = new Set();
const needed = [];
for (const [id, row] of Object.entries(merchantData.items)) {
  const [name, type, , , etc] = row;
  if (type === 'EtcItem' || etc) {
    const key = /^Recipe/.test(name) ? 'recipe-book' : name;
    if (!seen.has(key)) { seen.add(key); needed.push([name, key, icon(name)]); }
  }
}
table(['Предмет (реальный)', 'Где продаётся', 'Иконка L2'], [
  ...['Gemstone D', 'Gemstone C', 'Gemstone B', 'Gemstone A', 'Gemstone S'].map(name => [name, 'Лавка мастеров / Маммон', `\`${icon(name)}\``]),
  ...['Blank Scroll', "Mammon's Varnish Enhancer", 'SP Scroll (Low-Grade)', 'SP Scroll (Medium-Grade)', 'SP Scroll (High Grade)'].map(name => [name, 'Маммон / Лавка мастеров', `\`${icon(name)}\``]),
  ['Recipe: … (книга рецепта, одна общая иконка + цвет грейда)', 'Лавка мастеров', `\`${icon('Recipe: Willow Staff')}\``],
]);
void needed;

out('### 1.5 Предметы каталога без картины', '', 'Снаряжение, для которого в `webapp/art/items/v1` нет пары `catalog-<грейд>-<тип>-128/256.webp`.', '');
const missing = [];
for (const item of getCatalog()) {
  const art = CATALOG_ITEM_ART.find(entry => entry.id === item.id);
  if (!art || !exists(art.key)) {
    const real = byName.get(item.name.toLowerCase());
    missing.push([item.grade === 'noGrade' ? 'NG' : item.grade, `\`${item.id}\``, item.name, real ? `\`${real.icon.replace(/^icon\./, '')}\`` : '— (ближайший образец того же слота и грейда)']);
  }
}
out(`Не хватает: **${missing.length}** из ${getCatalog().length}.`, '');
table(['Грейд', 'Id каталога', 'Название', 'Иконка L2'], missing);

// ---- 2. replace
out('## 2. Заменить на оригиналы Lineage 2', '',
  'Эти изображения уже есть в игре, но нарисованы «по мотивам». Список — что перерисовать под настоящие иконки L2.', '');

out('### 2.1 Расходники и материалы (`webapp/art/icons`)', '');
const grades = ['D', 'C', 'B', 'A', 'S'];
table(['Файл игры', 'Ключи', 'Референс L2 по грейдам'], [
  ['`scroll-*.webp`', '`scroll_<грейд>`', grades.map(g => `${g}: \`${icon(`Scroll: Enchant Weapon (${g}-Grade)`)}\``).join('<br>')],
  ['`scroll-blessed-*.webp`', '`blessed_<грейд>`', grades.map(g => `${g}: \`${icon(`Blessed Scroll: Enchant Weapon (${g}-Grade)`)}\``).join('<br>')],
  ['`scroll-safe-*.webp`', '`safe_<тип>_<грейд>`', `Crystal Scroll: \`${icon('Crystal Scroll: Enchant Weapon (S-Grade)')}\`; в L2 есть «Ancient Crystal Enchant» (иконка по названию в клиенте)`],
  ['`crystal-*.webp`', '`crystal_<грейд>`', grades.map(g => `${g}: \`${icon(`Crystal (${g}-Grade)`)}\``).join('<br>')],
  ['`lifestone-*.webp`', '`lifestone_<ступень>_<грейд>`', ['Life Stone - Level 46', 'Mid-Grade Life Stone - Level 46', 'High-Grade Life Stone - Level 46', 'Top-Grade Life Stone - Level 46'].map(n => `${n}: \`${icon(n)}\``).join('<br>')],
  ['`attr-stone/crystal/jewel-*.webp`', '`attr_<ступень>_<стихия>`', ['Fire Stone', 'Water Stone', 'Fire Crystal', 'Fire Jewel'].map(n => `${n}: \`${icon(n)}\``).join('<br>')],
  ['`soulshot-*.webp`', '`soulshot_<грейд>`', ['Soulshot: No Grade', 'Soulshot (D-Grade)', 'Soulshot (S-Grade)'].map(n => `${n}: \`${icon(n)}\``).join('<br>')],
  ['`spiritshot-*.webp`', '`spiritshot_<грейд>`', ['Spiritshot: No Grade', 'Spiritshot (D-Grade)', 'Spiritshot (S-Grade)'].map(n => `${n}: \`${icon(n)}\``).join('<br>')],
  ['`blessed-spiritshot-*.webp`', '`blessed_spiritshot_<грейд>`', ['Blessed Spiritshot: No Grade', 'Blessed Spiritshot (D-Grade)', 'Blessed Spiritshot (S-Grade)'].map(n => `${n}: \`${icon(n)}\``).join('<br>')],
  ['`gem-*.webp`', '`craft_gem_<грейд>` (самоцветы)', ['Gemstone D', 'Gemstone C', 'Gemstone B', 'Gemstone A', 'Gemstone S'].map(n => `${n}: \`${icon(n)}\``).join('<br>')],
  ['`binder/leather/fiber-*.webp`', '`craft_binder/leather/fiber_<грейд>`', ['Stem', 'Leather', 'Thread', 'Cokes', 'Varnish of Purity'].map(n => `${n}: \`${icon(n)}\``).join('<br>')],
  ['(камни печати рисуются кристаллом)', '`seal_blue/green/red`', ['Blue Seal Stone', 'Green Seal Stone', 'Red Seal Stone', 'Ancient Adena'].map(n => `${n}: \`${icon(n)}\``).join('<br>')],
  ['(кристаллы души рисуются кристаллом)', '`soul_<цвет>_<ступень>`', ['Red Soul Crystal - Stage 1', 'Green Soul Crystal - Stage 1', 'Blue Soul Crystal - Stage 1', 'Red Soul Crystal - Stage 13'].map(n => `${n}: \`${icon(n)}\``).join('<br>')],
  ['`egg-*.webp`', '`egg_wyvern/dragon/ancient`', 'в L2 таких предметов нет (яйца придуманы проектом): оставить или заменить на Dragon Scale / Wyvern Skin из материалов рейдов'],
]);

out('### 2.2 Валюты', '');
table(['Валюта', 'Где в игре', 'Референс L2'], [
  ['Адена (золото)', 'кошелёк, цены', ref('Adena')],
  ['Древняя адена (AA)', 'кошелёк торговцев, распечатка', ref('Ancient Adena')],
  ['Кристаллы грейда', 'материалы, заточка', ref('Crystal (D-Grade)')],
]);

out('### 2.3 Снаряжение (`webapp/art/items/v1/catalog-*`)', '',
  'Все картины каталога нарисованы «по типу», а не с реального предмета. Для каждого предмета с реальным соответствием — иконка оригинала:', '');
const equipmentRows = [];
for (const item of getCatalog()) {
  const real = byName.get(item.name.toLowerCase());
  equipmentRows.push([item.grade === 'noGrade' ? 'NG' : item.grade, item.name, `\`${item.id}\``, real ? `\`${real.icon.replace(/^icon\./, '')}\`` : '—']);
}
table(['Грейд', 'Предмет', 'Id', 'Иконка L2'], equipmentRows);

out('### 2.4 Старые линии без привязки к каталогу', '',
  'В `webapp/art/items/v1` лежат серии, которых нет в каталоге (`amulet-*`, `anklets-*`, `bracers-*`, `armor-nightweave`, `armor-opal`, …). Они не соответствуют ни одному предмету L2; '
  + 'либо заменить иконками реальных предметов (амулеты — Talisman/Cloak; браслеты — Bracelet), либо убрать из выдачи.', '');

fs.writeFileSync('docs/l2-image-references.md', lines.join('\n'));
console.log('docs/l2-image-references.md', lines.length, 'lines; catalog items without art:', missing.length);
void MERCHANTS; void merchantStock;
