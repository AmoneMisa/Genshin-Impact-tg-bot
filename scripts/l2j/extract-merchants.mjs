// Real High Five merchant supply for the game's merchants.
//
//   node scripts/l2j/extract-merchants.mjs <buylists dir> <items dir> <multisell dir> <npcs dir>
//
// buylists dir : data/buylists of a High Five datapack (<npc> ... <item id price?> per list)
// items dir    : data/stats/items (names, grades, default shop prices, icons)
// multisell dir: data/multisell (Merchant of Mammon 311132501, Priest of Dawn 500: Ancient Adena prices)
// npcs dir     : data/stats/npcs (the title of a merchant tells which kind of shop its list is)
// Writes template/merchantData.js: the town equipment prices of the catalog items, the town materials and recipe books
// the real recipes need, and the Ancient Adena stock of the Mammon merchants.
import fs from 'node:fs';
import path from 'node:path';
import {getCatalog} from '../../functions/game/equipment/catalog.js';
import recipes from '../../template/l2Recipes.js';
import {realRecipeByName, splitIngredients, intermediateRecipes} from '../../functions/game/equipment/realRecipes.js';

const [buyDir, itemDir, sellDir, npcDir] = process.argv.slice(2);
if (!buyDir || !itemDir || !sellDir || !npcDir) { console.error('usage: node scripts/l2j/extract-merchants.mjs <buylists> <items> <multisell> <npcs>'); process.exit(1); }
const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const clean = name => name.replaceAll('&apos;', "'");

const items = new Map();
for (const file of walk(itemDir).filter(f => f.endsWith('.xml'))) {
  for (const m of fs.readFileSync(file, 'utf8').matchAll(/<item id="(\d+)" type="(\w+)" name="([^"]+)">([\s\S]*?)<\/item>/g)) {
    const set = name => m[4].match(new RegExp(`<set name="${name}" val="([^"]*)"`))?.[1];
    const sp = m[4].match(/Recharges SP by ([\d,]+)/)?.[1];
    items.set(+m[1], {id: +m[1], type: m[2], name: clean(m[3]), grade: set('crystal_type') || 'NONE', body: set('bodypart') || '', etc: set('etcitem_type') || '', price: +(set('price') || 0), icon: set('icon') || '', sp: sp ? +sp.replaceAll(',', '') : 0});
  }
}

// ---- town merchants: the ordinary shops of the towns (weapon, armor, accessory, grocer, trader, blacksmith ...) with the
// lowest price an item is sold for. Test helpers, pet, fishing and spellbook shops are left out.
const NOT_SHOPS = /\((?:Test Server Helper|Pet Manager|Fishing Guild Member|Wharf Manager|Spellbook Seller|Amulet Seller)\)/;
const shopNpcs = new Set();
for (const file of fs.readdirSync(npcDir).filter(f => f.endsWith('.xml'))) {
  for (const m of fs.readFileSync(path.join(npcDir, file), 'utf8').matchAll(/<npc id="(\d+)"[^>]*? name="([^"]*)"(?: title="([^"]*)")?/g)) {
    if (+m[1] >= 30000 && +m[1] < 32000 && !NOT_SHOPS.test(`(${m[3] || ''})`)) shopNpcs.add(m[1]);
  }
}
const town = new Map();
for (const file of fs.readdirSync(buyDir).filter(f => f.endsWith('.xml'))) {
  const text = fs.readFileSync(path.join(buyDir, file), 'utf8');
  // lists without an npc (the blacksmiths' recipe lists, ids 30000-31999) are opened by bypass
  const npcs = [...text.matchAll(/<npc>(\d+)<\/npc>/g)].map(m => m[1]);
  const recipeList = !npcs.length && +file.replace('.xml', '') >= 30000 && +file.replace('.xml', '') < 32000;
  if (!recipeList && !npcs.some(id => shopNpcs.has(id))) continue;
  for (const m of text.matchAll(/<item id="(\d+)"(?: count="\d+")?(?: price="(\d+)")?/g)) {
    const item = items.get(+m[1]);
    if (!item) continue;
    const price = +m[2] > 0 ? +m[2] : item.price; // price="0" means the item's own shop price
    if (price > 0 && (!town.has(item.id) || town.get(item.id) > price)) town.set(item.id, price);
  }
}
const townByName = new Map([...town].map(([id, price]) => [items.get(id).name.toLowerCase(), {id, price}]));

