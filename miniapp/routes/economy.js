import { sendJson, httpError, guarded } from '../http/response.js';
import { readJsonBody, withLock } from '../http/request.js';
import { authorize, stateFor, sendResult, assertGoldUnlocked, refreshContextSession } from '../http/auth.js';
import { soulCrystalState, exchangeSeals } from '../../functions/game/equipment/soulCrystals.js';
import getSession from '../../functions/getters/getSession.js';
import getChatSession from '../../functions/getters/getChatSession.js';
import saveSession from '../../functions/getters/saveSession.js';
import { getChestState, openChest } from '../chest.js';
import { getGachaState, rollGacha, resolveGacha } from '../gacha.js';
import { getEquipmentState, performEquipmentAction, craftEquipmentItem, craftNpcEquipment, learnEquipmentRecipe, forgetEquipmentRecipe, buyEnchantScroll } from '../equipment.js';
import { getShopState, buyShopItem } from '../shop.js';
import { getMiniAppSwordDashboard, rollMiniAppSword } from '../sword.js';
import { getGoldTransferState, transferGoldForMiniApp } from '../goldTransfer.js';
import { getLabState, brewLabRune } from '../../functions/game/runes/labRunes.js';
import { discardInventoryItem, getInventoryState, sellLoot, useInventoryPotion } from '../inventory.js';
import { getExchangeState, buyCrystalsForMiniApp } from '../exchange.js';
import { createStarInvoice, getStarsState, mongoStarStore } from '../stars.js';
import bot from '../../bot.js';
import { warehouseFor, transferWarehouse } from '../warehouse.js';
import { tradeFor, performTrade } from '../trade.js';
import { buyFromMerchant, convertAmmunition, getMerchantsState } from '../merchants.js';
import { getTattooState, performTattooAction } from '../tattoos.js';
import { buyLuckItem, getLuckShopState } from '../luck.js';
import { buyLot, cancelLot, createLot, deliverToSeller, getAuctionState, mongoAuctionStore, returnExpiredLots, settleSales, undoMailed } from '../auction.js';

export const alchemyState = guarded('alchemy lab state', async (req, res) => {
  const context = await authorize(req);
  const lab = await withLock(context.chatId, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return getLabState(context.session);
  });
  return sendJson(res, 200, lab);
});

export const alchemyBrew = guarded('alchemy lab brew', async (req, res) => {
  const context = await authorize(req);
  const result = await withLock(context.chatId, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const brewed = brewLabRune(context.session);
    if (brewed.ok) await saveSession(context.session);
    return brewed;
  });
  return sendResult(res, result, context);
});

export const inventoryState = guarded('inventory state', async (req, res) => {
  const context = await authorize(req);
  const inventory = await withLock(`${context.chatId}:${context.userId}:inventory`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return getInventoryState(context.session);
  });
  return sendJson(res, 200, inventory);
});

export const inventoryUse = guarded('inventory use', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (!['string', 'number'].includes(typeof body.key) || String(body.key).trim() === '') {
    throw httpError(400, 'key is required');
  }

  const result = await withLock(`${context.chatId}:${context.userId}:inventory`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const used = useInventoryPotion(context.session, body.key);
    if (used.ok) await saveSession(context.session);
    return used;
  });

  return sendResult(res, result, context);
});

export const inventorySell = guarded('inventory sell', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const result = await withLock(`${context.chatId}:${context.userId}:inventory`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const sold = sellLoot(context.session, body.key, body.count ?? null);
    if (sold.ok) await saveSession(context.session);
    return sold;
  });
  return sendResult(res, result, context);
});

export const inventoryDiscard = guarded('inventory discard', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const result = await withLock(`${context.chatId}:${context.userId}:inventory`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const discarded = discardInventoryItem(context.session, body);
    if (discarded.ok) await saveSession(context.session);
    return discarded;
  });
  return sendResult(res, result, context);
});

let starStorePromise = null;

const starStore = () => (starStorePromise ||= mongoStarStore());

export const exchangeState = guarded('exchange state', async (req, res) => {
  const context = await authorize(req);
  const exchange = await withLock(`${context.chatId}:${context.userId}:exchange`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return getExchangeState(context.session);
  });
  const hasPaid = await (await starStore()).hasPaid(context.chatId, context.userId);
  return sendJson(res, 200, { ...exchange, stars: getStarsState(context.session, { hasPaid }) });
});

