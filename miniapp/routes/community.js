import { sendJson, httpError, guarded } from '../http/response.js';
import { readJsonBody, withLock } from '../http/request.js';
import { authorize, stateFor, requireAdmin, sendResult, assertGoldUnlocked } from '../http/auth.js';
import { getLoginRewardsState, claimLoginReward, redeemLoginItem } from '../../functions/game/login/loginRewards.js';
import getSession from '../../functions/getters/getSession.js';
import getChatSession from '../../functions/getters/getChatSession.js';
import saveSession from '../../functions/getters/saveSession.js';
import getClan from '../../functions/game/clans/getClan.js';
import { findMember, getSocialState, memberName, setFriend } from '../social.js';
import sendMessage from '../../functions/tgBotFunctions/sendMessage.js';
import { getBonusState, claimBonus } from '../bonus.js';
import { getHoroscopeState, updateHoroscopeSettings, generateHoroscopeForMiniApp, shareHoroscopeForMiniApp } from '../horoscope.js';
import { getClanDashboard, createClanForMiniApp, joinClanForMiniApp, leaveClanForMiniApp, disbandClanForMiniApp, prepareClanContribution, prepareClanQuizAnswer } from '../clan.js';
import { claimAllMail, claimMail, createPromo, deleteNotice, deletePromo, getMailbox, listNotices, listPromos, PROMO_ERRORS, redeemPromo, releasePromo, saveNotice, setPromoExpiry, validateNotice, validatePromo } from '../promo.js';
import { ADMIN_TOOL_ERRORS, getAdminToolsState, runChatTool, runGlobalTool, runPlayerTool } from '../adminTools.js';
import { bidForClanHall } from '../clanHallAuction.js';
import { mailboxFor } from '../mail.js';
import { getPartyState, performPartyAction, attachPartyPeers } from '../party.js';
import { syncClanPerks } from '../../functions/game/clans/clanPerks.js';
import { performRtaAction } from '../clanRta.js';
import { pushAll, pushTo } from '../notifications.js';
import { prepareClanActivity } from '../clanActivities.js';
import { performClanCompetitionAction } from '../clanCompetition.js';
import { performClanManagementAction } from '../clanManagement.js';
import { prepareClanProgressionAction } from '../clanProgression.js';

const SOCIAL_REASONS_STATUS = { not_member: 403, unknown_player: 404 };

async function clanInfo(userId) {
  try {
    const clan = await getClan(Number(userId));
    return clan ? { name: clan.name, memberIds: (clan.members || []).map(member => String(member.userId)) } : { name: null, memberIds: [] };
  } catch {
    return { name: null, memberIds: [] };
  }
}

export const socialState = guarded('social state', async (req, res) => {
  const context = await authorize(req);
  const chat = await getChatSession(context.chatId);
  const clan = await clanInfo(context.userId);
  return sendJson(res, 200, getSocialState(chat, context.userId, { clanMemberIds: clan.memberIds, clanName: clan.name }));
});

export const socialFriend = guarded('social friend', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (!['string', 'number'].includes(typeof body.userId) || !['add', 'accept', 'decline', 'cancel', 'remove'].includes(body.action)) {
    throw httpError(400, 'userId and action (add | accept | decline | cancel | remove) are required');
  }
  const result = await withLock(`${context.chatId}:social`, async () => {
    const chat = await getChatSession(context.chatId);
    const updated = setFriend(chat, context.userId, String(body.userId), body.action);
    if (updated.ok) await chat.save();
    return { updated, chat };
  });
  const clan = await clanInfo(context.userId);
  const social = getSocialState(result.chat, context.userId, { clanMemberIds: clan.memberIds, clanName: clan.name });
  if (result.updated.ok) {
    const actor = memberName(findMember(result.chat, context.userId));
    if (result.updated.status === 'requested') pushTo(body.userId, `🤝 ${actor} хочет добавить тебя в друзья. Открой «Друзья» → «Заявки».`);
    if (result.updated.status === 'friends') pushTo(body.userId, `🤝 ${actor} теперь твой друг.`);
  }
  const status = result.updated.ok ? 200 : (SOCIAL_REASONS_STATUS[result.updated.reason] || 409);
  return sendJson(res, status, { ...result.updated, social });
});

export const mailState = guarded('mail state', async (req, res) => {
  const context = await authorize(req);
  const result = await mailboxFor(context.chatId, context.userId);
  return sendJson(res, result.ok ? 200 : 409, result.mail || result);
});

export const mailAction = guarded('mail action', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const result = await mailboxFor(context.chatId, context.userId, body);
  context.session = await getSession(context.chatId, context.userId);
  return sendResult(res, result, context);
});

