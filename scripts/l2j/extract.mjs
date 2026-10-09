// Builds template/huntingTemplate.js from the open-source L2J Mobius datapack (High Five branch).
//
//   node scripts/l2j/extract.mjs <path to L2J_Mobius_CT_2.6_HighFive/dist/game/data> > template/huntingTemplate.js
//
// For every hunting zone listed below it takes the mobs that really spawn there (name, level, exp,
// hit points, attack, defence, element resistances) and maps their drop groups onto our materials:
// adena -> gold, enchant scrolls, Life Stones (by quality), crafting goods (by name). Everything else in
// the real drop tables (recipes, armor pieces, dyes) has no counterpart in the game and is left out.
import fs from 'node:fs';
import path from 'node:path';
import craftMaterials from '../../template/materialsTemplate.js';
import { lifestoneKey } from '../../template/augmentData.js';

const root = process.argv[2];
if (!root) {
  console.error('usage: node scripts/l2j/extract.mjs <datapack data dir>');
  process.exit(1);
}

// zone file (under spawns/) -> our id and name
// An optional fourth and fifth entry limits the mobs of a wide spawn file to a level range.
const ZONES = [
  ['TalkingIsland/TalkingIslandMonsters', 'talking-island', 'Окрестности Острова Говорящих', 1, 10],
  ['ElvenTerritory/ElvenStarting', 'elven-fields', 'Эльфийские луга', 8, 19],
  ['Others/19_19', 'marsh-zombies', 'Топи зомби', 13, 16],
  ['Others/18_20', 'dark-forest', 'Тёмный лес', 14, 19],
  ['Others/19_20', 'vuku-lands', 'Земли орков Вуку', 18, 24],
  ['Dion/PlainsOfDion', 'plains-of-dion', 'Равнины Диона'],
  ['Gludin/TurekOrcs', 'turek-orcs', 'Лагерь орков Турек'],
  ['Dion/CrumaMarshlands', 'cruma-marshlands', 'Болота Крумы'],
  ['Giran/BrekasStronghold', 'brekas-stronghold', 'Крепость Брека'],
  ['Dion/BeeHive', 'bee-hive', 'Улей'],
  ['Catacombs/CatacombOfTheHeretic', 'catacomb-heretic', 'Катакомба Еретиков'],
  ['Innadril/AlligatorBeach', 'alligator-beach', 'Берег Аллигаторов'],
  ['Oren/SeaOfSpores', 'sea-of-spores', 'Море Спор'],
  ['Oren/TimakOutpost', 'timak-outpost', 'Застава Тимак'],
  ['Innadril/GardenOfEva', 'garden-of-eva', 'Сад Евы'],
  ['Oren/IvoryTower', 'ivory-tower', 'Башня Слоновой Кости'],
  ['Giran/DevilsIsle', 'devils-isle', 'Остров Дьявола'],
  ['Aden/PlainsOfGlory', 'plains-of-glory', 'Равнины Славы'],
  ['Oren/OutlawForest', 'outlaw-forest', 'Лес Изгоев'],
  ['Aden/Cemetery', 'cemetery', 'Кладбище Адена'],
  ['Aden/FieldsOfMassacre', 'fields-of-massacre', 'Поля Резни'],
  ['Rune/ValleyOfSaints', 'valley-of-saints', 'Долина Святых'],
  ['Aden/TowerOfInsolence', 'tower-of-insolence', 'Башня Наглости'],
  ['Rune/SwampOfScreams', 'swamp-of-screams', 'Болото Криков'],
  ['Aden/BlazingSwamp', 'blazing-swamp', 'Пылающее болото'],
  ['Goddard/WallOfArgos', 'wall-of-argos', 'Стена Аргоса'],
  ['Goddard/HotSprings', 'hot-springs', 'Горячие источники'],
  ['Catacombs/CatacombOfDarkOmens', 'catacomb-dark-omens', 'Катакомба Тёмных Знамений'],
  ['Goddard/KetraOrcOutpost', 'ketra-outpost', 'Застава орков Кетра'],
  ['Rune/PrimevalIsle', 'primeval-isle', 'Первобытный остров'],
  ['Aden/GiantsCave', 'giants-cave', 'Пещера Гигантов'],
  ['Hellbound/Hellbound', 'hellbound', 'Хеллбаунд'],
  ['Oren/SelMahums', 'sel-mahums', 'Лагерь Сел Махум'],
  ['Innadril/FieldOfWhispers', 'field-of-whispers', 'Поле Шёпота'],
];
const MOBS_PER_ZONE = 6;
const ELEMENTS = ['fire', 'water', 'wind', 'earth', 'holy', 'dark'];

