// Mini App face of the merchants (functions/game/shop/merchants.js): the screen state and a purchase.
import {MERCHANTS, buyEntry, merchantRows} from '../functions/game/shop/merchants.js';

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export function getMerchantsState(session) {
  const inventory = session?.game?.inventory || {};
  return {
    gold: Math.max(0, number(inventory.gold)),
    aa: Math.max(0, number(inventory.ancientAdena)),
    level: Math.max(1, number(session?.game?.stats?.lvl, 1)),
    merchants: MERCHANTS.map(merchant => ({...merchant, items: merchantRows(session, merchant.id)})),
  };
}

export function buyFromMerchant(session, merchantId, entryId, count = 1) {
  const result = buyEntry(session, String(merchantId || ''), String(entryId || ''), count);
  const merchants = getMerchantsState(session);
  if (!result.ok) return {ok: false, reason: result.reason, needLevel: result.needLevel, merchants};
  return {ok: true, action: 'buy', entry: result.entry, count: result.count, spent: result.cost, merchants};
}