export const mailClaim = guarded('mail claim', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (body.id !== undefined && typeof body.id !== 'string') throw httpError(400, 'id must be a string');
  if (body.id) {
    const result = await mailboxFor(context.chatId, context.userId, {action:'claim',id:body.id});
    context.session = await getSession(context.chatId, context.userId);
    return sendResult(res, result, context);
  }
  const result = await withLock(`${context.chatId}:${context.userId}:mail`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const claimed = body.id ? claimMail(context.session, body.id) : claimAllMail(context.session);
    if (claimed.ok) await saveSession(context.session);
    return { ...claimed, mail: getMailbox(context.session) };
  });
  return sendResult(res, result, context);
});

export const promoRedeem = guarded('promo redeem', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (typeof body.code !== 'string') throw httpError(400, 'code is required');
  const result = await withLock(`${context.chatId}:${context.userId}:mail`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const redeemed = await redeemPromo(context.session, context.userId, body.code);
    if (!redeemed.ok) return { ...redeemed, error: PROMO_ERRORS[redeemed.reason] || PROMO_ERRORS.invalid };
    try {
      await saveSession(context.session);
    } catch (error) {
      await releasePromo(redeemed.code, context.userId).catch(() => {});
      throw error;
    }
    return { ...redeemed, mail: getMailbox(context.session) };
  });
  return sendResult(res, result, context);
});

export const adminState = guarded('admin state', async (req, res) => {
  const context = await authorize(req);
  requireAdmin(context);
  return sendJson(res, 200, { promos: await listPromos(), notices: await listNotices() });
});

export const adminPromo = guarded('admin promo', async (req, res) => {
  const context = await authorize(req);
  requireAdmin(context);
  const body = await readJsonBody(req);
  let result;
  if (body.action === 'delete') {
    result = (await deletePromo(String(body.code || ''))) ? { ok: true } : { ok: false, reason: 'not_found' };
  } else if (body.action === 'expiry') {
    result = await setPromoExpiry(String(body.code || ''), body.expiresAt);
  } else {
    const checked = validatePromo(body);
    result = checked.ok ? await createPromo(checked.promo, context.userId) : { ok: false, reason: 'invalid', error: checked.error };
  }
  return sendJson(res, result.ok ? 200 : 409, { ...result, promos: await listPromos() });
});

export const adminToolsState = guarded('admin tools state', async (req, res) => {
  const context = await authorize(req);
  requireAdmin(context);
  return sendJson(res, 200, await getAdminToolsState(context.chatId));
});

export const adminToolsRun = guarded('admin tools run', async (req, res) => {
  const context = await authorize(req);
  requireAdmin(context);
  const body = await readJsonBody(req);
  if (typeof body.action !== 'string') throw httpError(400, 'action is required');

  const result = await withLock(`${context.chatId}:admin-tools`, async () => {
    if (body.scope === 'player') {
      if (!['string', 'number'].includes(typeof body.userId)) throw httpError(400, 'userId is required');
      return runPlayerTool(context.chatId, String(body.userId), body.action, body.amount, body.confirmUserId);
    }
    if (body.scope === 'chat') return runChatTool(context.chatId, body.action);
    if (body.scope === 'global') return runGlobalTool(body.action, body.text);
    throw httpError(400, 'scope must be player, chat or global');
  });
  console.log(`[admin] ${context.userId} ${body.scope}/${body.action} chat=${context.chatId} target=${body.scope==='player'?String(body.userId):'-'} -> ${result.ok ? 'ok' : result.reason}`);
  return sendJson(res, result.ok ? 200 : 409, { ...result, error: result.ok ? undefined : ADMIN_TOOL_ERRORS[result.reason] || result.reason });
});

export const adminNotice = guarded('admin notice', async (req, res) => {
  const context = await authorize(req);
  requireAdmin(context);
  const body = await readJsonBody(req);
  let result;
  if (body.action === 'delete') {
    result = (await deleteNotice(String(body.id || ''))) ? { ok: true } : { ok: false, reason: 'not_found' };
  } else {
    const checked = validateNotice(body);
    result = checked.ok ? await saveNotice(body.id ? String(body.id) : null, checked.notice, context.userId) : { ok: false, reason: 'invalid', error: checked.error };
  }
  return sendJson(res, result.ok ? 200 : 409, { ...result, notices: await listNotices() });
});

export const bonusState = guarded('bonus state', async (req, res) => {
  const context = await authorize(req);
  return sendJson(res, 200, getBonusState(context.session));
});

