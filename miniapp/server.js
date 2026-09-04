import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { token } from '../config.js';
import { trustedChats } from '../data.js';
import getSession from '../functions/getters/getSession.js';
import getChatSession from '../functions/getters/getChatSession.js';
import saveSession from '../functions/getters/saveSession.js';
import { validateTelegramInitData, resolveGameChatId } from './telegramAuth.js';
import { createMiniAppState } from './state.js';
import { getChestState, openChest } from './chest.js';
import { getGachaState, rollGacha, resolveGacha } from './gacha.js';
import { getEquipmentState, performEquipmentAction } from './equipment.js';
import {
  prepareBuilds,
  getBuildsState,
  startBuildUpgrade,
  speedupBuildUpgrade,
  collectBuildResources,
  changeBuildType,
  renameBuild,
} from './builds.js';
import { getArenaState, attackArena } from './arena.js';
import { getBossState, summonBossForMiniApp, useBossSkill } from './boss.js';
import { getShopState, buyShopItem } from './shop.js';
import { getMiniAppSwordState, rollMiniAppSword } from './sword.js';
import { getArcadeState, startArcadeGame, rollArcadeGame, getArcadeConfig } from './arcade.js';
import { getGoldTransferState, transferGoldForMiniApp } from './goldTransfer.js';
import { getStealState, prepareStealMember, stealForMiniApp } from './steal.js';
import {
  getPoint21State,
  syncPoint21,
  startPoint21,
  joinPoint21,
  leavePoint21,
  setPoint21Bet,
  takePoint21Card,
  passPoint21,
} from './point21.js';
import {
  getElementsState,
  syncElements,
  startElements,
  joinElements,
  leaveElements,
  setElementsBet,
  drawElement,
} from './elements.js';
import { getBonusState, claimBonus } from './bonus.js';
import { getTitlesState, assignTitle } from './titles.js';
import {
  getHoroscopeState,
  updateHoroscopeSettings,
  generateHoroscopeForMiniApp,
} from './horoscope.js';
import {
  getClanDashboard,
  createClanForMiniApp,
  joinClanForMiniApp,
  leaveClanForMiniApp,
  disbandClanForMiniApp,
  prepareClanContribution,
  prepareClanQuizAnswer,
} from './clan.js';
import { prepareClanActivity } from './clanActivities.js';
import { performClanCompetitionAction } from './clanCompetition.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEBAPP_DIR = path.resolve(__dirname, '../webapp');
const GAME_ASSETS_DIR = path.resolve(__dirname, '../images');
const locks = new Map();
const ARCADE_GAMES = new Set(Object.keys(getArcadeConfig()));
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function safeStaticPath(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const relative = decoded.replace(/^\/+/, '');
  const resolved = path.resolve(root, relative || 'index.html');
  if (!resolved.startsWith(root + path.sep) && resolved !== root) return null;
  return resolved;
}

function serveFile(res, root, urlPath) {
  let filePath = safeStaticPath(root, urlPath);
  if (!filePath) return false;
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    'cache-control': ext === '.html' ? 'no-store' : 'public, max-age=3600',
  });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function getInitData(req) {
  const header = req.headers['x-telegram-init-data'];
  if (typeof header === 'string' && header) return header;
  const auth = req.headers.authorization || '';
  return auth.startsWith('tma ') ? auth.slice(4) : '';
}

async function readJsonBody(req, maxBytes = 8192) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        const error = new Error('Request body is too large');
        error.status = 413;
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        const error = new Error('Invalid JSON body');
        error.status = 400;
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

async function withLock(key, action) {
  const previous = locks.get(key) || Promise.resolve();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const tail = previous.catch(() => {}).then(() => gate);
  locks.set(key, tail);

  await previous.catch(() => {});
  try {
    return await action();
  } finally {
    release();
    if (locks.get(key) === tail) locks.delete(key);
  }
}

async function authorize(req) {
  const validated = validateTelegramInitData(getInitData(req), token);
  if (!validated.user?.id) throw new Error('Telegram user is missing');

  const chatId = resolveGameChatId(validated);
  if (!trustedChats.includes(String(chatId))) {
    const error = new Error('This chat is not trusted');
    error.status = 403;
    throw error;
  }

  const session = await getSession(chatId, validated.user.id);
  const isGroupContext = String(chatId) !== String(validated.user.id);
  const membershipStatus = session.userChatData?.status || session.$locals?.telegramMembership?.status;
  if (isGroupContext && ['left', 'kicked'].includes(membershipStatus)) {
    const error = new Error('User is not a member of this game chat');
    error.status = 403;
    throw error;
  }

  return { validated, chatId, userId: validated.user.id, session };
}

