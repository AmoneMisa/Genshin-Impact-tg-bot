import { sendJson, httpError, guarded } from '../http/response.js';
import { readJsonBody, withLock } from '../http/request.js';
import { authorize, stateFor, sendResult, assertGoldUnlocked, refreshContextSession } from '../http/auth.js';
import getSession from '../../functions/getters/getSession.js';
import getChatSession from '../../functions/getters/getChatSession.js';
import saveSession from '../../functions/getters/saveSession.js';
import { isChatAdmin } from '../tableGames.js';
import { getArcadeState, startArcadeGame, rollArcadeGame, getArcadeConfig } from '../arcade.js';
import { resetArcadeGame } from '../arcadeReset.js';
import { getStealState, prepareStealMember, stealForMiniApp } from '../steal.js';
import { getPoint21State, syncPoint21, startPoint21, joinPoint21, leavePoint21, setPoint21Bet, takePoint21Card, passPoint21, resetPoint21 } from '../point21.js';
import { getElementsState, syncElements, startElements, joinElements, leaveElements, setElementsBet, drawElement, resetElements } from '../elements.js';
import { performFishingAction } from '../fishing.js';
import ensureClanPerks from '../../functions/game/clans/ensureClanPerks.js';

const ARCADE_GAMES = new Set(Object.keys(getArcadeConfig()));

function validateArcadeGameId(gameId) {
  if (typeof gameId !== 'string' || !ARCADE_GAMES.has(gameId)) {
    throw httpError(400, 'Unknown arcade game');
  }
}

export const stealState = guarded('steal state', async (req, res) => {
  const context = await authorize(req);
  const steal = await withLock(`${context.chatId}:steal`, async () => {
    const chat = await getChatSession(context.chatId);
    refreshContextSession(context, chat);
    const changed = prepareStealMember(context.session);
    if (changed) await chat.save();
    return getStealState(chat, context.userId);
  });
  return sendJson(res, 200, steal);
});

export const stealAttack = guarded('steal attack', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (!['string', 'number'].includes(typeof body.targetId) || String(body.targetId).trim() === '') {
    throw httpError(400, 'targetId is required');
  }

  const payload = await withLock(`${context.chatId}:steal`, async () => {
    const chat = await getChatSession(context.chatId);
    refreshContextSession(context, chat);
    // the raid is fought with the current clan skills of both sides
    for (const id of [context.userId, body.targetId]) {
      const member = (chat.members || []).find(entry => String(entry.userId) === String(id));
      if (member) await ensureClanPerks(member, id);
    }
    const result = stealForMiniApp(chat, context.userId, body.targetId);
    if (result.ok) await chat.save();
    refreshContextSession(context, chat);
    return {
      result,
      steal: getStealState(chat, context.userId),
    };
  });

  return sendJson(res, payload.result.ok ? 200 : 409, {
    ...payload.result,
    steal: payload.steal,
    state: stateFor(context),
  });
});

export const point21State = guarded('point21 state', async (req, res) => {
  const context = await authorize(req);
  const point21 = await withLock(`${context.chatId}:point21`, async () => {
    const chat = await getChatSession(context.chatId);
    // A broken table must still load, so players can see the reset button.
    try {
      const synced = syncPoint21(chat);
      if (synced.changed) await chat.save();
    } catch (error) {
      console.warn('point21 sync failed', error.message);
    }
    refreshContextSession(context, chat);
    return getPoint21State(chat, context.userId, { isAdmin: isChatAdmin(context.session) });
  });
  return sendJson(res, 200, point21);
});