export const bonusClaim = guarded('bonus claim', async (req, res) => {
  const context = await authorize(req);
  const result = await withLock(`${context.chatId}:${context.userId}:bonus`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const claimed = claimBonus(context.session);
    if (claimed.ok) await saveSession(context.session);
    return claimed;
  });
  return sendResult(res, result, context);
});

export const horoscopeState = guarded('horoscope state', async (req, res) => {
  const context = await authorize(req);
  return sendJson(res, 200, getHoroscopeState(context.session));
});

export const horoscopeSettings = guarded('horoscope settings', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const result = await withLock(`${context.chatId}:${context.userId}:horoscope`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const updated = updateHoroscopeSettings(context.session, body);
    if (updated.ok) await saveSession(context.session);
    return updated;
  });
  return sendJson(res, result.ok ? 200 : 400, { ...result, state: stateFor(context) });
});

export const horoscopeGenerate = guarded('horoscope generate', async (req, res) => {
  const context = await authorize(req);
  const result = await withLock(`${context.chatId}:${context.userId}:horoscope`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const generated = await generateHoroscopeForMiniApp(context.session);
    await saveSession(context.session);
    return generated;
  });
  return sendJson(res, 200, result);
});

export const horoscopeShare = guarded('horoscope share', async (req, res) => {
  const context = await authorize(req);
  const result = await withLock(context.chatId, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const shared = await shareHoroscopeForMiniApp(context.session, {
      send: text => sendMessage(context.chatId, text),
    });
    if (shared.ok) await saveSession(context.session);
    return shared;
  });
  return sendJson(res, result.ok ? 200 : 400, result);
});

export const clanState = guarded('clan state', async (req, res) => {
  const context = await authorize(req);
  const dashboard = await withLock('clan:global', () => getClanDashboard(context.userId, context.session));
  return sendJson(res, 200, dashboard);
});

export const clanAction = guarded('clan action', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (body.action === 'contribute' && body.resource === 'gold') assertGoldUnlocked(context);
  const allowed = new Set(['create', 'join', 'leave', 'disband', 'contribute']);
  if (!allowed.has(body.action)) {
    throw httpError(400, 'Unknown clan action');
  }

  const payload = await withLock('clan:global', async () => {
    let result;
    if (body.action === 'create') {
      result = await createClanForMiniApp(context.userId, body.name);
    } else if (body.action === 'join') {
      context.session = await getSession(context.chatId, context.userId);
      result = await joinClanForMiniApp(context.userId, body.clanId, context.session);
    } else if (body.action === 'leave') {
      result = await leaveClanForMiniApp(context.userId);
    } else if (body.action === 'disband') {
      result = await disbandClanForMiniApp(context.userId);
    } else {
      context.session = await getSession(context.chatId, context.userId);
      const prepared = await prepareClanContribution(
        context.userId,
        context.session,
        body.resource,
        body.amount
      );
      result = prepared.result;
      if (result.ok) {
        // Keep the legacy safety ordering: debit the player first, then credit
        // the shared clan document. A failed second save cannot duplicate funds.
        await saveSession(context.session);
        await prepared.clan.save();
      }
    }

    const dashboard = await getClanDashboard(context.userId, context.session);
    return { result, dashboard };
  });

  return sendJson(res, payload.result.ok ? 200 : 409, {
    ...payload.result,
    dashboard: payload.dashboard,
    state: stateFor(context),
  });
});

export const clanQuiz = guarded('clan quiz', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const payload = await withLock('clan:global', async () => {
    context.session = await getSession(context.chatId, context.userId);
    const prepared = await prepareClanQuizAnswer(context.userId, context.session, body.answer);
    const result = prepared.result;

    if (result.ok) {
      // Mark the answer in the clan first. A failed personal reward save cannot
      // leave an answer replayable for duplicate rewards.
      await prepared.clan.save();
      if (result.correct) await saveSession(context.session);
    }

    const dashboard = await getClanDashboard(context.userId, context.session);
    return { result, dashboard };
  });

  pushAll(payload.result.notify);
  delete payload.result.notify;
  return sendJson(res, payload.result.ok ? 200 : 409, {
    ...payload.result,
    dashboard: payload.dashboard,
    state: stateFor(context),
  });
});

