import {SOUL_COLORS,SOUL_COL_PRICES,soulCrystalKey} from './soulCrystalData.js';
// "Донат-магазин": what Coins of Luck (the donation currency, bought with Telegram Stars) buy.
// Prices are in coins; edit them here. Rented (timed) epic equipment is built per player in
// miniapp/luck.js, because what is offered depends on the character's class.
//
// grant fields (see miniapp/luck.js):
//   crystals / bonusChances / arenaChances / stealChances - added to the player (the last
//     two stop at their daily cap); crystals bought here are shielded from raids for a week
//   chestTry  - one more round of chests
//   potion    - {id, count} a potion or elixir of template/potionsInInventoryTemplate.js
//   materials - {key: count} materials of template/materialsTemplate.js (scrolls, craft goods)
//   ironOre   - iron ore added to the inventory
import buffPotions from './buffPotions.js';
import elixirs from './elixirs.js';
import materials from './materialsTemplate.js';
import { LIFESTONE_SHOP, lifestoneKey } from './augmentData.js';

export const LUCK_SHOP_GROUPS = Object.freeze([
  {id:'soul',title:'Кристаллы души 14–17'},
  { id: 'epic', title: 'Временные эпики' },
  { id: 'lifestones', title: 'Камни жизни' },
  { id: 'scrolls', title: 'Свитки' },
  { id: 'elixirs', title: 'Эликсиры' },
  { id: 'craft', title: 'Материалы ковки' },
  { id: 'buffs', title: 'Баффы' },
  { id: 'crystals', title: 'Кристаллы' },
  { id: 'tries', title: 'Попытки' },
]);

/** Renting an epic item for TIMED_EPIC_DAYS days (see functions/game/equipment/timedItems.js). */
export const TIMED_EPIC_PRICE = Object.freeze({ weapon: 120, jewelry: 70 });

const materialName = key => materials.find(material => material.key === key)?.name || key;

// Lineage II scrolls are sold per grade; the high grades are where they matter.
const SCROLL_GRADES = [
  { grade: 'A', blessed: 8, safe: 12 },
  { grade: 'S', blessed: 12, safe: 18 },
  { grade: 'S80', blessed: 18, safe: 27 },
  { grade: 'S84', blessed: 25, safe: 38 },
];

const scrolls = SCROLL_GRADES.flatMap(({ grade, blessed, safe }) => ['weapon', 'armor'].flatMap(target => [
  { key: `blessed_${target}_${grade}`, cost: blessed },
  { key: `safe_${target}_${grade}`, cost: safe },
].map(({ key, cost }) => ({
  id: `scroll-${key}`, group: 'scrolls', title: materialName(key), icon: key.startsWith('safe') ? '🛡️' : '✨',
  cost, grant: { materials: { [key]: 1 } },
}))));

const ELIXIR_STACK = 5;
const ELIXIR_PRICE = { A: 10, S: 24 };
const elixirItems = elixirs.map(elixir => ({
  id: `elixir-${elixir.id}`, group: 'elixirs', title: `${elixir.name} ×${ELIXIR_STACK}`, icon: '⚗️',
  subtitle: `Нужен ${elixir.needLvl} уровень`, cost: ELIXIR_PRICE[elixir.grade], grant: { potion: { id: elixir.id, count: ELIXIR_STACK } },
}));

// Craft goods: the four material families of a grade plus the ore a few crafts take.
const CRAFT_BUNDLES = [
  { grade: 'A', each: 40, ironOre: 4000, cost: 20 },
  { grade: 'S', each: 50, ironOre: 8000, cost: 35 },
  { grade: 'S80', each: 65, ironOre: 14000, cost: 50 },
  { grade: 'S84', each: 80, ironOre: 24000, cost: 70 },
];
const craftItems = CRAFT_BUNDLES.map(({ grade, each, ironOre, cost }) => ({
  id: `craft-${grade}`, group: 'craft', title: `Набор для ковки (${grade})`, icon: '🔨',
  subtitle: `${each} каждого материала + ${ironOre.toLocaleString('ru-RU')} руды`, cost,
  grant: {
    ironOre,
    materials: Object.fromEntries(['binder', 'leather', 'fiber', 'gem'].map(family => [`craft_${family}_${grade}`, each])),
  },
}));

// Top Life Stones (Lineage II: up to level 84, grade S84).
const lifeStoneItems = Object.entries(LIFESTONE_SHOP.top).map(([grade, cost]) => ({
  id: `lifestone-top-${grade}`, group: 'lifestones', title: materialName(lifestoneKey(grade, 'top')), icon: '🔮',
  subtitle: `Аугментация оружия и бижутерии грейда ${grade}; у оружия — навык с шансом 80%`, cost, grant: { materials: { [lifestoneKey(grade, 'top')]: 1 } },
}));

const soulCrystals=Object.entries(SOUL_COLORS).flatMap(([color,label])=>Object.entries(SOUL_COL_PRICES).map(([stage,cost])=>({id:'soul-'+color+'-'+stage,group:'soul',title:label+' кристалл души · '+stage+' ур.',icon:'💠',subtitle:'Для SA старших грейдов',cost,grant:{materials:{[soulCrystalKey(color,+stage)]:1}}})));
export default Object.freeze([
  ...soulCrystals,
  ...lifeStoneItems,
  ...scrolls,
  ...elixirItems,
  ...craftItems,
  ...buffPotions.map(potion => ({
    id: `potion-${potion.id}`, group: 'buffs', title: potion.name, icon: '🧪', cost: 6, grant: { potion: { id: potion.id, count: 1 } },
  })),
  { id: 'crystals-100', group: 'crystals', title: '100 кристаллов', icon: '💎', cost: 10, grant: { crystals: 100 } },
  { id: 'crystals-500', group: 'crystals', title: '500 кристаллов', icon: '💎', cost: 45, grant: { crystals: 500 } },
  { id: 'crystals-2000', group: 'crystals', title: '2 000 кристаллов', icon: '💎', cost: 160, grant: { crystals: 2000 } },
  { id: 'chest-try', group: 'tries', title: 'Доп. открытие сундучков', icon: '🧰', cost: 15, grant: { chestTry: 1 } },
  { id: 'bonus-chance', group: 'tries', title: 'Попытка бонуса', icon: '🎁', cost: 10, grant: { bonusChances: 1 } },
  { id: 'arena-chances', group: 'tries', title: '+3 попытки арены', icon: '🏆', cost: 8, grant: { arenaChances: 3 } },
  { id: 'steal-chances', group: 'tries', title: '+3 попытки ограбления', icon: '🦹', cost: 8, grant: { stealChances: 3 } },
].map(Object.freeze));