export const starsInvoice = guarded('stars invoice', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const result = await createStarInvoice({
    store: await starStore(), api: bot.api, chatId: context.chatId, userId: context.userId, packId: String(body.packId || ''),
  });
  if (result.ok) return sendJson(res, 200, { ok: true, url: result.url, pack: result.pack, bonus: result.bonus });
  if (result.error) console.error('[stars] invoice failed:', result.error);
  return sendJson(res, result.reason === 'invoice_failed' ? 502 : 409, { ok: false, reason: result.reason });
});

let auctionStorePromise = null;

const auctionStore = () => (auctionStorePromise ||= mongoAuctionStore());

/** The chat lock is shared with the schedulers (the key is the bare chat id). */
const auctionLock = context => String(context.chatId);

export const auctionState = guarded('auction state', async (req, res, requestUrl) => {
  const context = await authorize(req);
  const state = await withLock(auctionLock(context), async () => {
    context.session = await getSession(context.chatId, context.userId);
    const store = await auctionStore();
    // The player's lots that ran out and sales that are still unpaid reach his mail before anything is shown.
    const sold = await settleSales(context.session, store);
    const expired = await returnExpiredLots(context.session, store);
    if (sold.length || expired.length) {
      try {
        await saveSession(context.session);
      } catch (error) {
        await undoMailed(store, sold, expired);
        throw error;
      }
    }
    return getAuctionState(context.session, store, {
      kind: requestUrl.searchParams.get('kind') || 'all',
      sort: requestUrl.searchParams.get('sort') || 'new',
    });
  });
  return sendJson(res, 200, state);
});

export const auctionList = guarded('auction list', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const result = await withLock(auctionLock(context), async () => {
    context.session = await getSession(context.chatId, context.userId);
    const store = await auctionStore();
    const created = await createLot(context.session, store, {
      kind: String(body.kind || ''), ref: String(body.ref ?? ''), count: body.count ?? 1, price: body.price,
    });
    if (created.ok) {
      try {
        await saveSession(context.session);
      } catch (error) {
        await store.claim(created.lot.id, 'active', 'cancelled', { returned: true }).catch(() => {});
        throw error;
      }
    }
    return { ...created, auction: await getAuctionState(context.session, store) };
  });
  return sendResult(res, result, context);
});

export const auctionBuy = guarded('auction buy', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  assertGoldUnlocked(context);
  const result = await withLock(auctionLock(context), async () => {
    context.session = await getSession(context.chatId, context.userId);
    const store = await auctionStore();
    const bought = await buyLot(context.session, store, String(body.lotId || ''));
    if (bought.ok) {
      try {
        await saveSession(context.session);
      } catch (error) {
        await bought.undo().catch(() => {});
        throw error;
      }
      delete bought.undo;
    }
    return { ...bought, auction: await getAuctionState(context.session, store) };
  });
  // A seller outside this chat document is mailed under his own chat lock, after the buyer's lock is released.
  if (result.deferred) {
    const store = await auctionStore();
    deliverToSeller(store, { withLock, getSession, saveSession }, result.deferred)
      .catch(error => console.warn('[auction] seller mail will be retried:', error.message));
  }
  delete result.deferred;
  return sendResult(res, result, context);
});

export const auctionCancel = guarded('auction cancel', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const result = await withLock(auctionLock(context), async () => {
    context.session = await getSession(context.chatId, context.userId);
    const store = await auctionStore();
    const cancelled = await cancelLot(context.session, store, String(body.lotId || ''));
    if (cancelled.ok) await saveSession(context.session);
    return { ...cancelled, auction: await getAuctionState(context.session, store) };
  });
  return sendResult(res, result, context);
});

export const luckShopState = guarded('luck shop state', async (req, res) => {
  const context = await authorize(req);
  const luck = await withLock(context.chatId, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return getLuckShopState(context.session);
  });
  return sendJson(res, 200, luck);
});