function stateFor(context) {
  return createMiniAppState(context.session, {
    chatId: context.chatId,
    chatType: context.validated.chatType,
    user: context.validated.user,
  });
}

function sendApiError(res, scope, error) {
  console.error(`[miniapp] ${scope}:`, error);
  return sendJson(res, error.status || 401, { error: error.message || 'Unauthorized' });
}

function refreshContextSession(context, chat) {
  const member = chat?.members?.find(item => String(item.userId) === String(context.userId));
  if (member) context.session = member;
}

function validateArcadeGameId(gameId) {
  if (typeof gameId !== 'string' || !ARCADE_GAMES.has(gameId)) {
    const error = new Error('Unknown arcade game');
    error.status = 400;
    throw error;
  }
}

async function bootstrap(req, res) {
  try {
    const context = await authorize(req);
    return sendJson(res, 200, stateFor(context));
  } catch (error) {
    return sendApiError(res, 'bootstrap', error);
  }
}

async function goldTransferState(req, res) {
  try {
    const context = await authorize(req);
    const transfer = await withLock(`${context.chatId}:gold-transfer`, async () => {
      const chat = await getChatSession(context.chatId);
      refreshContextSession(context, chat);
      return getGoldTransferState(chat, context.userId);
    });
    return sendJson(res, 200, transfer);
  } catch (error) {
    return sendApiError(res, 'gold transfer state', error);
  }
}

async function goldTransferSend(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    if (!['string', 'number'].includes(typeof body.recipientId) || String(body.recipientId).trim() === '') {
      const error = new Error('recipientId is required');
      error.status = 400;
      throw error;
    }

    const result = await withLock(`${context.chatId}:gold-transfer`, async () => {
      const chat = await getChatSession(context.chatId);
      const moved = transferGoldForMiniApp(chat, context.userId, body.recipientId, body.amount);
      if (moved.ok) await chat.save();
      refreshContextSession(context, chat);
      return moved;
    });
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'gold transfer send', error);
  }
}

async function stealState(req, res) {
  try {
    const context = await authorize(req);
    const steal = await withLock(`${context.chatId}:steal`, async () => {
      const chat = await getChatSession(context.chatId);
      refreshContextSession(context, chat);
      const changed = prepareStealMember(context.session);
      if (changed) await chat.save();
      return getStealState(chat, context.userId);
    });
    return sendJson(res, 200, steal);
  } catch (error) {
    return sendApiError(res, 'steal state', error);
  }
}

async function stealAttack(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    if (!['string', 'number'].includes(typeof body.targetId) || String(body.targetId).trim() === '') {
      const error = new Error('targetId is required');
      error.status = 400;
      throw error;
    }

    const payload = await withLock(`${context.chatId}:steal`, async () => {
      const chat = await getChatSession(context.chatId);
      refreshContextSession(context, chat);
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
  } catch (error) {
    return sendApiError(res, 'steal attack', error);
  }
}

async function point21State(req, res) {
  try {
    const context = await authorize(req);
    const point21 = await withLock(`${context.chatId}:point21`, async () => {
      const chat = await getChatSession(context.chatId);
      const synced = syncPoint21(chat);
      if (synced.changed) await chat.save();
      refreshContextSession(context, chat);
      return getPoint21State(chat, context.userId);
    });
    return sendJson(res, 200, point21);
  } catch (error) {
    return sendApiError(res, 'point21 state', error);
  }
}

async function point21Action(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    if (!new Set(['start', 'join', 'leave', 'bet', 'card', 'pass']).has(body.action)) {
      const error = new Error('Unknown point21 action');
      error.status = 400;
      throw error;
    }

    const result = await withLock(`${context.chatId}:point21`, async () => {
      const chat = await getChatSession(context.chatId);
      let updated;
      if (body.action === 'start') updated = startPoint21(chat, context.userId);
      else if (body.action === 'join') updated = joinPoint21(chat, context.userId);
      else if (body.action === 'leave') updated = leavePoint21(chat, context.userId);
      else if (body.action === 'bet') updated = setPoint21Bet(chat, context.userId, body.bet);
      else if (body.action === 'card') updated = takePoint21Card(chat, context.userId);
      else updated = passPoint21(chat, context.userId);

      await chat.save();
      refreshContextSession(context, chat);
      return updated;
    });
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'point21 action', error);
  }
}

