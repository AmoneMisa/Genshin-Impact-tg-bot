// Real High Five fishing: the rods, the fish that can be caught and what a fish turns into when it is opened.
//
//   node scripts/l2j/extract-fishing.mjs <fishes.xml> <fishingRods.xml> <skills 02100-02199.xml> <items dir> <buylists dir> <fishingSkillTree.xml>
//
// Writes template/fishingData.js:
//   rods     [{item, name, level, damage, price}]  (in the order no grade, D, C, B, A, S)
//   shots    {grade: item id of the fishing shot}
//   fish     [{item, name, group, level, bite, grade, price}]
//   capsules {fishItemId: [[itemId, count, chance %], ...]}   one of the products is given by chance
//   items    {id: [name, price, etc]}                          the fish and the things they turn into
//   recipes  [[recipeItemId, adena]]                           dye recipes the Fishermen's Guild sells
import fs from 'node:fs';
import path from 'node:path';

const [fishFile, rodFile, skillFile, itemDir, buyDir, treeFile] = process.argv.slice(2);
if (!treeFile) { console.error('usage: node scripts/l2j/extract-fishing.mjs <fishes> <rods> <skills> <items dir> <buylists dir> <fishingSkillTree.xml>'); process.exit(1); }
const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const clean = name => name.replaceAll('&apos;', "'");

const items = new Map();
for (const file of walk(itemDir).filter(f => f.endsWith('.xml'))) {
  for (const m of fs.readFileSync(file, 'utf8').matchAll(/<item id="(\d+)" type="(\w+)" name="([^"]+)">([\s\S]*?)<\/item>/g)) {
    const set = name => m[4].match(new RegExp(`<set name="${name}" val="([^"]*)"`))?.[1];
    items.set(+m[1], {id: +m[1], name: clean(m[3]), price: +(set('price') || 0), etc: set('etcitem_type') || '', skill: m[4].match(/<skill id="(\d+)" level="(\d+)"/)?.slice(1).map(Number) || null});
  }
}

const fish = [...fs.readFileSync(fishFile, 'utf8').matchAll(/<fish fishId="\d+" itemId="(\d+)" itemName="([^"]*)" fishGroup="(\w+)" fishLevel="(\d+)" fishBiteRate="([\d.]+)"[^>]*fishGrade="(\w+)"/g)]
  .map(m => ({item: +m[1], name: clean(m[2]), group: m[3], level: +m[4], bite: +m[5], grade: m[6].replace('fish_', ''), price: items.get(+m[1])?.price || 0}));
const rods = [...fs.readFileSync(rodFile, 'utf8').matchAll(/<fishingRod fishingRodId="\d+" fishingRodItemId="(\d+)" fishingRodLevel="(\d+)" fishingRodName="([^"]*)" fishingRodDamage="([\d.]+)"/g)]
  .map(m => ({item: +m[1], name: clean(m[3]), level: +m[2], damage: +m[4], price: items.get(+m[1])?.price || 0}));

// capsule skills: "Item - Green Fish" ... each level opens one fish of the itemConsumeId list
const capsules = {};
for (const m of fs.readFileSync(skillFile, 'utf8').matchAll(/<skill id="(\d+)" levels="\d+" name="Item - [A-Za-z ]*Fish">([\s\S]*?)<\/skill>/g)) {
  const table = m[2].match(/<table name="#extractableItems">([\s\S]*?)<\/table>/)?.[1] || '';
  const consume = (m[2].match(/<table name="#itemConsumeId">([\s\S]*?)<\/table>/)?.[1] || '').trim().split(/\s+/).map(Number);
  const rows = table.trim().split('\n').map(line => line.trim()).filter(Boolean);
  rows.forEach((line, index) => {
    const item = consume[index];
    if (!item) return;
    capsules[item] = line.split(';').filter(Boolean).map(product => {
      const parts = product.split(',').map(Number);
      return [parts[0], parts[1], parts[2]];
    });
  });
}

// dye recipes the Fishermen's Guild sells
const recipes = new Map();
for (const file of fs.readdirSync(buyDir).filter(f => f.endsWith('.xml'))) {
  for (const m of fs.readFileSync(path.join(buyDir, file), 'utf8').matchAll(/<item id="(\d+)"[^>]*\/>\s*<!-- (Recipe: (?:Greater )?Dye[^>]*?) -->/g)) {
    const item = items.get(+m[1]);
    if (item && !recipes.has(item.id)) recipes.set(item.id, item.price);
  }
}

// fishing shots: one per rod grade (no grade, D, C, B, A, S), burnt by a cast; a shot doubles the damage to the fish
const shots = Object.fromEntries(['noGrade', 'D', 'C', 'B', 'A', 'S'].map((grade, index) => [grade, 6535 + index]));
// the fishing skill and the 27 levels of Fishing Expertise (the character level each asks for and the adena)
const tree = fs.readFileSync(treeFile, 'utf8');
const skillRows = name => [...tree.matchAll(new RegExp(String.raw`<skill skillName="${name}" skillId="\d+" skillLvl="(\d+)" getLevel="(\d+)"[^>]*>\s*<item id="57" count="(\d+)"`, 'g'))]
  .map(m => ({level: +m[1], needLevel: +m[2], adena: +m[3]}));
const expertise = skillRows('Fishing Expertise');
const fishing = skillRows('Fishing')[0];
// what the Fishermen's Guild gives a Proof of Catching a Fish for (multisell 009)
const PROOF = {'Fish Oil': 1, 'Greater Fish Oil': 5, 'Premium Fish Oil': 25, 'Fish Scale': 4, 'Shiny Fish Scale': 6, 'Fish Gem': 10, 'Shiny Fish Gem': 20, 'Thin Fish Bone': 6, 'Thick Fish Bone': 9};
const proofs = {};
for (const [name, tickets] of Object.entries(PROOF)) { const found = [...items.values()].find(item => item.name === name); if (found) proofs[found.id] = tickets; }
const PROOF_ITEM = 7609;

const used = new Set([PROOF_ITEM, ...Object.keys(proofs).map(Number), ...Object.values(shots), ...fish.map(f => f.item), ...rods.map(r => r.item), ...Object.values(capsules).flat().map(p => p[0]), ...recipes.keys()]);
const itemsOut = {};
for (const id of used) { const it = items.get(id); if (it) itemsOut[id] = [it.name, it.price, it.etc]; }
fs.writeFileSync('template/fishingData.js', `// Real High Five fishing data. Generated by scripts/l2j/extract-fishing.mjs.\nexport default ${JSON.stringify({rods, shots, fish, capsules, items: itemsOut, recipes: [...recipes], expertise, fishing, proofs, proofItem: PROOF_ITEM})};\n`);
console.log({rods: rods.length, fish: fish.length, capsules: Object.keys(capsules).length, items: Object.keys(itemsOut).length, recipes: recipes.size});