export const luckShopBuy = guarded('luck shop buy', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (typeof body.itemId !== 'string') throw httpError(400, 'itemId is required');
  const result = await withLock(context.chatId, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const bought = buyLuckItem(context.session, body.itemId);
    if (bought.ok) await saveSession(context.session);
    return { ...bought, luck: getLuckShopState(context.session) };
  });
  return sendResult(res, result, context);
});

export const exchangeBuy = guarded('exchange buy', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  assertGoldUnlocked(context);
  const result = await withLock(`${context.chatId}:${context.userId}:exchange`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const purchase = buyCrystalsForMiniApp(context.session, body.amount);
    if (purchase.ok) await saveSession(context.session);
    return purchase;
  });
  return sendResult(res, result, context);
});

export const goldTransferState = guarded('gold transfer state', async (req, res) => {
  const context = await authorize(req);
  const transfer = await withLock(`${context.chatId}:gold-transfer`, async () => {
    const chat = await getChatSession(context.chatId);
    refreshContextSession(context, chat);
    return getGoldTransferState(chat, context.userId);
  });
  return sendJson(res, 200, transfer);
});

export const goldTransferSend = guarded('gold transfer send', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  assertGoldUnlocked(context);
  if (!['string', 'number'].includes(typeof body.recipientId) || String(body.recipientId).trim() === '') {
    throw httpError(400, 'recipientId is required');
  }

  const result = await withLock(`${context.chatId}:gold-transfer`, async () => {
    const chat = await getChatSession(context.chatId);
    const moved = transferGoldForMiniApp(chat, context.userId, body.recipientId, body.amount);
    if (moved.ok) await chat.save();
    refreshContextSession(context, chat);
    return moved;
  });
  return sendResult(res, result, context);
});

export const warehouseState=guarded('warehouse state',async(req,res,url)=>{
  const context=await authorize(req),scope=url.searchParams.get('scope')||'character';
  if(!['character','clan'].includes(scope))throw httpError(400,'Unknown warehouse');
  return sendJson(res,200,await warehouseFor(context.chatId,context.userId,scope));
});

export const warehouseTransfer=guarded('warehouse transfer',async(req,res)=>{
  const context=await authorize(req),body=await readJsonBody(req);
  if(body.kind==='currency'&&body.ref==='gold')assertGoldUnlocked(context);
  const result=await withLock('clan:global',()=>withLock(String(context.chatId),()=>transferWarehouse(context.chatId,context.userId,body)));
  context.session=await getSession(context.chatId,context.userId);
  return sendJson(res,result.ok?200:409,{...result,warehouse:await warehouseFor(context.chatId,context.userId,body.scope||'character'),state:stateFor(context)});
});

export const tradeRead=guarded('trade state',async(req,res)=>{
  const context=await authorize(req);return sendJson(res,200,await tradeFor(context.chatId,context.userId));
});

export const tradeAction=guarded('trade action',async(req,res)=>{
  const context=await authorize(req),body=await readJsonBody(req);
  const result=await withLock(String(context.chatId),()=>performTrade(context.chatId,context.userId,body));
  context.session=await getSession(context.chatId,context.userId);
  return sendJson(res,result.ok?200:409,{...result,tradeState:await tradeFor(context.chatId,context.userId),state:stateFor(context)});
});

export const chestState = guarded('chest state', async (req, res) => {
  const context = await authorize(req);
  return sendJson(res, 200, getChestState(context.session));
});

export const chestOpen = guarded('open chest', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const result = await withLock(`${context.chatId}:${context.userId}:chest`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    try {
      const opened = openChest(context.session, context.chatId, body.chestId);
      if (opened.ok) await saveSession(context.session);
      return opened;
    } catch (error) {
      if (!error.status && /Chest id/.test(error.message || '')) error.status = 400;
      throw error;
    }
  });
  return sendResult(res, result, context);
});

export const gachaState = guarded('gacha state', async (req, res) => {
  const context = await authorize(req);
  return sendJson(res, 200, getGachaState(context.session));
});

export const gachaRoll = guarded('gacha roll', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  assertGoldUnlocked(context);
  if (typeof body.gachaType !== 'string' || !body.gachaType) {
    throw httpError(400, 'gachaType is required');
  }
  const result = await withLock(`${context.chatId}:${context.userId}:gacha`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const rolled = rollGacha(context.session, body.gachaType);
    if (rolled.ok) await saveSession(context.session);
    return rolled;
  });
  return sendResult(res, result, context);
});