async function elementsState(req, res) {
  try {
    const context = await authorize(req);
    const elements = await withLock(`${context.chatId}:elements`, async () => {
      const chat = await getChatSession(context.chatId);
      const synced = syncElements(chat);
      if (synced.changed) await chat.save();
      refreshContextSession(context, chat);
      return getElementsState(chat, context.userId);
    });
    return sendJson(res, 200, elements);
  } catch (error) {
    return sendApiError(res, 'elements state', error);
  }
}

async function elementsAction(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    if (!new Set(['start', 'join', 'leave', 'bet', 'draw']).has(body.action)) {
      const error = new Error('Unknown elements action');
      error.status = 400;
      throw error;
    }

    const result = await withLock(`${context.chatId}:elements`, async () => {
      const chat = await getChatSession(context.chatId);
      let updated;
      if (body.action === 'start') updated = startElements(chat, context.userId);
      else if (body.action === 'join') updated = joinElements(chat, context.userId);
      else if (body.action === 'leave') updated = leaveElements(chat, context.userId);
      else if (body.action === 'bet') updated = setElementsBet(chat, context.userId, body.bet);
      else updated = drawElement(chat, context.userId);

      await chat.save();
      refreshContextSession(context, chat);
      return updated;
    });
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'elements action', error);
  }
}

async function bonusState(req, res) {
  try {
    const context = await authorize(req);
    return sendJson(res, 200, getBonusState(context.session));
  } catch (error) {
    return sendApiError(res, 'bonus state', error);
  }
}

async function bonusClaim(req, res) {
  try {
    const context = await authorize(req);
    const result = await withLock(`${context.chatId}:${context.userId}:bonus`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const claimed = claimBonus(context.session);
      if (claimed.ok) await saveSession(context.session);
      return claimed;
    });
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'bonus claim', error);
  }
}

async function titlesState(req, res) {
  try {
    const context = await authorize(req);
    const titles = await withLock(`${context.chatId}:titles`, async () => {
      const chat = await getChatSession(context.chatId);
      refreshContextSession(context, chat);
      return getTitlesState(context.chatId, context.userId, chat);
    });
    return sendJson(res, 200, titles);
  } catch (error) {
    return sendApiError(res, 'titles state', error);
  }
}

async function titlesAssign(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    const payload = await withLock(`${context.chatId}:titles`, async () => {
      const chat = await getChatSession(context.chatId);
      refreshContextSession(context, chat);
      const result = await assignTitle(chat, context.userId, body.title);
      const titles = await getTitlesState(context.chatId, context.userId, chat);
      refreshContextSession(context, chat);
      return { result, titles };
    });

    return sendJson(res, payload.result.ok ? 200 : 409, {
      ...payload.result,
      titles: payload.titles,
      state: stateFor(context),
    });
  } catch (error) {
    return sendApiError(res, 'titles assign', error);
  }
}

async function horoscopeState(req, res) {
  try {
    const context = await authorize(req);
    return sendJson(res, 200, getHoroscopeState(context.session));
  } catch (error) {
    return sendApiError(res, 'horoscope state', error);
  }
}

async function horoscopeSettings(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    const result = await withLock(`${context.chatId}:${context.userId}:horoscope`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const updated = updateHoroscopeSettings(context.session, body);
      if (updated.ok) await saveSession(context.session);
      return updated;
    });
    return sendJson(res, result.ok ? 200 : 400, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'horoscope settings', error);
  }
}

async function horoscopeGenerate(req, res) {
  try {
    const context = await authorize(req);
    const result = await withLock(`${context.chatId}:${context.userId}:horoscope`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      return generateHoroscopeForMiniApp(context.session);
    });
    return sendJson(res, 200, result);
  } catch (error) {
    return sendApiError(res, 'horoscope generate', error);
  }
}

async function clanState(req, res) {
  try {
    const context = await authorize(req);
    const dashboard = await withLock('clan:global', () => getClanDashboard(context.userId, context.session));
    return sendJson(res, 200, dashboard);
  } catch (error) {
    return sendApiError(res, 'clan state', error);
  }
}

