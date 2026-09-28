import crypto from 'crypto';

export const BONUS_PRIZES = [
  { name: 'gold', label: 'золота', icon: '🪙', minAmount: 57_500, maxAmount: 428_500, chance: 40 },
  { name: 'crystals', label: 'кристаллов', icon: '💎', minAmount: 150, maxAmount: 650, chance: 40 },
  { name: 'ironOre', label: 'железной руды', icon: '⛏️', minAmount: 15, maxAmount: 450, chance: 20 },
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
  const inventory = session?.game?.inventory || {};
  return {
    chances: Math.max(0, Math.floor(number(session?.game?.bonusChances))),
    balances: {
      gold: Math.max(0, number(inventory.gold)),
      crystals: Math.max(0, number(inventory.crystals)),
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