export const point21Action = guarded('point21 action', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (!new Set(['start', 'join', 'leave', 'bet', 'card', 'pass', 'reset']).has(body.action)) {
    throw httpError(400, 'Unknown point21 action');
  }

  const result = await withLock(`${context.chatId}:point21`, async () => {
    const chat = await getChatSession(context.chatId);
    let updated;
    if (body.action === 'start') updated = startPoint21(chat, context.userId);
    else if (body.action === 'join') updated = joinPoint21(chat, context.userId);
    else if (body.action === 'leave') updated = leavePoint21(chat, context.userId);
    else if (body.action === 'bet') updated = setPoint21Bet(chat, context.userId, body.bet);
    else if (body.action === 'card') updated = takePoint21Card(chat, context.userId);
    else if (body.action === 'reset') updated = resetPoint21(chat, context.userId, { isAdmin: isChatAdmin(context.session) });
    else updated = passPoint21(chat, context.userId);

    await chat.save();
    refreshContextSession(context, chat);
    return updated;
  });
  return sendResult(res, result, context);
});

export const elementsState = guarded('elements state', async (req, res) => {
  const context = await authorize(req);
  const elements = await withLock(`${context.chatId}:elements`, async () => {
    const chat = await getChatSession(context.chatId);
    try {
      const synced = syncElements(chat);
      if (synced.changed) await chat.save();
    } catch (error) {
      console.warn('elements sync failed', error.message);
    }
    refreshContextSession(context, chat);
    return getElementsState(chat, context.userId, { isAdmin: isChatAdmin(context.session) });
  });
  return sendJson(res, 200, elements);
});

export const elementsAction = guarded('elements action', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (!new Set(['start', 'join', 'leave', 'bet', 'draw', 'reset']).has(body.action)) {
    throw httpError(400, 'Unknown elements action');
  }

  const result = await withLock(`${context.chatId}:elements`, async () => {
    const chat = await getChatSession(context.chatId);
    let updated;
    if (body.action === 'start') updated = startElements(chat, context.userId);
    else if (body.action === 'join') updated = joinElements(chat, context.userId);
    else if (body.action === 'leave') updated = leaveElements(chat, context.userId);
    else if (body.action === 'bet') updated = setElementsBet(chat, context.userId, body.bet);
    else if (body.action === 'reset') updated = resetElements(chat, context.userId, { isAdmin: isChatAdmin(context.session) });
    else updated = drawElement(chat, context.userId);

    await chat.save();
    refreshContextSession(context, chat);
    return updated;
  });
  return sendResult(res, result, context);
});

export const fishingAction = guarded('fishing', async (req, res) => {
  const context = await authorize(req);
  const body = req.method === 'POST' ? await readJsonBody(req) : {};
  const action = typeof body.action === 'string' ? body.action : 'state';
  const result = await withLock(`${context.chatId}:${context.userId}:inventory`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const done = performFishingAction(context.session, action, body);
    // a settled catch and any action change the inventory: save always, the state read is cheap
    await saveSession(context.session);
    return done;
  });
  return sendResult(res, result, context);
});

export const arcadeReset = guarded('arcade reset', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  validateArcadeGameId(body.gameId);
  const result = await withLock(`${context.chatId}:${context.userId}:arcade`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const reset = resetArcadeGame(context.session, body.gameId);
    if (reset.ok) await saveSession(context.session);
    return reset;
  });
  return sendResult(res, result, context);
});

export const arcadeState = guarded('arcade state', async (req, res) => {
  const context = await authorize(req);
  const arcade = await withLock(`${context.chatId}:${context.userId}:arcade`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return getArcadeState(context.session);
  });
  return sendJson(res, 200, arcade);
});

export const arcadeStart = guarded('arcade start', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (Number(body.bet) > 0) assertGoldUnlocked(context);
  validateArcadeGameId(body.gameId);
  const result = await withLock(`${context.chatId}:${context.userId}:arcade`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const started = startArcadeGame(context.session, body.gameId, body.bet);
    if (started.ok) await saveSession(context.session);
    return started;
  });
  return sendResult(res, result, context);
});

export const arcadeRoll = guarded('arcade roll', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  validateArcadeGameId(body.gameId);
  const result = await withLock(`${context.chatId}:${context.userId}:arcade`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const rolled = rollArcadeGame(context.session, body.gameId);
    if (rolled.ok) await saveSession(context.session);
    return rolled;
  });
  return sendResult(res, result, context);
});
