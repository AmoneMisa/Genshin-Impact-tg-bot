import {migrateCharacterCurrency} from '../functions/game/player/currencyMigration.js';
import crypto from 'crypto';

export const BONUS_PRIZES = [
  { name: 'gold', label: 'адены', icon: '🪙', minAmount: 500, maxAmount: 2500, chance: 60 },
  { name: 'moonDew', label: 'лунной росы', icon: '💧', minAmount: 3, maxAmount: 10, chance: 25 },
  { name: 'ironOre', label: 'железной руды', icon: '⛏️', minAmount: 3, maxAmount: 12, chance: 15 },
];

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function randomIntInclusive(min, max) {
  return crypto.randomInt(min, max + 1);
}

function selectPrize(roll) {
  let cursor = 0;
  for (const prize of BONUS_PRIZES) {
    cursor += prize.chance;
    if (roll < cursor) return prize;
  }
  return BONUS_PRIZES.at(-1);
}

export function getBonusState(session) {
  migrateCharacterCurrency(session);
  const inventory = session?.game?.inventory || {};
  return {
    chances: Math.max(0, Math.floor(number(session?.game?.bonusChances))),
    balances: {
      gold: Math.max(0, number(inventory.gold)),
      moonDew: Math.max(0, number(inventory.moonDew)),
      ironOre: Math.max(0, number(inventory.ironOre)),
    },
    prizes: BONUS_PRIZES.map(({ name, label, icon, minAmount, maxAmount, chance }) => ({
      name,
      label,
      icon,
      minAmount,
      maxAmount,
      chance,
    })),
  };
}

export function claimBonus(session, options = {}) {
  const current = getBonusState(session);
  if (current.chances <= 0) {
    return { ok: false, reason: 'no_chances', bonus: current };
  }

  const randomInt = options.randomInt || randomIntInclusive;
  const roll = randomInt(0, 99);
  if (!Number.isInteger(roll) || roll < 0 || roll > 99) {
    throw new Error(`Bonus RNG returned invalid roll ${roll}`);
  }

  const prize = selectPrize(roll);
  const amount = randomInt(prize.minAmount, prize.maxAmount);
  if (!Number.isSafeInteger(amount) || amount < prize.minAmount || amount > prize.maxAmount) {
    throw new Error(`Bonus RNG returned invalid amount ${amount}`);
  }

  if (!session.game || typeof session.game !== 'object') session.game = {};
  if (!session.game.inventory || typeof session.game.inventory !== 'object') session.game.inventory = {};

  session.game.bonusChances = current.chances - 1;
  session.game.inventory[prize.name] = Math.max(0, number(session.game.inventory[prize.name])) + amount;

  return {
    ok: true,
    prize: {
      name: prize.name,
      label: prize.label,
      icon: prize.icon,
      amount,
    },
    bonus: getBonusState(session),
  };
}
