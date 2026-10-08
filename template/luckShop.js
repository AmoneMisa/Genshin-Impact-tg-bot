// "Лавка удачи": what Coins of Luck (the donation currency, bought with Telegram Stars)
// can be spent on. Prices are in coins; edit them here.
//
// grant fields (see miniapp/luck.js):
//   crystals / bonusChances / arenaChances / stealChances - added to the player (the last
//     two stop at their daily cap); crystals bought here are shielded from raids for a week
//   chestTry  - one more round of chests
//   potion    - a buff potion id from template/buffPotions.js
import buffPotions from './buffPotions.js';

export const LUCK_SHOP_GROUPS = Object.freeze([
  { id: 'crystals', title: 'Кристаллы' },
  { id: 'potions', title: 'Зелья-баффы' },
  { id: 'tries', title: 'Попытки' },
]);

export default Object.freeze([
  { id: 'crystals-100', group: 'crystals', title: '100 кристаллов', icon: '💎', cost: 10, grant: { crystals: 100 } },
  { id: 'crystals-500', group: 'crystals', title: '500 кристаллов', icon: '💎', cost: 45, grant: { crystals: 500 } },
  { id: 'crystals-2000', group: 'crystals', title: '2 000 кристаллов', icon: '💎', cost: 160, grant: { crystals: 2000 } },
  ...buffPotions.map(potion => ({
    id: `potion-${potion.id}`, group: 'potions', title: potion.name, icon: '🧪', cost: 6, grant: { potion: potion.id },
  })),
  { id: 'chest-try', group: 'tries', title: 'Доп. открытие сундучков', icon: '🧰', cost: 15, grant: { chestTry: 1 } },
  { id: 'bonus-chance', group: 'tries', title: 'Попытка бонуса', icon: '🎁', cost: 10, grant: { bonusChances: 1 } },
  { id: 'arena-chances', group: 'tries', title: '+3 попытки арены', icon: '🏆', cost: 8, grant: { arenaChances: 3 } },
  { id: 'steal-chances', group: 'tries', title: '+3 попытки ограбления', icon: '🦹', cost: 8, grant: { stealChances: 3 } },
].map(Object.freeze));
