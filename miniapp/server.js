import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { token } from '../config.js';
import { trustedChats } from '../data.js';
import getSession from '../functions/getters/getSession.js';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEBAPP_DIR = path.resolve(__dirname, '../webapp');
const GAME_ASSETS_DIR = path.resolve(__dirname, '../images');
const playerLocks = new Map();
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

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

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

    req.on('data', (chunk) => {
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

async function withPlayerLock(key, action) {
  const previous = playerLocks.get(key) || Promise.resolve();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const tail = previous.catch(() => {}).then(() => gate);
  playerLocks.set(key, tail);

  await previous.catch(() => {});
  try {
    return await action();
  } finally {
    release();
    if (playerLocks.get(key) === tail) playerLocks.delete(key);
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

  return {
    validated,
    chatId,
    userId: validated.user.id,
    session,
  };
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

async function bootstrap(req, res) {
  try {
    const context = await authorize(req);
    return sendJson(res, 200, stateFor(context));
  } catch (error) {
    return sendApiError(res, 'bootstrap', error);
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
    const lockKey = `${context.chatId}:${context.userId}:chest`;

    const result = await withPlayerLock(lockKey, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const opened = openChest(context.session, context.chatId, body.chestId);
      if (opened.ok) await saveSession(context.session);
      return opened;
    });

    return sendJson(res, result.ok ? 200 : 409, {
      ...result,
      state: stateFor(context),
    });
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

    const lockKey = `${context.chatId}:${context.userId}:gacha`;
    const result = await withPlayerLock(lockKey, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const rolled = rollGacha(context.session, body.gachaType);
      if (rolled.ok) await saveSession(context.session);
      return rolled;
    });

    return sendJson(res, result.ok ? 200 : 409, {
      ...result,
      state: stateFor(context),
    });
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

    const lockKey = `${context.chatId}:${context.userId}:gacha`;
    const result = await withPlayerLock(lockKey, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const resolved = resolveGacha(context.session, body.action);
      if (resolved.ok) await saveSession(context.session);
      return resolved;
    });

    return sendJson(res, result.ok ? 200 : 409, {
      ...result,
      state: stateFor(context),
    });
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

    const lockKey = `${context.chatId}:${context.userId}:equipment`;
    const result = await withPlayerLock(lockKey, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const updated = performEquipmentAction(context.session, body.key, body.action);
      if (updated.ok) await saveSession(context.session);
      return updated;
    });

    return sendJson(res, result.ok ? 200 : 409, {
      ...result,
      state: stateFor(context),
    });
  } catch (error) {
    return sendApiError(res, 'equipment action', error);
  }
}

