// Mini App face of the merchants (functions/game/shop/merchants.js): the screen state and a purchase.
import {MERCHANTS, buyEntry, merchantPage, merchantStock} from '../functions/game/shop/merchants.js';
import {AMMO_GRADES, AMMO_IDS, ammoKey, convertAmmo, getAmmoState} from '../functions/game/shots/ammo.js';
import {getMaterialCount} from '../functions/game/player/materials.js';

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

/** What the arrow / bolt exchange of the Black Marketeer of Mammon can work with. */
function convertState(session) {
  return AMMO_GRADES.map(grade => ({
    grade,
    arrows: getMaterialCount(session, ammoKey('arrow', grade)),
    bolts: getMaterialCount(session, ammoKey('bolt', grade)),
  }));
}

/** The screen: wallet, the list of merchants and one filtered page of the chosen merchant. */
export function getMerchantsState(session, query = {}) {
  const inventory = session?.game?.inventory || {};
  const stock = merchantStock();
  const merchant = MERCHANTS.some(entry => entry.id === query.merchant) ? query.merchant : MERCHANTS[0].id;
  return {
    gold: Math.max(0, number(inventory.gold)),
    aa: Math.max(0, number(inventory.ancientAdena)),
    level: Math.max(1, number(session?.game?.stats?.lvl, 1)),
    ammo: getAmmoState(session),
    convert: convertState(session),
    merchants: MERCHANTS.map(entry => ({...entry, count: stock[entry.id].length})),
    ...merchantPage(session, merchant, query),
  };
}

export function buyFromMerchant(session, merchantId, entryId, count = 1, query = {}) {
  const result = buyEntry(session, String(merchantId || ''), String(entryId || ''), count);
  const state = getMerchantsState(session, {...query, merchant: merchantId});
  if (!result.ok) return {ok: false, reason: result.reason, needLevel: result.needLevel, merchants: state};
  return {ok: true, action: 'buy', entry: result.entry, count: result.count, spent: result.cost, merchants: state};
}

export function convertAmmunition(session, body = {}, query = {}) {
  const result = convertAmmo(session, {from: body.from, grade: body.grade, count: body.count});
  const state = getMerchantsState(session, query);
  return result.ok ? {ok: true, action: 'convert', ...result, merchants: state} : {ok: false, reason: result.reason, merchants: state};
}

export {AMMO_IDS};
