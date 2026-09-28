export const CRYSTAL_PRICE = 1500;

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseCrystalAmount(value) {
  if (typeof value === 'string' && !/^\s*\d+\s*$/.test(value)) return null;
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;
  if (!Number.isSafeInteger(amount * CRYSTAL_PRICE)) return null;
  return amount;
}

export function getExchangeState(session) {
  const inventory = session?.game?.inventory || {};
  const gold = Math.max(0, number(inventory.gold));
  const crystals = Math.max(0, number(inventory.crystals));

  return {
    price: CRYSTAL_PRICE,
    gold,
    crystals,
    maxAffordable: Math.floor(gold / CRYSTAL_PRICE),
  };
}

export function buyCrystalsForMiniApp(session, rawAmount) {
  const amount = parseCrystalAmount(rawAmount);
  if (amount === null) {
    return { ok: false, reason: 'invalid_amount', exchange: getExchangeState(session) };
  }

  const inventory = session?.game?.inventory;
  if (!inventory) {
    return { ok: false, reason: 'inventory_missing', exchange: getExchangeState(session) };
  }

  const cost = amount * CRYSTAL_PRICE;
  const gold = Math.max(0, number(inventory.gold));
  if (gold < cost) {
    return {
      ok: false,
      reason: 'not_enough_gold',
      missingGold: cost - gold,
      exchange: getExchangeState(session),
    };
  }

  inventory.gold = gold - cost;
  inventory.crystals = Math.max(0, number(inventory.crystals)) + amount;

  return {
    ok: true,
    amount,
    cost,
    exchange: getExchangeState(session),
  };
}