async function buildsState(req, res) {
  try {
    const context = await authorize(req);
    const lockKey = `${context.chatId}:${context.userId}:builds`;

    const builds = await withPlayerLock(lockKey, async () => {
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

    const actions = new Set(['upgrade', 'speedup', 'collect', 'change_type', 'rename']);
    if (!actions.has(body.action)) {
      const error = new Error('Unknown building action');
      error.status = 400;
      throw error;
    }

    const lockKey = `${context.chatId}:${context.userId}:builds`;
    const result = await withPlayerLock(lockKey, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const prepared = prepareBuilds(context.session);
      let updated;

      if (body.action === 'upgrade') {
        updated = startBuildUpgrade(context.session, body.buildName);
      } else if (body.action === 'speedup') {
        updated = speedupBuildUpgrade(context.session, body.buildName);
      } else if (body.action === 'collect') {
        updated = collectBuildResources(context.session, body.buildName);
      } else if (body.action === 'change_type') {
        updated = changeBuildType(context.session, body.buildName, body.typeName);
      } else {
        updated = renameBuild(context.session, body.buildName, body.name);
      }

      if (prepared || updated.ok) await saveSession(context.session);
      return updated;
    });

    return sendJson(res, result.ok ? 200 : 409, {
      ...result,
      state: stateFor(context),
    });
  } catch (error) {
    return sendApiError(res, 'builds action', error);
  }
}

async function arenaState(req, res, requestUrl) {
  try {
    const context = await authorize(req);
    const mode = requestUrl.searchParams.get('mode') || 'common';
    const lockKey = `${context.chatId}:${context.userId}:arena`;

    const arena = await withPlayerLock(lockKey, async () => {
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

    const lockKey = `${context.chatId}:${context.userId}:arena`;
    const result = await withPlayerLock(lockKey, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const battle = await attackArena(
        context.session,
        context.chatId,
        context.userId,
        body.mode,
        body.defenderId
      );
      if (battle.ok) await saveSession(context.session);
      return battle;
    });

    return sendJson(res, result.ok ? 200 : 409, {
      ...result,
      state: stateFor(context),
    });
  } catch (error) {
    return sendApiError(res, 'arena attack', error);
  }
}

async function bossState(req, res) {
  try {
    const context = await authorize(req);
    const lockKey = `${context.chatId}:boss`;
    const boss = await withPlayerLock(lockKey, async () => {
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
    const lockKey = `${context.chatId}:boss`;
    const result = await withPlayerLock(lockKey, async () => {
      context.session = await getSession(context.chatId, context.userId);
      return summonBossForMiniApp(context.session, context.chatId);
    });

    context.session = await getSession(context.chatId, context.userId);
    return sendJson(res, result.ok ? 200 : 409, {
      ...result,
      state: stateFor(context),
    });
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

    const lockKey = `${context.chatId}:boss`;
    const result = await withPlayerLock(lockKey, async () => {
      context.session = await getSession(context.chatId, context.userId);
      return useBossSkill(
        context.session,
        context.chatId,
        context.userId,
        skillIndex
      );
    });

    context.session = await getSession(context.chatId, context.userId);
    return sendJson(res, result.ok ? 200 : 409, {
      ...result,
      state: stateFor(context),
    });
  } catch (error) {
    return sendApiError(res, 'boss skill', error);
  }
}

async function shopState(req, res) {
  try {
    const context = await authorize(req);
    const lockKey = `${context.chatId}:${context.userId}:shop`;
    const shop = await withPlayerLock(lockKey, async () => {
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

    const lockKey = `${context.chatId}:${context.userId}:shop`;
    const result = await withPlayerLock(lockKey, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const purchase = await buyShopItem(context.session, body.command);
      if (purchase.ok) await saveSession(context.session);
      return purchase;
    });

    return sendJson(res, result.ok ? 200 : 409, {
      ...result,
      state: stateFor(context),
    });
  } catch (error) {
    return sendApiError(res, 'shop buy', error);
  }
}

export default function startMiniAppServer() {
  if (process.env.MINI_APP_ENABLED === 'false') return null;

  const port = Number(process.env.MINI_APP_PORT || process.env.PORT || 8080);
  const host = process.env.MINI_APP_HOST || '0.0.0.0';

  const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && requestUrl.pathname === '/healthz') {
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/bootstrap') {
      return bootstrap(req, res);
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/chest') {
      return chestState(req, res);
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/chest/open') {
      return chestOpen(req, res);
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/gacha') {
      return gachaState(req, res);
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/gacha/roll') {
      return gachaRoll(req, res);
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/gacha/resolve') {
      return gachaResolve(req, res);
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/equipment') {
      return equipmentState(req, res);
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/equipment/action') {
      return equipmentAction(req, res);
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/builds') {
      return buildsState(req, res);
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/builds/action') {
      return buildsAction(req, res);
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/arena') {
      return arenaState(req, res, requestUrl);
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/arena/attack') {
      return arenaAttack(req, res);
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/boss') {
      return bossState(req, res);
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/boss/summon') {
      return bossSummon(req, res);
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/boss/skill') {
      return bossSkill(req, res);
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/shop') {
      return shopState(req, res);
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/shop/buy') {
      return shopBuy(req, res);
    }

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