export const gachaResolve = guarded('gacha resolve', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (!['save', 'break'].includes(body.action)) {
    throw httpError(400, 'action must be save or break');
  }
  const result = await withLock(`${context.chatId}:${context.userId}:gacha`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const resolved = resolveGacha(context.session, body.action);
    if (resolved.ok) await saveSession(context.session);
    return resolved;
  });
  return sendResult(res, result, context);
});

export const equipmentState = guarded('equipment state', async (req, res) => {
  const context = await authorize(req);
  return sendJson(res, 200, getEquipmentState(context.session));
});

export const equipmentAction = guarded('equipment action', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (['enchant', 'augment', 'attribute', 'attribute_clear', 'sa_install', 'sa_remove', 'unseal'].includes(body.action)) assertGoldUnlocked(context);
  if (typeof body.key !== 'string' || !body.key) {
    throw httpError(400, 'equipment key is required');
  }
  if (!['equip', 'unequip', 'sell', 'enchant', 'augment', 'attribute', 'attribute_clear', 'sa_install', 'sa_remove', 'ls_activate', 'crystallize', 'unseal'].includes(body.action)) {
    throw httpError(400, 'action must be equip, unequip, sell, enchant, augment, attribute, attribute_clear, ls_activate or crystallize');
  }
  const result = await withLock(`${context.chatId}:${context.userId}:equipment`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const updated = performEquipmentAction(context.session, body.key, body.action, { scrollKey: typeof body.scrollKey === 'string' ? body.scrollKey : null, saId: typeof body.saId==='string'?body.saId:null, blessed: body.blessed === true, scroll: typeof body.scroll === 'string' ? body.scroll : null, tier: typeof body.tier === 'string' ? body.tier : null, element: typeof body.element === 'string' ? body.element : null });
    if (updated.ok) await saveSession(context.session);
    return updated;
  });
  return sendResult(res, result, context);
});

const makeEquipmentCraft = (npc=false)=>guarded(npc?'equipment npc craft':'equipment craft', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  assertGoldUnlocked(context);
  if (typeof body.itemId !== 'string' || !body.itemId) {
    throw httpError(400, 'itemId is required');
  }
  const result = await withLock(`${context.chatId}:${context.userId}:equipment`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const updated = npc?craftNpcEquipment(context.session,body.itemId):craftEquipmentItem(context.session, body.itemId);
    if (updated.ok) await saveSession(context.session);
    return updated;
  });
  return sendResult(res, result, context);
});

export const equipmentCraft=makeEquipmentCraft();

export const equipmentNpcCraft=makeEquipmentCraft(true);

export const equipmentRecipe = guarded('equipment recipe', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  assertGoldUnlocked(context);
  if (typeof body.itemId !== 'string' || !body.itemId) {
    throw httpError(400, 'itemId is required');
  }
  const result = await withLock(`${context.chatId}:${context.userId}:equipment`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    if(body.action&&!['learn','forget'].includes(body.action))throw httpError(400,'invalid_action');
    const updated = body.action==='forget'?forgetEquipmentRecipe(context.session,body.itemId):learnEquipmentRecipe(context.session, body.itemId);
    if (updated.ok) await saveSession(context.session);
    return updated;
  });
  return sendResult(res, result, context);
});

export const equipmentScroll = guarded('equipment scroll', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  assertGoldUnlocked(context);
  if (typeof body.grade !== 'string' || !body.grade) {
    throw httpError(400, 'grade is required');
  }
  const result = await withLock(`${context.chatId}:${context.userId}:equipment`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const updated = buyEnchantScroll(context.session, body.grade, {
      blessed: body.blessed === true,
      withCrystals: body.withCrystals === true,
    });
    if (updated.ok) await saveSession(context.session);
    return updated;
  });
  return sendResult(res, result, context);
});