async function clanAction(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    const allowed = new Set(['create', 'join', 'leave', 'disband', 'contribute']);
    if (!allowed.has(body.action)) {
      const error = new Error('Unknown clan action');
      error.status = 400;
      throw error;
    }

    const payload = await withLock('clan:global', async () => {
      let result;
      if (body.action === 'create') {
        result = await createClanForMiniApp(context.userId, body.name);
      } else if (body.action === 'join') {
        result = await joinClanForMiniApp(context.userId, body.clanId);
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
  } catch (error) {
    return sendApiError(res, 'clan action', error);
  }
}

async function clanQuiz(req, res) {
  try {
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

    return sendJson(res, payload.result.ok ? 200 : 409, {
      ...payload.result,
      dashboard: payload.dashboard,
      state: stateFor(context),
    });
  } catch (error) {
    return sendApiError(res, 'clan quiz', error);
  }
}

async function clanActivity(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    const competitionActions = new Set(['pvp_fight', 'war_declare', 'war_attack']);
    const allowed = new Set(['boss_summon', 'boss_attack', 'shop_buy', 'upgrade_member', 'upgrade_building', ...competitionActions]);
    if (!allowed.has(body.action)) {
      const error = new Error('Unknown clan activity');
      error.status = 400;
      throw error;
    }

    const payload = await withLock('clan:global', async () => {
      context.session = await getSession(context.chatId, context.userId);
      let result;

      if (competitionActions.has(body.action)) {
        // Competition actions persist only clan documents. Player combat state is
        // treated as a read-only snapshot, matching the legacy duel/war behavior.
        result = await performClanCompetitionAction(context.userId, context.session, body.action, body);
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

    return sendJson(res, payload.result.ok ? 200 : 409, {
      ...payload.result,
      dashboard: payload.dashboard,
      state: stateFor(context),
    });
  } catch (error) {
    return sendApiError(res, 'clan activity', error);
  }
}

async function chestState(req, res) {
  try {
    const context = await authorize(req);
    return sendJson(res, 200, getChestState(context.session));
  } catch (error) {
    return sendApiError(res, 'chest state', error);
  }
}

async function chestOpen(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    const result = await withLock(`${context.chatId}:${context.userId}:chest`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const opened = openChest(context.session, context.chatId, body.chestId);
      if (opened.ok) await saveSession(context.session);
      return opened;
    });
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    if (!error.status && /Chest id/.test(error.message || '')) error.status = 400;
    return sendApiError(res, 'open chest', error);
  }
}

async function gachaState(req, res) {
  try {
    const context = await authorize(req);
    return sendJson(res, 200, getGachaState(context.session));
  } catch (error) {
    return sendApiError(res, 'gacha state', error);
  }
}

async function gachaRoll(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    if (typeof body.gachaType !== 'string' || !body.gachaType) {
      const error = new Error('gachaType is required');
      error.status = 400;
      throw error;
    }
    const result = await withLock(`${context.chatId}:${context.userId}:gacha`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const rolled = rollGacha(context.session, body.gachaType);
      if (rolled.ok) await saveSession(context.session);
      return rolled;
    });
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'gacha roll', error);
  }
}

async function gachaResolve(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    if (!['save', 'break'].includes(body.action)) {
      const error = new Error('action must be save or break');
      error.status = 400;
      throw error;
    }
    const result = await withLock(`${context.chatId}:${context.userId}:gacha`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const resolved = resolveGacha(context.session, body.action);
      if (resolved.ok) await saveSession(context.session);
      return resolved;
    });
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'gacha resolve', error);
  }
}

async function equipmentState(req, res) {
  try {
    const context = await authorize(req);
    return sendJson(res, 200, getEquipmentState(context.session));
  } catch (error) {
    return sendApiError(res, 'equipment state', error);
  }
}

async function equipmentAction(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    if (typeof body.key !== 'string' || !body.key) {
      const error = new Error('equipment key is required');
      error.status = 400;
      throw error;
    }
    if (!['equip', 'unequip', 'sell'].includes(body.action)) {
      const error = new Error('action must be equip, unequip or sell');
      error.status = 400;
      throw error;
    }
    const result = await withLock(`${context.chatId}:${context.userId}:equipment`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const updated = performEquipmentAction(context.session, body.key, body.action);
      if (updated.ok) await saveSession(context.session);
      return updated;
    });
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'equipment action', error);
  }
}