export const clanActivity = guarded('clan activity', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (body.action === 'upgrade_member' || body.action === 'hall_bid') assertGoldUnlocked(context);
  const competitionActions = new Set(['pvp_fight', 'war_declare', 'war_attack']);
  const managementActions = new Set(['application_accept', 'application_reject', 'invite', 'kick', 'promote', 'demote', 'transfer', 'settings_update']);
  const progressionActions = new Set(['hall_upgrade', 'hall_deposit', 'hall_bid', 'hall_skill_toggle', 'investigation_start', 'investigation_fund', 'investigation_complete', 'investigation_cancel', 'task_claim', 'task_claim_bonus', 'skill_learn']);
  const rtaActions = new Set(['rta_join', 'rta_leave', 'rta_battle']);
  const allowed = new Set(['boss_summon', ...rtaActions, 'boss_attack', 'shop_buy', 'upgrade_member', 'upgrade_building', ...competitionActions, ...managementActions, ...progressionActions]);
  if (!allowed.has(body.action)) {
    throw httpError(400, 'Unknown clan activity');
  }

  const payload = await withLock('clan:global', async () => {
    context.session = await getSession(context.chatId, context.userId);
    let result;

    if (body.action === 'hall_bid') {
      result = await bidForClanHall(context.userId, String(body.hallId||''), body.amount);
    } else if (rtaActions.has(body.action)) {
      const prepared = await performRtaAction(context.userId, context.session, body.action, body);
      result = prepared.result;
      if (result.ok && prepared.clan) await prepared.clan.save();
    } else if (competitionActions.has(body.action)) {
      // Competition actions persist only clan documents. Player combat state is
      // treated as a read-only snapshot, matching the legacy duel/war behavior.
      result = await performClanCompetitionAction(context.userId, context.session, body.action, body);
    } else if (managementActions.has(body.action)) {
      const prepared = await performClanManagementAction(context.userId, context.session, body.action, body);
      result = prepared.result;
      if (result.ok && prepared.clan) await prepared.clan.save();
    } else if (progressionActions.has(body.action)) {
      const prepared = await prepareClanProgressionAction(context.userId, context.session, body.action, body);
      result = prepared.result;
      if (result.ok) {
        if (prepared.savePlayer) await saveSession(context.session);
        if (prepared.clan) await prepared.clan.save();
        if (body.action === 'hall_skill_toggle') {
          syncClanPerks(context.session, prepared.clan);
          await saveSession(context.session);
        }
      }
    } else {
      const prepared = await prepareClanActivity(context.userId, context.session, body.action, body);
      result = prepared.result;
      if (result.ok) {
        if (prepared.savePlayer) await saveSession(context.session);
        if (prepared.clan) await prepared.clan.save();
      }
    }

    const dashboard = await getClanDashboard(context.userId, context.session);
    return { result, dashboard };
  });

  pushAll(payload.result.notify);
  delete payload.result.notify;
  return sendJson(res, payload.result.ok ? 200 : 409, {
    ...payload.result,
    dashboard: payload.dashboard,
    state: stateFor(context),
  });
});

export const loginRewardsState = guarded('login rewards state', async (req,res) => {
  const context=await authorize(req);
  return sendJson(res,200,getLoginRewardsState(context.session));
});

export const loginRewardsAction = guarded('login rewards action', async (req,res) => {
  const context=await authorize(req),body=await readJsonBody(req);
  if(!['claim','fill','redeem'].includes(body.action))throw httpError(400,'Unknown login rewards action');
  if(body.action==='redeem'&&(typeof body.key!=='string'||body.key.length>80||typeof (body.choice??'')!=='string'||(body.choice||'').length>100))throw httpError(400,'Invalid coupon choice');
  const result=await withLock(`${context.chatId}:${context.userId}:inventory`,async()=>{
    context.session=await getSession(context.chatId,context.userId);
    const outcome=body.action==='claim'||body.action==='fill'?claimLoginReward(context.session,Date.now(),body.month!=null?{month:body.month,day:body.day}:null,{ticket:body.action==='fill'}):redeemLoginItem(context.session,body.key,body.choice||'');
    if(outcome.ok||outcome.changed)await saveSession(context.session);
    return {...outcome,loginRewards:getLoginRewardsState(context.session)};
  });
  return sendResult(res,result,context);
});

const PARTY_ACTIONS = new Set(['create', 'invite', 'accept', 'decline', 'leave', 'kick', 'disband', 'loot','transfer']);

export const partyState = guarded('party state', async (req, res) => {
  const context = await authorize(req);
  const state = await withLock(`${context.chatId}:party`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    await attachPartyPeers(context.session);
    const current = getPartyState(context.session);
    if (current.changed) await saveSession(context.session);
    return current;
  });
  return sendJson(res, 200, state);
});

export const partyAction = guarded('party action', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (!PARTY_ACTIONS.has(body.action)) throw httpError(400, 'unknown party action');
  const result = await withLock(`${context.chatId}:party`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    await attachPartyPeers(context.session, [body.userId]);
    const done = performPartyAction(context.session, body.action, body);
    if (done.ok) await saveSession(context.session);
    return { ...done, party: getPartyState(context.session) };
  });
  return sendResult(res, result, context);
});
