import { ADENA_OFFER } from '../template/adenaOffer.js';
import shopTemplate from '../template/shopTemplate.js';
import shopSellItem from '../functions/game/shop/shopSellItem.js';
import {getLuckShopState, buyLuckItem} from './luck.js';
import {COSTUME_CATALOG} from '../template/costumeCatalog.js';
import {buyCostume,costumePlayer} from './costumes.js';
import {hasInventoryRoom} from '../functions/game/builds/palaceCapacity.js';

const CATEGORY_LABELS = {
  costumes: 'Костюмы',
  currency: 'Адена за CoL',
  soul: 'Кристаллы души 0–17',
  boss: 'Для босса',
  player: 'Для игрока',
  sword: 'Для меча',
  misc: 'Разное',
  builds: 'Для построек',
  stones: 'Камни жизни',
  shots: 'Заряды',
  quest: 'Квест',
  epic: 'Теневые эпики',
  scrolls: 'Благословенные и дестракшен свитки',
  elixirs: 'Эликсиры',
  buffs: 'Комплексные баффы',
  tries: 'Попытки',
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

  const coins = Math.max(0, number(inventory.luckCoins));
  const items = [ADENA_OFFER, ...shopTemplate].map((item) => {
    const resetAt = Math.max(0, number(timers[item.command]));
    const onCooldown = resetAt > now;
    return {
      id: item.command,
      command: item.command,
      name: item.name,
      potionId:item.potionId || null,
      category: item.category,
      categoryLabel: CATEGORY_LABELS[item.category] || item.category,
      currency: item.currency || 'gold',
      cost: Math.max(0, number(item.cost)),
      message: item.message || '',
      resetAt,
      onCooldown,
      canAfford: (item.currency === 'luckCoins' ? coins : gold) >= number(item.cost),
      available: !onCooldown && (item.currency === 'luckCoins' ? coins : gold) >= number(item.cost),
    };
  });

  for (const item of getLuckShopState(session, now).items) {
    const category = {passes:'quest',quest:'quest',lifestones:'stones'}[item.group] || item.group;
    items.push({...item, id:`col:${item.id}`, command:`col:${item.id}`, name:item.title,
      category, categoryLabel:CATEGORY_LABELS[category] || category, currency:'luckCoins',
      canAfford:item.affordable, available:item.affordable && !item.full && !item.locked,
      onCooldown:false, resetAt:0, message:[item.subtitle,item.description].filter(Boolean).join(' ')});
  }
  const player=costumePlayer(session,now);
  for(const c of COSTUME_CATALOG.filter(c=>c.gender===player.gender))items.push({
    id:'costume:'+c.id,command:'costume:'+c.id,costumeId:c.id,costumeGender:c.gender,name:c.name,
    category:'costumes',categoryLabel:'Костюмы',currency:'luckCoins',cost:c.cost,
    canAfford:coins>=c.cost,available:coins>=c.cost&&hasInventoryRoom(session),onCooldown:false,resetAt:0,
    message:'Постоянный предмет. Надевается в слот «Костюм». Можно продать на аукционе или отправить почтой. Без бонусов к характеристикам.'});
  return {
    player,
    gold,
    luckCoins: coins,
    categories: Object.entries(CATEGORY_LABELS).map(([id, title]) => ({ id, title })),
    items,
  };
}

export async function buyShopItem(session, command, now = Date.now()) {
  if(typeof command==='string'&&command.startsWith('costume:')){
    const result=buyCostume(session,command.slice(8),now);
    return {...result,action:'buy',shop:getShopState(session,now)};
  }
  if (typeof command === 'string' && command.startsWith('col:')) {
    const result = buyLuckItem(session, command.slice(4), now);
    return {...result, action:'buy', item:result.item && {...result.item,name:result.item.title},
      message:result.ok ? `Куплено: ${result.item.title}.` : '', shop:getShopState(session,now)};
  }
  if (command === ADENA_OFFER.command) {
    const inventory = session?.game?.inventory;
    if (!inventory) return {ok:false, reason:'inventory_missing', shop:getShopState(session,now)};
    const coins = Number(inventory.luckCoins ?? 0);
    const gold = Number(inventory.gold ?? 0);
    if (!Number.isSafeInteger(coins) || coins < ADENA_OFFER.cost) return {ok:false,reason:'not_enough_coins',shop:getShopState(session,now)};
    if (!Number.isSafeInteger(gold) || gold < 0 || !Number.isSafeInteger(gold + ADENA_OFFER.goldAmount)) return {ok:false,reason:'balance_limit',shop:getShopState(session,now)};
    inventory.luckCoins = coins - ADENA_OFFER.cost;
    inventory.gold = gold + ADENA_OFFER.goldAmount;
    return {ok:true,action:'buy',item:{id:command,name:ADENA_OFFER.name,cost:ADENA_OFFER.cost,currency:'luckCoins'},message:'Получено 15 000 адены за 1 CoL.',shop:getShopState(session,now)};
  }
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