async function buildsState(req, res) {
  try {
    const context = await authorize(req);
    const builds = await withLock(`${context.chatId}:${context.userId}:builds`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const changed = prepareBuilds(context.session);
      if (changed) await saveSession(context.session);
      return getBuildsState(context.session);
    });
    return sendJson(res, 200, builds);
  } catch (error) {
    return sendApiError(res, 'builds state', error);
  }
}

async function buildsAction(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    if (typeof body.buildName !== 'string' || !body.buildName) {
      const error = new Error('buildName is required');
      error.status = 400;
      throw error;
    }
    if (!new Set(['upgrade', 'speedup', 'collect', 'change_type', 'rename']).has(body.action)) {
      const error = new Error('Unknown building action');
      error.status = 400;
      throw error;
    }

    const result = await withLock(`${context.chatId}:${context.userId}:builds`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const prepared = prepareBuilds(context.session);
      let updated;
      if (body.action === 'upgrade') updated = startBuildUpgrade(context.session, body.buildName);
      else if (body.action === 'speedup') updated = speedupBuildUpgrade(context.session, body.buildName);
      else if (body.action === 'collect') updated = collectBuildResources(context.session, body.buildName);
      else if (body.action === 'change_type') updated = changeBuildType(context.session, body.buildName, body.typeName);
      else updated = renameBuild(context.session, body.buildName, body.name);
      if (prepared || updated.ok) await saveSession(context.session);
      return updated;
    });
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'builds action', error);
  }
}

async function arenaState(req, res, requestUrl) {
  try {
    const context = await authorize(req);
    const mode = requestUrl.searchParams.get('mode') || 'common';
    const arena = await withLock(`${context.chatId}:${context.userId}:arena`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      return getArenaState(context.session, context.chatId, context.userId, mode);
    });
    return sendJson(res, 200, arena);
  } catch (error) {
    return sendApiError(res, 'arena state', error);
  }
}

async function arenaAttack(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    if (!['common', 'expansion'].includes(body.mode)) {
      const error = new Error('mode must be common or expansion');
      error.status = 400;
      throw error;
    }
    if (typeof body.defenderId !== 'string' || !body.defenderId) {
      const error = new Error('defenderId is required');
      error.status = 400;
      throw error;
    }
    const result = await withLock(`${context.chatId}:${context.userId}:arena`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const battle = await attackArena(context.session, context.chatId, context.userId, body.mode, body.defenderId);
      if (battle.ok) await saveSession(context.session);
      return battle;
    });
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'arena attack', error);
  }
}

async function bossState(req, res) {
  try {
    const context = await authorize(req);
    const boss = await withLock(`${context.chatId}:boss`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      return getBossState(context.session, context.chatId);
    });
    return sendJson(res, 200, boss);
  } catch (error) {
    return sendApiError(res, 'boss state', error);
  }
}

async function bossSummon(req, res) {
  try {
    const context = await authorize(req);
    const result = await withLock(`${context.chatId}:boss`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      return summonBossForMiniApp(context.session, context.chatId);
    });
    context.session = await getSession(context.chatId, context.userId);
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'boss summon', error);
  }
}

async function bossSkill(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    const skillIndex = Number(body.skillIndex);
    if (!Number.isInteger(skillIndex) || skillIndex < 0) {
      const error = new Error('skillIndex must be a non-negative integer');
      error.status = 400;
      throw error;
    }
    const result = await withLock(`${context.chatId}:boss`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      return useBossSkill(context.session, context.chatId, context.userId, skillIndex);
    });
    context.session = await getSession(context.chatId, context.userId);
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'boss skill', error);
  }
}

async function shopState(req, res) {
  try {
    const context = await authorize(req);
    const shop = await withLock(`${context.chatId}:${context.userId}:shop`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      return getShopState(context.session);
    });
    return sendJson(res, 200, shop);
  } catch (error) {
    return sendApiError(res, 'shop state', error);
  }
}

async function shopBuy(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    if (typeof body.command !== 'string' || !body.command) {
      const error = new Error('command is required');
      error.status = 400;
      throw error;
    }
    const result = await withLock(`${context.chatId}:${context.userId}:shop`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const purchase = await buyShopItem(context.session, body.command);
      if (purchase.ok) await saveSession(context.session);
      return purchase;
    });
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'shop buy', error);
  }
}