const read = file => fs.readFileSync(path.join(root, file), 'utf8');

// ---- experience table: exp needed for each level step
const toLevel = new Map([...read('stats/players/experience.xml').matchAll(/<experience level="(\d+)" tolevel="(\d+)"/g)].map(m => [+m[1], +m[2]]));
const stepExp = level => (toLevel.get(level + 1) ?? 0) - (toLevel.get(level) ?? 0);

// ---- drops: groups of items, mapped onto our materials
const craftByName = new Map(craftMaterials.filter(material => material.key.startsWith('craft_')).map(material => [material.name, material.key]));

const gradeOfLifeStone = level => (level >= 80 ? 'S80' : level >= 76 ? 'S' : level >= 61 ? 'A' : level >= 52 ? 'B' : 'C');

function materialFor(comment) {
  const scroll = comment.match(/^(Blessed )?Scroll: Enchant (?:Weapon|Armor) \((\w+)-Grade\)/);
  if (scroll) return `${scroll[1] ? 'blessed' : 'scroll'}_${scroll[2]}`;
  const stone = comment.match(/^(Mid-Grade |High-Grade |Top-Grade )?Life Stone - Level (\d+)/);
  if (stone) {
    const tier = { 'Mid-Grade ': 'mid', 'High-Grade ': 'high', 'Top-Grade ': 'top' }[stone[1]] || 'normal';
    return lifestoneKey(gradeOfLifeStone(+stone[2]), tier);
  }
  return craftByName.get(comment) || null;
}

function parseDrops(body) {
  const section = body.match(/<drop>([\s\S]*?)<\/drop>/)?.[1];
  if (!section) return {gold: null, items: []};
  let gold = null;
  const items = new Map();
  for (const group of section.matchAll(/<group chance="([\d.]+)">([\s\S]*?)<\/group>/g)) {
    const groupChance = +group[1];
    for (const item of group[2].matchAll(/<item id="(\d+)" min="(\d+)" max="(\d+)" chance="([\d.]+)" \/>(?: <!-- (.*?) -->)?/g)) {
      const chance = groupChance * +item[4] / 100;
      if (item[1] === '57') {
        gold = {chance: Math.round(chance * 100) / 100, min: +item[2], max: +item[3]};
        continue;
      }
      const key = materialFor(item[5] || '');
      if (!key || chance <= 0) continue;
      const entry = items.get(key) || {key, chance: 0, min: +item[2], max: +item[3]};
      entry.chance += chance;
      items.set(key, entry);
    }
  }
  return {gold, items: [...items.values()].map(entry => ({...entry, chance: Math.round(entry.chance * 10000) / 10000}))};
}