// ---- equipment: the catalog items of the grades town merchants sell (no grade, D, C). An item whose name High Five
// does not sell is priced like the matched items of its grade: the median of real price / catalog value.
const median = list => [...list].sort((a, b) => a - b)[list.length >> 1];
const catalog = getCatalog().filter(entry => ['noGrade', 'D', 'C'].includes(entry.grade));
const equipment = {};
const ratios = {};
for (const item of catalog) {
  const real = townByName.get(item.name.toLowerCase());
  if (real) (ratios[item.grade] ||= []).push(real.price / item.cost);
}
for (const item of catalog) {
  const real = townByName.get(item.name.toLowerCase());
  equipment[item.id] = real
    ? {price: real.price, realId: real.id}
    : {price: Math.round(item.cost * median(ratios[item.grade] || [100]) / 100) * 100, realId: null, estimated: true};
}

// ---- recipe books of the recipes the game can craft (catalog items and what they are made of) and the gemstones
// of the grades town merchants sell; most crafting goods are not sold in High Five, they drop or are crafted
const direct = getCatalog().map(item => realRecipeByName(item.name)).filter(Boolean);
const grocer = [];
for (const recipe of [...direct, ...intermediateRecipes(direct).values()]) {
  const price = town.get(recipe.recipeItem);
  if (price && items.get(recipe.recipeItem) && !grocer.some(([id]) => id === recipe.recipeItem)) grocer.push([recipe.recipeItem, price]);
}
for (const name of ['Gemstone D', 'Gemstone C', 'Gemstone B']) {
  const real = townByName.get(name.toLowerCase());
  if (real) grocer.push([real.id, real.price]);
}
grocer.sort((a, b) => a[0] - b[0]);

// ---- Ancient Adena merchants (Merchant of Mammon, Priest of Dawn)
const mammon = [];
for (const [file, merchant] of [['311132501.xml', 'mammon'], ['500.xml', 'priest']]) {
  const found = walk(sellDir).find(f => f.endsWith(path.sep + file));
  if (!found) continue;
  for (const m of fs.readFileSync(found, 'utf8').matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const ing = [...m[1].matchAll(/<ingredient count="(\d+)" id="(\d+)"/g)].map(x => [+x[2], +x[1]]);
    const prod = [...m[1].matchAll(/<production count="(\d+)" id="(\d+)"/g)].map(x => [+x[2], +x[1]]);
    const aa = ing.find(([id]) => id === 5575), adena = ing.find(([id]) => id === 57);
    if (!prod.length || (!aa && !adena)) continue;
    mammon.push({merchant, product: prod[0][0], amount: prod[0][1], aa: aa?.[1] || 0, adena: adena?.[1] || 0, items: ing.filter(([id]) => id !== 5575 && id !== 57)});
  }
}

const used = new Set([...grocer.map(([id]) => id), ...mammon.flatMap(row => [row.product, ...row.items.map(([id]) => id)]), ...Object.values(equipment).filter(Boolean).map(row => row.realId)]);
const itemsOut = {};
for (const id of used) { const it = items.get(id); if (it) itemsOut[id] = [it.name, it.type, it.grade, it.price, it.etc, it.icon, it.sp || 0]; }

const out = {equipment, grocer, mammon, items: itemsOut};
fs.writeFileSync('template/merchantData.js', `// Real High Five merchant supply. Generated by scripts/l2j/extract-merchants.mjs.\n// equipment: catalog id -> real town price in adena (null: no real item of that name);\n// grocer: [item id, adena price] of the materials and recipe books real recipes use; mammon: Ancient Adena rows.\nexport default ${JSON.stringify(out)};\n`);
console.log({equipment: Object.keys(equipment).length, priced: Object.values(equipment).filter(Boolean).length, grocer: grocer.length, mammon: mammon.length, items: Object.keys(itemsOut).length});