// A screen request may carry the filters: merchant, page, grade, group, search, usable, affordable.
const merchantQuery = body => ({
  merchant: typeof body?.merchant === 'string' ? body.merchant : undefined,
  page: body?.page, grade: typeof body?.grade === 'string' ? body.grade : null, group: typeof body?.group === 'string' ? body.group : null,
  search: typeof body?.search === 'string' ? body.search : '', usable: body?.usable === true, affordable: body?.affordable === true,
});

export const merchantsState = guarded('merchants state', async (req, res) => {
  const context = await authorize(req);
  const body = req.method === 'POST' ? await readJsonBody(req) : {};
  const state = await withLock(`${context.chatId}:${context.userId}:inventory`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return getMerchantsState(context.session, merchantQuery(body));
  });
  return sendJson(res, 200, state);
});

export const merchantsConvert = guarded('merchants convert', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const result = await withLock(`${context.chatId}:${context.userId}:inventory`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const done = convertAmmunition(context.session, body, merchantQuery(body.query));
    if (done.ok) await saveSession(context.session);
    return done;
  });
  return sendResult(res, result, context);
});

export const merchantsBuy = guarded('merchants buy', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const result = await withLock(`${context.chatId}:${context.userId}:inventory`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const bought = buyFromMerchant(context.session, body.merchant, body.entry, body.count ?? 1, merchantQuery(body.query));
    if (bought.ok) await saveSession(context.session);
    return bought;
  });
  return sendResult(res, result, context);
});

export const tattoosState = guarded('tattoos state', async (req, res) => {
  const context = await authorize(req);
  const state = await withLock(`${context.chatId}:${context.userId}:inventory`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return getTattooState(context.session);
  });
  return sendJson(res, 200, state);
});

export const tattoosAction = guarded('tattoos action', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (['apply', 'remove'].includes(body.action)) assertGoldUnlocked(context);
  const result = await withLock(`${context.chatId}:${context.userId}:inventory`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const done = performTattooAction(context.session, body.action, body);
    if (done.ok && body.action !== 'list') await saveSession(context.session);
    return done;
  });
  return sendResult(res, result, context);
});

export const shopSealState=guarded('shop seal state',async(req,res)=>{
  const context=await authorize(req);const {aa,seals}=soulCrystalState(context.session);
  return sendJson(res,200,{aa,seals});
});

export const shopSealExchange=guarded('shop seal exchange',async(req,res)=>{
  const context=await authorize(req),body=await readJsonBody(req);assertGoldUnlocked(context);
  const result=await withLock(context.chatId,async()=>{
    context.session=await getSession(context.chatId,context.userId);
    const outcome=exchangeSeals(context.session,body.counts);
    if(outcome.ok)await saveSession(context.session);
    const {aa,seals}=soulCrystalState(context.session);return {...outcome,exchange:{aa,seals}};
  });
  return sendResult(res,result,context);
});

export const shopState = guarded('shop state', async (req, res) => {
  const context = await authorize(req);
  const shop = await withLock(context.chatId, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return getShopState(context.session);
  });
  return sendJson(res, 200, shop);
});

export const shopBuy = guarded('shop buy', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  assertGoldUnlocked(context);
  if (typeof body.command !== 'string' || !body.command) {
    throw httpError(400, 'command is required');
  }
  const result = await withLock(context.chatId, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const purchase = await buyShopItem(context.session, body.command);
    if (purchase.ok) await saveSession(context.session);
    return purchase;
  });
  return sendResult(res, result, context);
});

export const swordState = guarded('sword state', async (req, res) => {
  const context = await authorize(req);
  const sword = await withLock(`${context.chatId}:sword`, async () => {
    const chat = await getChatSession(context.chatId);
    refreshContextSession(context, chat);
    return getMiniAppSwordDashboard(chat, context.userId);
  });
  return sendJson(res, 200, sword);
});

export const swordRoll = guarded('sword roll', async (req, res) => {
  const context = await authorize(req);
  const result = await withLock(`${context.chatId}:sword`, async () => {
    const chat = await getChatSession(context.chatId);
    refreshContextSession(context, chat);
    const rolled = rollMiniAppSword(context.session);
    if (rolled.ok) await chat.save();
    return {
      ...rolled,
      sword: getMiniAppSwordDashboard(chat, context.userId),
    };
  });
  return sendResult(res, result, context);
});