async function swordState(req, res) {
  try {
    const context = await authorize(req);
    const sword = await withLock(`${context.chatId}:${context.userId}:sword`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      return getMiniAppSwordState(context.session);
    });
    return sendJson(res, 200, sword);
  } catch (error) {
    return sendApiError(res, 'sword state', error);
  }
}

async function swordRoll(req, res) {
  try {
    const context = await authorize(req);
    const result = await withLock(`${context.chatId}:${context.userId}:sword`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const rolled = rollMiniAppSword(context.session);
      if (rolled.ok) await saveSession(context.session);
      return rolled;
    });
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'sword roll', error);
  }
}

async function arcadeState(req, res) {
  try {
    const context = await authorize(req);
    const arcade = await withLock(`${context.chatId}:${context.userId}:arcade`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      return getArcadeState(context.session);
    });
    return sendJson(res, 200, arcade);
  } catch (error) {
    return sendApiError(res, 'arcade state', error);
  }
}

async function arcadeStart(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    validateArcadeGameId(body.gameId);
    const result = await withLock(`${context.chatId}:${context.userId}:arcade`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const started = startArcadeGame(context.session, body.gameId, body.bet);
      if (started.ok) await saveSession(context.session);
      return started;
    });
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'arcade start', error);
  }
}

async function arcadeRoll(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    validateArcadeGameId(body.gameId);
    const result = await withLock(`${context.chatId}:${context.userId}:arcade`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const rolled = rollArcadeGame(context.session, body.gameId);
      if (rolled.ok) await saveSession(context.session);
      return rolled;
    });
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'arcade roll', error);
  }
}

export default function startMiniAppServer() {
  if (process.env.MINI_APP_ENABLED === 'false') return null;

  const port = Number(process.env.MINI_APP_PORT || process.env.PORT || 8080);
  const host = process.env.MINI_APP_HOST || '0.0.0.0';

  const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const route = `${req.method} ${requestUrl.pathname}`;

    if (route === 'GET /healthz') return sendJson(res, 200, { ok: true });
    if (route === 'GET /api/bootstrap') return bootstrap(req, res);
    if (route === 'GET /api/gold-transfer') return goldTransferState(req, res);
    if (route === 'POST /api/gold-transfer/send') return goldTransferSend(req, res);
    if (route === 'GET /api/steal') return stealState(req, res);
    if (route === 'POST /api/steal/attack') return stealAttack(req, res);
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
    if (route === 'GET /api/builds') return buildsState(req, res);
    if (route === 'POST /api/builds/action') return buildsAction(req, res);
    if (route === 'GET /api/arena') return arenaState(req, res, requestUrl);
    if (route === 'POST /api/arena/attack') return arenaAttack(req, res);
    if (route === 'GET /api/boss') return bossState(req, res);
    if (route === 'POST /api/boss/summon') return bossSummon(req, res);
    if (route === 'POST /api/boss/skill') return bossSkill(req, res);
    if (route === 'GET /api/shop') return shopState(req, res);
    if (route === 'POST /api/shop/buy') return shopBuy(req, res);
    if (route === 'GET /api/sword') return swordState(req, res);
    if (route === 'POST /api/sword/roll') return swordRoll(req, res);
    if (route === 'GET /api/arcade') return arcadeState(req, res);
    if (route === 'POST /api/arcade/start') return arcadeStart(req, res);
    if (route === 'POST /api/arcade/roll') return arcadeRoll(req, res);

    if (req.method === 'GET' && requestUrl.pathname.startsWith('/game-assets/')) {
      const assetPath = requestUrl.pathname.slice('/game-assets/'.length);
      if (serveFile(res, GAME_ASSETS_DIR, assetPath)) return;
      return sendJson(res, 404, { error: 'Asset not found' });
    }

    if (req.method === 'GET' && serveFile(res, WEBAPP_DIR, requestUrl.pathname)) return;
    if (req.method === 'GET' && serveFile(res, WEBAPP_DIR, '/index.html')) return;
    return sendJson(res, 404, { error: 'Not found' });
  });

  server.listen(port, host, () => {
    console.log(`[miniapp] WebGL Mini App listening on http://${host}:${port}`);
  });

  return server;
}