// ---- npcs
const npcs = new Map();
for (const file of fs.readdirSync(path.join(root, 'stats/npcs')).filter(name => name.endsWith('.xml'))) {
  const text = read(`stats/npcs/${file}`);
  for (const m of text.matchAll(/<npc id="(\d+)" level="(\d+)" type="(\w+)"(?: name="([^"]*)")?[^>]*>([\s\S]*?)<\/npc>/g)) {
    if (m[3] !== 'Monster' || !m[4]) continue;
    const body = m[5];
    const num = (re, fallback = 0) => Number(body.match(re)?.[1] ?? fallback);
    const defence = body.match(/<attribute>\s*<defence fire="(\d+)" water="(\d+)" wind="(\d+)" earth="(\d+)" holy="(\d+)" dark="(\d+)"/);
    npcs.set(m[1], {
      id: m[1], name: m[4], level: +m[2],
      exp: num(/<acquire exp="([\d.]+)"/), sp: num(/<acquire exp="[\d.]+" sp="([\d.]+)"/),
      hp: num(/hp="([\d.]+)"/), pAtk: num(/physical="([\d.]+)" magical/), mAtk: num(/magical="([\d.]+)" random/),
      pDef: num(/<defence physical="([\d.]+)"/), accuracy: num(/accuracy="([\d.]+)"/), crit: num(/critical="([\d.]+)"/),
      attackSpeed: num(/attackSpeed="([\d.]+)"/, 253),
      resist: defence ? Object.fromEntries(ELEMENTS.map((element, i) => [element, +defence[i + 1]])) : null,
      drops: parseDrops(body),
    });
  }
}

// ---- zones
const zones = [];
for (const [file, id, title, minLevel = 0, maxLevel = 99] of ZONES) {
  const text = read(`spawns/${file}.xml`);
  const counts = new Map();
  for (const m of text.matchAll(/<npc id="(\d+)"/g)) counts.set(m[1], (counts.get(m[1]) || 0) + 1);
  const mobs = [...counts.entries()]
    .map(([npcId, count]) => ({npc: npcs.get(npcId), count}))
    .filter(({npc}) => npc && npc.exp > 0 && npc.hp > 0 && npc.level >= minLevel && npc.level <= maxLevel)
    .sort((a, b) => b.count - a.count)
    .slice(0, MOBS_PER_ZONE)
    .map(({npc}) => npc);
  if (!mobs.length) throw new Error(`no mobs found for ${file}`);
  const levels = mobs.map(mob => mob.level).sort((a, b) => a - b);
  zones.push({
    id, title, min: levels[0], max: levels.at(-1), level: levels[levels.length >> 1],
    mobs: mobs.sort((a, b) => a.level - b.level).map(mob => {
      const top = mob.resist ? Object.entries(mob.resist).sort((a, b) => b[1] - a[1])[0] : null;
      const rounded = value => Math.round(value * 100) / 100;
      return {
        id: mob.id, name: mob.name, level: mob.level,
        // share of the experience the level step takes, and the real combat numbers for scaling
        expShare: Math.round(mob.exp / stepExp(mob.level) * 1e7) / 1e7,
        hp: rounded(mob.hp), pAtk: rounded(mob.pAtk), pDef: rounded(mob.pDef), mAtk: rounded(mob.mAtk),
        accuracy: rounded(mob.accuracy), crit: rounded(mob.crit), attackSpeed: mob.attackSpeed,
        // the element the mob resists best, when it stands out from the default 20
        element: top && top[1] > 20 ? top[0] : null,
        // the element of the attribute stones it drops: its own, or one picked by its id
        dropElement: top && top[1] > 20 ? top[0] : ELEMENTS[Number(mob.id) % ELEMENTS.length],
        gold: mob.drops.gold, drops: mob.drops.items,
      };
    }),
  });
}
zones.sort((a, b) => a.level - b.level);

process.stdout.write(`// Generated by scripts/l2j/extract.mjs from the open-source L2J Mobius High Five datapack - do not edit by hand.
// Mobs of each hunting zone with their real level, experience share, combat numbers, element and drops
// (mapped onto our materials). Used by functions/game/hunt/.
export default ${JSON.stringify(zones, null, 1).replace(/\n\s+/g, ' ').replace(/\[ /g, '[').replace(/ \]/g, ']').replace(/\{ /g, '{').replace(/ \}/g, '}')};
`);
