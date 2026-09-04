import shopTemplate from '../template/shopTemplate.js';
import shopSellItem from '../functions/game/shop/shopSellItem.js';

const CATEGORY_LABELS = {
  boss: 'Для босса',
  player: 'Для игрока',
  sword: 'Для меча',
  misc: 'Разное',
  builds: 'Для построек',
};

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getShopState(session, now = Date.now()) {
  const game = session?.game || {};
  const inventory = game.inventory || {};
  const timers = game.shopTimers || {};
  const gold = Math.max(0, number(inventory.gold));

  const items = shopTemplate.map((item) => {
    const resetAt = Math.max(0, number(timers[item.command]));
    const onCooldown = resetAt > now;
    return {
      id: item.command,
      command: item.command,
      name: item.name,
      category: item.category,
      categoryLabel: CATEGORY_LABELS[item.category] || item.category,
      cost: Math.max(0, number(item.cost)),
      message: item.message || '',
      resetAt,
      onCooldown,
      canAfford: gold >= number(item.cost),
      available: !onCooldown && gold >= number(item.cost),
    };
  });

  return {
    gold,
    categories: Object.entries(CATEGORY_LABELS).map(([id, title]) => ({ id, title })),
    items,
  };
}

export async function buyShopItem(session, command, now = Date.now()) {
  const item = shopTemplate.find((candidate) => candidate.command === command);
  if (!item) {
    return { ok: false, reason: 'unknown_item', shop: getShopState(session, now) };
  }

  const current = getShopState(session, now);
  const itemState = current.items.find((candidate) => candidate.command === command);
  if (itemState.onCooldown) {
    return {
      ok: false,
      reason: 'cooldown',
      resetAt: itemState.resetAt,
      shop: current,
    };
  }
  if (!itemState.canAfford) {
    return { ok: false, reason: 'not_enough_gold', shop: current };
  }

  const beforeGold = number(session.game.inventory.gold);
  const message = await shopSellItem(session, command, item);
  const afterGold = number(session.game.inventory.gold);
  const purchased = afterGold === beforeGold - number(item.cost);

  if (!purchased) {
    return {
      ok: false,
      reason: 'rejected',
      message,
      shop: getShopState(session, now),
    };
  }

  return {
    ok: true,
    action: 'buy',
    item: {
      id: item.command,
      name: item.name,
      category: item.category,
      cost: number(item.cost),
    },
    message,
    shop: getShopState(session, now),
  };
}
