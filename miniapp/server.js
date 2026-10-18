import { sendJson, sendApiError } from './http/response.js';
import { serveFile, servePage, getPage, WEBAPP_DIR, GAME_ASSETS_DIR, THREE_DIR, THREE_PUBLIC_PREFIXES, PHASER_DIR } from './http/static.js';
import http from 'http';
import { requestUrl as parseRequestUrl, requestBoundary } from './requestBoundary.js';
import { academyAction, academyState, badges, bootstrap, buildsAction, buildsState, characterState, classBuffsCast, classBuffsState, classQuestsAction, classQuestsState, feedbackSubmit, formsSave, formsState, noticesState, passivesLearn, passivesState, playerCard, playerProfileClass, playerProfileGender, playerProfileNickname, playerProfileRace, playerProfileState, playerProfileSubclass, playerSkillsEnchant, playerSkillsLearn, playerSkillsRoute, playerSkillsState, titlesAssign, titlesState, updatesSettings, updatesState } from './routes/profile.js';
import { arcadeReset, arcadeRoll, arcadeStart, arcadeState, elementsAction, elementsState, fishingAction, point21Action, point21State, stealAttack, stealState } from './routes/games.js';
import { gwentRead, gwentWrite } from './routes/gwent.js';
import { diceRead, diceWrite } from './routes/dice.js';
import { alchemyBrew, alchemyState, auctionBuy, auctionCancel, auctionList, auctionState, chestOpen, chestState, equipmentAction, equipmentCraft, equipmentNpcCraft, equipmentRecipe, equipmentScroll, equipmentState, exchangeBuy, exchangeState, gachaResolve, gachaRoll, gachaState, goldTransferSend, goldTransferState, inventoryDiscard, inventorySell, inventoryState, inventoryUse, luckShopBuy, luckShopState, merchantsBuy, merchantsConvert, merchantsState, shopBuy, shopSealExchange, shopSealState, shopState, starsInvoice, swordRoll, swordState, tattoosAction, tattoosState, tradeAction, tradeRead, warehouseState, warehouseTransfer } from './routes/economy.js';
import { adminNotice, adminPromo, adminState, adminToolsRun, adminToolsState, bonusClaim, bonusState, clanAction, clanActivity, clanQuiz, clanState, horoscopeGenerate, horoscopeSettings, horoscopeShare, horoscopeState, loginRewardsAction, loginRewardsState, mailAction, mailClaim, mailState, partyAction, partyState, promoRedeem, socialFriend, socialState } from './routes/community.js';
import { arenaAttack, arenaState, bossEpic, bossSkill, bossState, bossSummon, combatChat, huntAttack, huntDrop, huntFlee, huntHotbar, huntLoot, huntMove, huntSkill, huntSpecial, huntStart, huntState, huntSupplies, huntTarget, sealExchange, shotsAuto, soulCharge, soulSelect, worldRequest } from './routes/hunt.js';

