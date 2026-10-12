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
import { LIFESTONE_SHOP, LIFESTONE_LEVELS, lifestoneKey } from './augmentData.js';
import { PASS_EPICS } from './epicPasses.js';

export const LUCK_SHOP_GROUPS = Object.freeze([
  {id:'soul',title:'Кристаллы души 14–17'},
  { id: 'epic', title: 'Временные эпики' },
  { id: 'passes', title: 'Допуски к эпик-боссам' },
  { id: 'quest', title: 'Квест' },
  { id: 'lifestones', title: 'Камни жизни' },
  { id: 'scrolls', title: 'Свитки' },
  { id: 'elixirs', title: 'Эликсиры' },
  { id: 'buffs', title: 'Баффы' },
  { id: 'tries', title: 'Попытки' },
]);

/** Renting an epic item for TIMED_EPIC_DAYS days (see functions/game/equipment/timedItems.js). */
export const TIMED_EPIC_PRICE = Object.freeze({ jewelry: 70, freya: 70, freyaExtreme: 110 });

const materialName = key => materials.find(material => material.key === key)?.name || key;

// Lineage II scrolls are sold per grade; the high grades are where they matter.
const SCROLL_GRADES = [
  { grade: 'A', blessed: 8, safe: 12 },
  { grade: 'S', blessed: 12, safe: 18 },
];

const scrolls = SCROLL_GRADES.flatMap(({ grade, blessed, safe }) => ['weapon', 'armor'].flatMap(target => [
  { key: `blessed_${target}_${grade}`, cost: blessed },
  { key: `safe_${target}_${grade}`, cost: safe },
].map(({ key, cost }) => ({
  id: `scroll-${key}`, group: 'scrolls', title: materialName(key), icon: key.startsWith('safe') ? '🛡️' : '✨',
  cost, description: `Безопасная заточка до +3. Риск начинается при попытке +4. ${key.startsWith('safe') ? 'Дестракшен: при неудаче предмет и заточка сохраняются.' : 'Благословенный свиток: при неудаче предмет сохраняется, заточка сбрасывается до +0.'}${grade === 'S' ? ' Подходит для S, S80 и S84.' : ''}`, grant: { materials: { [key]: 1 } },
}))));

const ELIXIR_STACK = 5;
const ELIXIR_PRICE = { A: 10, S: 24 };
const elixirItems = elixirs.map(elixir => ({
  id: `elixir-${elixir.id}`, group: 'elixirs', title: `${elixir.name} ×${ELIXIR_STACK}`, icon: '⚗️',
  subtitle: `Нужен ${elixir.needLvl} уровень`, cost: ELIXIR_PRICE[elixir.grade], grant: { potion: { id: elixir.id, count: ELIXIR_STACK } },
}));

// Top Life Stones (Lineage II: up to level 84, grade S84).
const lifeStoneItems = Object.entries(LIFESTONE_SHOP.top).map(([grade, cost]) => ({
  id: `lifestone-top-${grade}`, group: 'lifestones', title: `Камень жизни: высший · ${LIFESTONE_LEVELS[grade]} ур.`, icon: '🔮',
  subtitle: 'Аугментация оружия и бижутерии', cost, grant: { materials: { [lifestoneKey(grade, 'top')]: 1 } },
}));

const soulCrystals=Object.entries(SOUL_COLORS).flatMap(([color,label])=>Object.entries(SOUL_COL_PRICES).map(([stage,cost])=>({id:'soul-'+color+'-'+stage,group:'soul',title:label+' кристалл души · '+stage+' ур.',icon:'💠',subtitle:'Для SA старших грейдов',cost,grant:{materials:{[soulCrystalKey(color,+stage)]:1}}})));
// A pass is bound to the character: it is a counter of the hero (game.academy.passes), never an item.
const passItems = Object.entries(PASS_EPICS).map(([name, config]) => ({
  id: `pass-${name}`, group: 'passes', title: `Допуск: ${config.label}`, icon: '🗝️',
  artIcon: {baium:'icon-etc_piece_of_cloth_red_i00',frintezza:'icon-etc_scroll_gray_i00',antharas:'icon-etc_plate_blue_i00',valakas:'icon-etc_vacualite_glowing_white_i00',beleth:'icon-accessary_dynasty_ring_i00'}[name],
  subtitle: `LVL ${config.minLevel}+ · привязан к персонажу, не продаётся и не передаётся`,
  cost: config.cost, needLvl: config.minLevel, grant: { epicPass: name },
}));

export default Object.freeze([
  {id:'profession-mark-2',group:'quest',title:'Марка второй профессии',description:'Заменяет боевые задания второй профессии. Используй в разделе «Профессии», выбрав свой класс. Плата наставнику остаётся. Привязана к персонажу.',artIcon:'icon-etc_jewel_gold_i00',cost:20,needLvl:40,grant:{professionMark:3}},
  {id:'profession-mark-3',group:'quest',title:'Марка третьей профессии',description:'Заменяет боевые задания третьей профессии. Используй в разделе «Профессии», выбрав свой класс. Плата наставнику остаётся. Привязана к персонажу.',artIcon:'icon-etc_jewel_blue_i00',cost:40,needLvl:76,grant:{professionMark:4}},
  ...passItems,
  ...soulCrystals,
  ...lifeStoneItems,
  ...scrolls,
  ...elixirItems,

  ...buffPotions.filter(potion => potion.donateOnly).map(potion => ({
    id: `potion-${potion.id}`, group: 'buffs', title: potion.name, description: potion.description, icon: '🧪', cost: 6, grant: { potion: { id: potion.id, count: 1 } },
  })),
  { id: 'chest-try', group: 'tries', title: 'Доп. открытие сундучков', icon: '🧰', cost: 15, grant: { chestTry: 1 } },
  { id: 'bonus-chance', group: 'tries', title: 'Попытка бонуса', icon: '🎁', cost: 10, grant: { bonusChances: 1 } },
  { id: 'arena-chances', group: 'tries', title: '+3 попытки арены', icon: '🏆', cost: 8, grant: { arenaChances: 3 } },
  { id: 'steal-chances', group: 'tries', title: '+3 попытки ограбления', icon: '🦹', cost: 8, grant: { stealChances: 3 } },
].map(Object.freeze));
