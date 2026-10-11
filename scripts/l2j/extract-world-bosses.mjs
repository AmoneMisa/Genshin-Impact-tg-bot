// World bosses (raid bosses and grand bosses) of Lineage II High Five.
//
//   node scripts/l2j/extract-world-bosses.mjs <npcs dir> <items dir>
//
// npcs dir : data/stats/npcs of a High Five datapack (files 25000-25899 and 29000-29199 hold the raid and grand bosses)
// items dir: data/stats/items (names of the dropped items)
// Writes template/worldBosses.js (level, stats, skills and drops of each boss) and adds the dropped items and the drop
// tables to template/l2Items.js and template/l2Loot.js, where the hunting fields keep theirs.
import fs from 'node:fs';
import path from 'node:path';

const [npcDir, itemDir] = process.argv.slice(2);
if (!npcDir || !itemDir) { console.error('usage: node scripts/l2j/extract-world-bosses.mjs <npcs dir> <items dir>'); process.exit(1); }
const clean = text => text.replaceAll('&apos;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
const num = (text, name) => { const m = text.match(new RegExp(name + '="([0-9.-]+)"')); return m ? +m[1] : 0; };

// passives of the common templates: they say what a monster is, not what it casts
const PASSIVE = /^(Resist |HP Increase|MP Increase|Average |Strong |Weak |High |Standard Type|Light Armor Type|Heavy Armor Type|Robe Type|Raid Boss|Boss Strong|.*Type$|One-handed|Two-handed|Dual|Bow|Dagger|Fist|Pole|Humanoids|Giants|Undead|Beasts|Animals|Plants|Insects|Dragons|Fairies|Demons|Spirits|Constructs|Bugs|Magic Creatures|Elementals|Mystic|Fighter)/i;

const files = fs.readdirSync(npcDir).filter(file => /^(25|29)\d{3}-\d+\.xml$/.test(file));
const bosses = [];
const drops = {};
const usedItems = new Set();
for (const file of files) {
  const xml = fs.readFileSync(path.join(npcDir, file), 'utf8');
  for (const m of xml.matchAll(/<npc id="(\d+)" level="(\d+)" type="(L2RaidBoss|L2GrandBoss)" name="([^"]*)"[^>]*>([\s\S]*?)<\/npc>/g)) {
    const body = m[5];
    const skillList = body.match(/<skillList>([\s\S]*?)<\/skillList>/)?.[1] || '';
    const skills = [...skillList.matchAll(/<skill id="(\d+)" level="(\d+)" \/>\s*(?:<!--\s*([^>]*?)\s*-->)?/g)]
      .map(x => ({id: +x[1], level: +x[2], name: clean(x[3] || '')}))
      .filter(skill => skill.name && !PASSIVE.test(skill.name) && skill.id >= 4000);
    const rows = [...(body.match(/<dropLists>([\s\S]*?)<\/dropLists>/)?.[1] || '').matchAll(/<item id="(\d+)" min="(\d+)" max="(\d+)" chance="([\d.]+)"/g)]
      .filter(x => x[1] !== '57' && +x[4] > 0)
      .map(x => [+x[1], +x[2], +x[3], Math.round(+x[4] * 100000) / 100000]);
    rows.forEach(row => usedItems.add(String(row[0])));
    drops[m[1]] = rows;
    const attack = body.match(/<attack [^>]*>/)?.[0] || '';
    const vitals = body.match(/<vitals [^>]*>/)?.[0] || '';
    const defence = body.match(/<defence physical[^>]*>/)?.[0] || '';
    bosses.push({
      id: +m[1], name: clean(m[4]), level: +m[2], grand: m[3] === 'L2GrandBoss',
      hp: Math.round(num(vitals, 'hp')), mp: Math.round(num(vitals, 'mp')),
      pAtk: Math.round(num(attack, 'physical')), mAtk: Math.round(num(attack, 'magical')),
      pDef: Math.round(num(defence, 'physical')), mDef: Math.round(num(defence, 'magical')),
      attackSpeed: num(attack, 'attackSpeed') || 253, critical: num(attack, 'critical'),
      race: body.match(/<race>(\w+)<\/race>/)?.[1] || 'UNKNOWN',
      skills,
    });
  }
}

// ---- item names
const items = new Map();
const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
for (const file of walk(itemDir).filter(f => f.endsWith('.xml'))) {
  for (const m of fs.readFileSync(file, 'utf8').matchAll(/<item id="(\d+)" type="(\w+)" name="([^"]*)">([\s\S]*?)<\/item>/g)) {
    const set = name => m[4].match(new RegExp(`<set name="${name}" val="([^"]*)"`))?.[1];
    if (usedItems.has(m[1])) items.set(m[1], [clean(m[3]), m[2], set('crystal_type') || 'NONE', +(set('price') || 0), set('etcitem_type') || null]);
  }
}

// ---- merge into the shared item and loot tables
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '../..');
const readExport = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8').replace(/^[\s\S]*?export default /, '').replace(/;\s*$/, ''));
const lootFile = 'template/l2Loot.js', itemFile = 'template/l2Items.js';
const loot = readExport(lootFile), itemTable = readExport(itemFile);
const lootHead = fs.readFileSync(path.join(root, lootFile), 'utf8').split('\n')[0];
const itemHead = fs.readFileSync(path.join(root, itemFile), 'utf8').split('\n')[0];
for (const [id, rows] of Object.entries(drops)) loot[id] = rows;
for (const [id, row] of items) itemTable[id] = row;
fs.writeFileSync(path.join(root, lootFile), `${lootHead}\nexport default ${JSON.stringify(loot)};\n`);
fs.writeFileSync(path.join(root, itemFile), `${itemHead}\nexport default ${JSON.stringify(itemTable)};\n`);

bosses.sort((a, b) => a.level - b.level || a.id - b.id);
fs.writeFileSync(path.join(root, 'template/worldBosses.js'),
  `// Raid and grand bosses of Lineage II High Five: level, stats, skills. Generated by scripts/l2j/extract-world-bosses.mjs.\n// The drop tables are in template/l2Loot.js by npc id.\nexport default ${JSON.stringify(bosses)};\n`);
console.log(`${bosses.length} bosses, ${items.size} items; levels ${bosses[0].level}-${bosses.at(-1).level}`);