export default function startMiniAppServer() {
  if (process.env.MINI_APP_ENABLED === 'false') return null;

  const port = Number(process.env.MINI_APP_PORT || process.env.PORT || 8080);
  const host = process.env.MINI_APP_HOST || '0.0.0.0';

  getPage(); // Prepare the stylesheet bundle before accepting requests.
  const handleRequest = async (req, res) => {
    const requestUrl = parseRequestUrl(req);
    const route = `${req.method} ${requestUrl.pathname}`;

    if (route === 'GET /healthz') return sendJson(res, 200, { ok: true });
    if (route === 'GET /api/bootstrap') return bootstrap(req, res);
    if (route === 'GET /api/updates') return updatesState(req, res);
    if (route === 'POST /api/updates/settings') return updatesSettings(req, res);
    if (route === 'POST /api/feedback') return feedbackSubmit(req, res);
    if (route === 'GET /api/forms') return formsState(req, res);
    if (route === 'POST /api/forms/save') return formsSave(req, res);
    if (route === 'GET /api/character') return characterState(req, res);
    if (route === 'GET /api/profile') return playerProfileState(req, res);
    if (route === 'GET /api/alchemy') return alchemyState(req, res);
    if (route === 'POST /api/alchemy/brew') return alchemyBrew(req, res);
    if (route === 'POST /api/profile/class') return playerProfileClass(req, res);
    if (route === 'POST /api/profile/gender') return playerProfileGender(req, res);
    if (route === 'POST /api/profile/nickname') return playerProfileNickname(req,res);
    if (route === 'POST /api/profile/race') return playerProfileRace(req, res);
    if (route === 'POST /api/profile/subclass') return playerProfileSubclass(req, res);
    if (route === 'GET /api/skills') return playerSkillsState(req, res);
    if (route === 'POST /api/skills/enchant') return playerSkillsEnchant(req, res);
    if (route === 'POST /api/skills/learn') return playerSkillsLearn(req, res);
    if (route === 'POST /api/skills/route') return playerSkillsRoute(req, res);
    if (route === 'GET /api/class-quests') return classQuestsState(req, res);
    if (route === 'POST /api/class-quests') return classQuestsAction(req, res);
    if (route === 'GET /api/inventory') return inventoryState(req, res);
    if (route === 'GET /api/warehouse') return warehouseState(req,res,requestUrl);
    if (route === 'POST /api/warehouse/transfer') return warehouseTransfer(req,res);
    if (route === 'GET /api/trade') return tradeRead(req,res);
    if (route === 'POST /api/trade/action') return tradeAction(req,res);
    if (route === 'POST /api/inventory/use') return inventoryUse(req, res);
    if (route === 'POST /api/inventory/sell') return inventorySell(req, res);
    if (route === 'POST /api/inventory/discard') return inventoryDiscard(req, res);
    if (route === 'GET /api/exchange') return exchangeState(req, res);
    if (route === 'POST /api/exchange/buy') return exchangeBuy(req, res);
    if (route === 'POST /api/stars/invoice') return starsInvoice(req, res);
    if (route === 'GET /api/luck') return luckShopState(req, res);
    if (route === 'GET /api/auction') return auctionState(req, res, requestUrl);
    if (route === 'POST /api/auction/list') return auctionList(req, res);
    if (route === 'POST /api/auction/buy') return auctionBuy(req, res);
    if (route === 'POST /api/auction/cancel') return auctionCancel(req, res);
    if (route === 'POST /api/luck/buy') return luckShopBuy(req, res);
    if (route === 'GET /api/gold-transfer') return goldTransferState(req, res);
    if (route === 'POST /api/gold-transfer/send') return goldTransferSend(req, res);
    if (route === 'GET /api/social') return socialState(req, res);
    if (route === 'POST /api/social/friend') return socialFriend(req, res);
    if (route === 'GET /api/badges') return badges(req, res);
    if (route === 'GET /api/buffs') return classBuffsState(req, res);
    if (route === 'POST /api/buffs/cast') return classBuffsCast(req, res);
    if (route === 'GET /api/passives') return passivesState(req, res);
    if (route === 'POST /api/passives/learn') return passivesLearn(req, res);
    if (route === 'GET /api/mail') return mailState(req, res);
    if (route === 'POST /api/mail/action') return mailAction(req, res);
    if (route === 'POST /api/mail/claim') return mailClaim(req, res);
    if (route === 'POST /api/promo/redeem') return promoRedeem(req, res);
    if (route === 'GET /api/notices') return noticesState(req, res);
    if (route === 'GET /api/admin') return adminState(req, res);
    if (route === 'POST /api/admin/promo') return adminPromo(req, res);
    if (route === 'POST /api/admin/notice') return adminNotice(req, res);
    if (route === 'GET /api/admin/tools') return adminToolsState(req, res);
    if (route === 'POST /api/admin/tools') return adminToolsRun(req, res);
    if (route === 'GET /api/player') return playerCard(req, res, requestUrl);
    if (route === 'GET /api/steal') return stealState(req, res);
    if (route === 'POST /api/steal/attack') return stealAttack(req, res);
    if (route === 'GET /api/dice') return diceRead(req, res);
    if (route === 'POST /api/dice/action') return diceWrite(req, res);
    if (route === 'GET /api/gwent') return gwentRead(req, res);
    if (route === 'POST /api/gwent/action') return gwentWrite(req, res);
    if (route === 'GET /api/point21') return point21State(req, res);
    if (route === 'POST /api/point21/action') return point21Action(req, res);
    if (route === 'GET /api/elements') return elementsState(req, res);
    if (route === 'POST /api/elements/action') return elementsAction(req, res);
    if (route === 'GET /api/bonus') return bonusState(req, res);
    if (route === 'POST /api/bonus/claim') return bonusClaim(req, res);
    if (route === 'GET /api/titles') return titlesState(req, res);
    if (route === 'POST /api/titles/assign') return titlesAssign(req, res);
    if (route === 'GET /api/horoscope') return horoscopeState(req, res);
    if (route === 'POST /api/horoscope/settings') return horoscopeSettings(req, res);
    if (route === 'POST /api/horoscope/generate') return horoscopeGenerate(req, res);
    if (route === 'POST /api/horoscope/share') return horoscopeShare(req, res);
    if (route === 'GET /api/clan') return clanState(req, res);
    if (route === 'POST /api/clan/action') return clanAction(req, res);
    if (route === 'POST /api/clan/quiz') return clanQuiz(req, res);
    if (route === 'POST /api/clan/activity') return clanActivity(req, res);
    if (route === 'GET /api/chest') return chestState(req, res);
    if (route === 'POST /api/chest/open') return chestOpen(req, res);
    if (route === 'GET /api/gacha') return gachaState(req, res);
    if (route === 'POST /api/gacha/roll') return gachaRoll(req, res);
    if (route === 'POST /api/gacha/resolve') return gachaResolve(req, res);
    if (route === 'GET /api/equipment') return equipmentState(req, res);
    if (route === 'POST /api/equipment/action') return equipmentAction(req, res);
    if (route === 'POST /api/equipment/craft') return equipmentCraft(req, res);
    if (route === 'POST /api/equipment/npc-craft') return equipmentNpcCraft(req,res);
    if (route === 'POST /api/equipment/scroll') return equipmentScroll(req, res);
    if (route === 'POST /api/equipment/recipe') return equipmentRecipe(req, res);
    if (route === 'GET /api/login-rewards') return loginRewardsState(req,res);
    if (route === 'POST /api/login-rewards/action') return loginRewardsAction(req,res);
    if (route === 'GET /api/academy') return academyState(req, res);
    if (route === 'POST /api/academy/action') return academyAction(req, res);
    if (route === 'GET /api/builds') return buildsState(req, res);
    if (route === 'POST /api/builds/action') return buildsAction(req, res);
    if (route === 'GET /api/arena') return arenaState(req, res, requestUrl);
    if (route === 'POST /api/arena/attack') return arenaAttack(req, res);
    if (route === 'GET /api/boss') return bossState(req, res, requestUrl);
    if (route === 'GET /api/hunt') return huntState(req, res);
    if (route === 'GET /api/combat/chat' || route === 'POST /api/combat/chat') return combatChat(req,res);
    if (route === 'GET /api/world' || route === 'POST /api/world/action') return worldRequest(req,res);
    if (route === 'POST /api/hunt/start') return huntStart(req, res);
    if (route === 'POST /api/fishing') return fishingAction(req, res);
    if (route === 'GET /api/tattoos') return tattoosState(req, res);
    if (route === 'POST /api/tattoos') return tattoosAction(req, res);
    if (route === 'GET /api/merchants') return merchantsState(req, res);
    if (route === 'POST /api/merchants') return merchantsState(req, res);
    if (route === 'POST /api/merchants/convert') return merchantsConvert(req, res);
    if (route === 'POST /api/merchants/buy') return merchantsBuy(req, res);
    if (route === 'GET /api/party') return partyState(req, res);
    if (route === 'POST /api/party/action') return partyAction(req, res);
    if (route === 'POST /api/hunt/loot') return huntLoot(req, res);
    if (route === 'POST /api/hunt/move') return huntMove(req, res);
    if (route === 'POST /api/hunt/target') return huntTarget(req, res);
    if (route === 'POST /api/hunt/attack') return huntAttack(req,res);
    if (route === 'POST /api/hunt/skill') return huntSkill(req, res);
    if (route === 'POST /api/hunt/hotbar') return huntHotbar(req, res);
    if (route === 'POST /api/hunt/drop') return huntDrop(req, res);
    if (route === 'POST /api/hunt/supplies') return huntSupplies(req, res);
    if (route === 'POST /api/hunt/special') return huntSpecial(req, res);
    if (route === 'POST /api/hunt/flee') return huntFlee(req, res);
    if (route === 'POST /api/soul/select') return soulSelect(req, res);
    if (route === 'POST /api/hunt/soul') return soulCharge(req, res);
    if (route === 'GET /api/shop/exchange') return shopSealState(req,res);
    if (route === 'POST /api/shop/exchange') return shopSealExchange(req,res);
    if (route === 'POST /api/catacombs/exchange') return sealExchange(req, res);
    if (route === 'POST /api/shots/auto') return shotsAuto(req, res);
    if (route === 'GET /api/boss/epic') return bossEpic(req, res);
    if (route === 'POST /api/boss/summon') return bossSummon(req, res);
    if (route === 'POST /api/boss/skill') return bossSkill(req, res);
    if (route === 'GET /api/shop') return shopState(req, res);
    if (route === 'POST /api/shop/buy') return shopBuy(req, res);
    if (route === 'GET /api/sword') return swordState(req, res);
    if (route === 'POST /api/sword/roll') return swordRoll(req, res);
    if (route === 'GET /api/arcade') return arcadeState(req, res);
    if (route === 'POST /api/arcade/start') return arcadeStart(req, res);
    if (route === 'POST /api/arcade/reset') return arcadeReset(req, res);
    if (route === 'POST /api/arcade/roll') return arcadeRoll(req, res);

    if (req.method === 'GET' && requestUrl.pathname.startsWith('/game-assets/')) {
      const assetPath = requestUrl.pathname.slice('/game-assets/'.length);
      if (await serveFile(res, GAME_ASSETS_DIR, assetPath)) return;
      return sendJson(res, 404, { error: 'Asset not found' });
    }

    if (req.method === 'GET' && requestUrl.pathname.startsWith('/vendor/three/')) {
      const vendorPath = requestUrl.pathname.slice('/vendor/three/'.length);
      if (THREE_PUBLIC_PREFIXES.some(prefix => vendorPath.startsWith(prefix)) && await serveFile(res, THREE_DIR, vendorPath)) return;
      return sendJson(res, 404, { error: 'Asset not found' });
    }

    if (req.method === 'GET' && requestUrl.pathname === '/vendor/phaser/phaser.esm.min.js') {
      if (await serveFile(res, PHASER_DIR, 'phaser.esm.min.js')) return;
      return sendJson(res, 404, {error:'Asset not found'});
    }
    if (req.method === 'GET' && servePage(res, requestUrl.pathname)) return;
    if (req.method === 'GET' && await serveFile(res, WEBAPP_DIR, requestUrl.pathname)) return;
    // A missing model must 404: the SPA fallback below would hand the glTF
    // loader an HTML page with status 200.
    if (req.method === 'GET' && requestUrl.pathname.startsWith('/models/')) return sendJson(res, 404, { error: 'Model not found' });
    if (req.method === 'GET' && requestUrl.pathname.startsWith('/art/')) return sendJson(res, 404, { error: 'Artwork not found' });
    if (req.method === 'GET' && servePage(res, '/index.html')) return;
    if (req.method === 'GET' && await serveFile(res, WEBAPP_DIR, '/index.html')) return;
    return sendJson(res, 404, { error: 'Not found' });
  };
  const server = http.createServer(requestBoundary(handleRequest, (res,error) => sendApiError(res,'request',error)));

  server.listen(port, host, () => {
    console.log(`[miniapp] WebGL Mini App listening on http://${host}:${port}`);
  });

  return server;
}
