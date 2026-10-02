import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { withLock as sharedLock } from '../functions/general/chatLock.js';
import { fileURLToPath } from 'url';
import { token, myId } from '../config.js';
import { trustedChats } from '../data.js';
import getSession from '../functions/getters/getSession.js';
import getChatSession from '../functions/getters/getChatSession.js';
import saveSession from '../functions/getters/saveSession.js';
import getClan from '../functions/game/clans/getClan.js';
import { getPlayerCard, getSocialState, setFriend, stampLastSeen } from './social.js';
import { isChatAdmin } from './tableGames.js';
import sendMessage from '../functions/tgBotFunctions/sendMessage.js';
import { validateTelegramInitData, resolveGameChatId } from './telegramAuth.js';
import { createMiniAppState } from './state.js';
import { getChestState, openChest } from './chest.js';
import { getGachaState, rollGacha, resolveGacha } from './gacha.js';
import { getEquipmentState, performEquipmentAction, craftEquipmentItem } from './equipment.js';
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
import { getMiniAppSwordDashboard, rollMiniAppSword } from './sword.js';
import { getArcadeState, startArcadeGame, rollArcadeGame, getArcadeConfig } from './arcade.js';
import { resetArcadeGame } from './arcadeReset.js';
import { getGoldTransferState, transferGoldForMiniApp } from './goldTransfer.js';
import { getStealState, prepareStealMember, stealForMiniApp } from './steal.js';
import { getPlayerProfileState, changePlayerClassForMiniApp, changePlayerGenderForMiniApp } from './playerProfile.js';
import { getSkillsState, enchantSkillForMiniApp } from './skills.js';
import { getInventoryState, useInventoryPotion } from './inventory.js';
import { getExchangeState, buyCrystalsForMiniApp } from './exchange.js';
import { getFormsState, savePersonalForm } from './forms.js';
import { getUpdatesState, setUpdatesEnabled } from './updates.js';
import { normalizeFeedbackMessage, formatFeedbackForDeveloper } from './feedback.js';
import {
  getPoint21State,
  syncPoint21,
  startPoint21,
  joinPoint21,
  leavePoint21,
  setPoint21Bet,
  takePoint21Card,
  passPoint21, resetPoint21 } from './point21.js';
import {
  getElementsState,
  syncElements,
  startElements,
  joinElements,
  leaveElements,
  setElementsBet,
  drawElement, resetElements } from './elements.js';
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
import { GOLD_LOCK_REASON, goldLockForMember } from '../functions/game/general/goldLock.js';
import { performClanCompetitionAction } from './clanCompetition.js';
import { performClanManagementAction } from './clanManagement.js';
import { prepareClanProgressionAction } from './clanProgression.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEBAPP_DIR = path.resolve(__dirname, '../webapp');
const GAME_ASSETS_DIR = path.resolve(__dirname, '../images');
// three.js is served from node_modules (pinned in package.json) instead of a CDN:
// Telegram clients in some regions can't reliably reach public CDNs. Only the
// browser runtime folders are exposed.
const THREE_DIR = path.resolve(__dirname, '../node_modules/three');
const THREE_PUBLIC_PREFIXES = ['build/', 'examples/jsm/'];
const feedbackCooldowns = new Map();
const FEEDBACK_COOLDOWN_MS = 30_000;
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
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.ktx2': 'image/ktx2',
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(JSON.stringify(payload));
}

function safeStaticPath(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
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
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'cache-control': ext === '.html' ? 'no-store' : 'public, max-age=3600',
  });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

// The page links ~40 feature stylesheets; each is a render-blocking request on
// a phone. Concatenate them (in their original order) into one hashed bundle and
// rewrite index.html on the fly. All CSS urls are absolute, so nothing breaks.
const STYLESHEET_LINK = /<link rel="stylesheet" href="(\/[^"]+\.css)" \/>\s*/g;
const NEWLINE = String.fromCharCode(10);
let pageCache = null;

function buildPage() {
  const html = fs.readFileSync(path.join(WEBAPP_DIR, 'index.html'), 'utf8');
  const files = [...html.matchAll(STYLESHEET_LINK)].map(match => match[1]);
  if (!files.length) return { html, css: '', cssPath: null };

  const css = files.map(file => fs.readFileSync(path.join(WEBAPP_DIR, file), 'utf8')).join(NEWLINE);
  const cssPath = `/bundle.${crypto.createHash('sha1').update(css).digest('hex').slice(0, 10)}.css`;
  let inserted = false;
  const bundled = html.replace(STYLESHEET_LINK, () => {
    if (inserted) return '';
    inserted = true;
    return `<link rel="stylesheet" href="${cssPath}" />${NEWLINE}  `;
  });
  return { html: bundled, css, cssPath };
}

function getPage() {
  if (process.env.NODE_ENV !== 'production') return buildPage();
  pageCache ||= buildPage();
  return pageCache;
}

function servePage(res, urlPath) {
  try {
    const page = getPage();
    if (page.cssPath && urlPath === page.cssPath) {
      res.writeHead(200, {
        'content-type': MIME['.css'],
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
      });
      res.end(page.css);
      return true;
    }
    if (urlPath === '/' || urlPath === '/index.html') {
      res.writeHead(200, {
        'content-type': MIME['.html'],
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
      });
      res.end(page.html);
      return true;
    }
  } catch (error) {
    console.error('[miniapp] page bundle failed, serving files as-is:', error);
  }
  return false;
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

// Every game feature mutates the same Chat document (gold, items, ...), so
// per-feature locks let two requests read the same balance and overwrite each
// other's save. Serialise all work for a chat behind one lock instead.
function lockScope(key) {
  return key.startsWith('clan:') ? key : key.split(':')[0];
}

function withLock(rawKey, action) {
  return sharedLock(lockScope(rawKey), action);
}

const RATE_WINDOW_MS = 10_000;
const RATE_MAX_REQUESTS = 60;
const rateBuckets = new Map();

function enforceRateLimit(userId) {
  const now = Date.now();
  let bucket = rateBuckets.get(userId);
  if (!bucket || bucket.reset <= now) {
    bucket = { count: 0, reset: now + RATE_WINDOW_MS };
    rateBuckets.set(userId, bucket);
    if (rateBuckets.size > 10_000) {
      for (const [id, item] of rateBuckets) if (item.reset <= now) rateBuckets.delete(id);
    }
  }
  if (++bucket.count > RATE_MAX_REQUESTS) {
    throw httpError(429, 'Too many requests');
  }
}

async function authorize(req) {
  const validated = validateTelegramInitData(getInitData(req), token);
  if (validated.user?.id) enforceRateLimit(validated.user.id);
  if (!validated.user?.id) {
    throw httpError(401, 'Telegram user is missing');
  }

  const chatId = resolveGameChatId(validated);
  if (!trustedChats.includes(String(chatId))) {
    throw httpError(403, 'This chat is not trusted');
  }

  const session = await getSession(chatId, validated.user.id);
  const isGroupContext = String(chatId) !== String(validated.user.id);
  const membershipStatus = session.userChatData?.status || session.$locals?.telegramMembership?.status;
  if (isGroupContext && ['left', 'kicked'].includes(membershipStatus)) {
    throw httpError(403, 'User is not a member of this game chat');
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

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/** Wraps a route handler: any thrown error becomes a proper JSON error response. */
function guarded(scope, handler) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return sendApiError(args[1], scope, error);
    }
  };
}

/** Game actions answer 200 on success, 409 on a rejected action, plus fresh state. */
function sendResult(res, result, context) {
  return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
}

function sendApiError(res, scope, error) {
  if (error.reason === GOLD_LOCK_REASON) return sendJson(res, 409, { ok: false, reason: error.reason, error: error.message });
  if (error.status && error.status < 500) console.warn(`[miniapp] ${scope}: ${error.status} ${error.message}`);
  else console.error(`[miniapp] ${scope}:`, error);
  // Only errors that opted into a status expose their message; anything else is
  // an internal failure and must not leak details (or masquerade as 401).
  if (error.status) return sendJson(res, error.status, { error: error.message });
  return sendJson(res, 500, { error: 'Internal server error' });
}

/** Gold is frozen while the player sits at a 21 / elements table. */
function assertGoldUnlocked(context) {
  const message = goldLockForMember(context.session);
  if (!message) return;
  const error = new Error(message);
  error.status = 409;
  error.reason = GOLD_LOCK_REASON;
  throw error;
}

function refreshContextSession(context, chat) {
  const member = chat?.members?.find(item => String(item.userId) === String(context.userId));
  if (member) context.session = member;
}

function validateArcadeGameId(gameId) {
  if (typeof gameId !== 'string' || !ARCADE_GAMES.has(gameId)) {
    throw httpError(400, 'Unknown arcade game');
  }
}

const bootstrap = guarded('bootstrap', async (req, res) => {
  const context = await authorize(req);
  // Presence for friends lists; throttled inside stampLastSeen.
  if (stampLastSeen(context.session)) {
    try { await saveSession(context.session); } catch (error) { console.warn('last seen stamp failed', error.message); }
  }
  return sendJson(res, 200, stateFor(context));
});

const updatesState = guarded('updates state', async (req, res) => {
  const context = await authorize(req);
  context.session = await getSession(context.chatId, context.userId);
  return sendJson(res, 200, getUpdatesState(context.session));
});

const updatesSettings = guarded('updates settings', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (typeof body.enabled !== 'boolean') {
    throw httpError(400, 'enabled must be boolean');
  }

  const result = await withLock(`${context.chatId}:${context.userId}:updates`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const changed = setUpdatesEnabled(context.session, body.enabled);
    if (changed.ok) await saveSession(context.session);
    return changed;
  });

  return sendJson(res, result.ok ? 200 : 409, {
    ...result,
    updates: getUpdatesState(context.session),
    state: stateFor(context),
  });
});

const feedbackSubmit = guarded('feedback submit', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const normalized = normalizeFeedbackMessage(body.message);
  if (!normalized.ok) {
    throw httpError(400, normalized.reason);
  }

  const cooldownKey = String(context.userId);
  const now = Date.now();
  const lastSentAt = feedbackCooldowns.get(cooldownKey) || 0;
  const waitMs = FEEDBACK_COOLDOWN_MS - (now - lastSentAt);
  if (waitMs > 0) {
    throw httpError(429, `Подождите ${Math.ceil(waitMs / 1000)} сек. перед следующим сообщением`);
  }

  await sendMessage(myId, formatFeedbackForDeveloper({
    message: normalized.message,
    user: context.validated.user,
    chatId: context.chatId,
  }), { disable_notification: true });
  feedbackCooldowns.set(cooldownKey, now);

  return sendJson(res, 200, { ok: true });
});

const formsState = guarded('forms state', async (req, res) => {
  const context = await authorize(req);
  const forms = await withLock(`${context.chatId}:forms`, async () => {
    const chat = await getChatSession(context.chatId);
    refreshContextSession(context, chat);
    return getFormsState(chat, context.userId);
  });
  return sendJson(res, 200, forms);
});

const formsSave = guarded('forms save', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const result = await withLock(`${context.chatId}:forms`, async () => {
    const chat = await getChatSession(context.chatId);
    refreshContextSession(context, chat);
    const saved = savePersonalForm(chat, context.userId, body.fields);
    if (saved.ok) await chat.save();
    return saved;
  });
  return sendResult(res, result, context);
});

const playerProfileState = guarded('player profile state', async (req, res) => {
  const context = await authorize(req);
  const profile = await withLock(`${context.chatId}:${context.userId}:profile`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return getPlayerProfileState(context.session);
  });
  return sendJson(res, 200, profile);
});

const playerProfileClass = guarded('player profile class', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (typeof body.className !== 'string' || !body.className) {
    throw httpError(400, 'className is required');
  }

  const result = await withLock(`${context.chatId}:${context.userId}:profile`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const changed = changePlayerClassForMiniApp(context.session, body.className);
    if (changed.ok) await saveSession(context.session);
    return changed;
  });

  return sendResult(res, result, context);
});

const playerProfileGender = guarded('player profile gender', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (typeof body.gender !== 'string' || !body.gender) {
    throw httpError(400, 'gender is required');
  }

  const result = await withLock(`${context.chatId}:${context.userId}:profile`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const changed = changePlayerGenderForMiniApp(context.session, body.gender);
    if (changed.ok) await saveSession(context.session);
    return changed;
  });

  return sendResult(res, result, context);
});

const playerSkillsState = guarded('player skills state', async (req, res) => {
  const context = await authorize(req);
  const skills = await withLock(`${context.chatId}:${context.userId}:skills`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return getSkillsState(context.session);
  });
  return sendJson(res, 200, skills);
});

const playerSkillsEnchant = guarded('player skills enchant', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  assertGoldUnlocked(context);
  const slot = Number(body.slot);
  if (!Number.isInteger(slot) || slot < 0) {
    throw httpError(400, 'slot must be a non-negative integer');
  }

  const result = await withLock(`${context.chatId}:${context.userId}:skills`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const enchanted = enchantSkillForMiniApp(context.session, slot);
    if (enchanted.ok) await saveSession(context.session);
    return enchanted;
  });

  return sendResult(res, result, context);
});

const inventoryState = guarded('inventory state', async (req, res) => {
  const context = await authorize(req);
  const inventory = await withLock(`${context.chatId}:${context.userId}:inventory`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return getInventoryState(context.session);
  });
  return sendJson(res, 200, inventory);
});

const inventoryUse = guarded('inventory use', async (req, res) => {
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

const exchangeState = guarded('exchange state', async (req, res) => {
  const context = await authorize(req);
  const exchange = await withLock(`${context.chatId}:${context.userId}:exchange`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return getExchangeState(context.session);
  });
  return sendJson(res, 200, exchange);
});

const exchangeBuy = guarded('exchange buy', async (req, res) => {
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

const goldTransferState = guarded('gold transfer state', async (req, res) => {
  const context = await authorize(req);
  const transfer = await withLock(`${context.chatId}:gold-transfer`, async () => {
    const chat = await getChatSession(context.chatId);
    refreshContextSession(context, chat);
    return getGoldTransferState(chat, context.userId);
  });
  return sendJson(res, 200, transfer);
});

const goldTransferSend = guarded('gold transfer send', async (req, res) => {
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

const SOCIAL_REASONS_STATUS = { not_member: 403, unknown_player: 404 };

async function clanInfo(userId) {
  try {
    const clan = await getClan(Number(userId));
    return clan ? { name: clan.name, memberIds: (clan.members || []).map(member => String(member.userId)) } : { name: null, memberIds: [] };
  } catch {
    return { name: null, memberIds: [] };
  }
}

const socialState = guarded('social state', async (req, res) => {
  const context = await authorize(req);
  const chat = await getChatSession(context.chatId);
  const clan = await clanInfo(context.userId);
  return sendJson(res, 200, getSocialState(chat, context.userId, { clanMemberIds: clan.memberIds, clanName: clan.name }));
});

const socialFriend = guarded('social friend', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (!['string', 'number'].includes(typeof body.userId) || !['add', 'remove'].includes(body.action)) {
    throw httpError(400, 'userId and action (add | remove) are required');
  }
  const result = await withLock(`${context.chatId}:social`, async () => {
    const chat = await getChatSession(context.chatId);
    const updated = setFriend(chat, context.userId, String(body.userId), body.action);
    if (updated.ok) await chat.save();
    return { updated, chat };
  });
  const clan = await clanInfo(context.userId);
  const social = getSocialState(result.chat, context.userId, { clanMemberIds: clan.memberIds, clanName: clan.name });
  const status = result.updated.ok ? 200 : (SOCIAL_REASONS_STATUS[result.updated.reason] || 409);
  return sendJson(res, status, { ...result.updated, social });
});

const playerCard = guarded('player card', async (req, res, requestUrl) => {
  const context = await authorize(req);
  const targetId = requestUrl.searchParams.get('userId') || String(context.userId);
  const chat = await getChatSession(context.chatId);
  const clan = await clanInfo(targetId);
  const card = getPlayerCard(chat, targetId, context.userId, { clanName: clan.name });
  if (!card) return sendJson(res, 404, { error: 'Игрок не найден в этом чате', reason: 'unknown_player' });
  return sendJson(res, 200, card);
});

const stealState = guarded('steal state', async (req, res) => {
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

const stealAttack = guarded('steal attack', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (!['string', 'number'].includes(typeof body.targetId) || String(body.targetId).trim() === '') {
    throw httpError(400, 'targetId is required');
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
});

const point21State = guarded('point21 state', async (req, res) => {
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

const point21Action = guarded('point21 action', async (req, res) => {
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

const elementsState = guarded('elements state', async (req, res) => {
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

const elementsAction = guarded('elements action', async (req, res) => {
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

const bonusState = guarded('bonus state', async (req, res) => {
  const context = await authorize(req);
  return sendJson(res, 200, getBonusState(context.session));
});

const bonusClaim = guarded('bonus claim', async (req, res) => {
  const context = await authorize(req);
  const result = await withLock(`${context.chatId}:${context.userId}:bonus`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const claimed = claimBonus(context.session);
    if (claimed.ok) await saveSession(context.session);
    return claimed;
  });
  return sendResult(res, result, context);
});

const titlesState = guarded('titles state', async (req, res) => {
  const context = await authorize(req);
  const titles = await withLock(`${context.chatId}:titles`, async () => {
    const chat = await getChatSession(context.chatId);
    refreshContextSession(context, chat);
    return getTitlesState(context.chatId, context.userId, chat);
  });
  return sendJson(res, 200, titles);
});

const titlesAssign = guarded('titles assign', async (req, res) => {
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
});

const horoscopeState = guarded('horoscope state', async (req, res) => {
  const context = await authorize(req);
  return sendJson(res, 200, getHoroscopeState(context.session));
});

const horoscopeSettings = guarded('horoscope settings', async (req, res) => {
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

const horoscopeGenerate = guarded('horoscope generate', async (req, res) => {
  const context = await authorize(req);
  const result = await withLock(`${context.chatId}:${context.userId}:horoscope`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return generateHoroscopeForMiniApp(context.session);
  });
  return sendJson(res, 200, result);
});

const clanState = guarded('clan state', async (req, res) => {
  const context = await authorize(req);
  const dashboard = await withLock('clan:global', () => getClanDashboard(context.userId, context.session));
  return sendJson(res, 200, dashboard);
});

const clanAction = guarded('clan action', async (req, res) => {
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

const clanQuiz = guarded('clan quiz', async (req, res) => {
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
});

const clanActivity = guarded('clan activity', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (body.action === 'upgrade_member') assertGoldUnlocked(context);
  const competitionActions = new Set(['pvp_fight', 'war_declare', 'war_attack']);
  const managementActions = new Set(['application_accept', 'application_reject', 'invite', 'kick', 'promote', 'demote', 'settings_update']);
  const progressionActions = new Set(['investigation_start', 'investigation_fund', 'investigation_complete', 'investigation_cancel', 'task_claim', 'task_claim_bonus']);
  const allowed = new Set(['boss_summon', 'boss_attack', 'shop_buy', 'upgrade_member', 'upgrade_building', ...competitionActions, ...managementActions, ...progressionActions]);
  if (!allowed.has(body.action)) {
    throw httpError(400, 'Unknown clan activity');
  }

  const payload = await withLock('clan:global', async () => {
    context.session = await getSession(context.chatId, context.userId);
    let result;

    if (competitionActions.has(body.action)) {
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

  return sendJson(res, payload.result.ok ? 200 : 409, {
    ...payload.result,
    dashboard: payload.dashboard,
    state: stateFor(context),
  });
});

const chestState = guarded('chest state', async (req, res) => {
  const context = await authorize(req);
  return sendJson(res, 200, getChestState(context.session));
});

const chestOpen = guarded('open chest', async (req, res) => {
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

const gachaState = guarded('gacha state', async (req, res) => {
  const context = await authorize(req);
  return sendJson(res, 200, getGachaState(context.session));
});

const gachaRoll = guarded('gacha roll', async (req, res) => {
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

const gachaResolve = guarded('gacha resolve', async (req, res) => {
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

const equipmentState = guarded('equipment state', async (req, res) => {
  const context = await authorize(req);
  return sendJson(res, 200, getEquipmentState(context.session));
});

const equipmentAction = guarded('equipment action', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (body.action === 'upgrade') assertGoldUnlocked(context);
  if (typeof body.key !== 'string' || !body.key) {
    throw httpError(400, 'equipment key is required');
  }
  if (!['equip', 'unequip', 'sell', 'upgrade'].includes(body.action)) {
    throw httpError(400, 'action must be equip, unequip, sell or upgrade');
  }
  const result = await withLock(`${context.chatId}:${context.userId}:equipment`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const updated = performEquipmentAction(context.session, body.key, body.action);
    if (updated.ok) await saveSession(context.session);
    return updated;
  });
  return sendResult(res, result, context);
});

const equipmentCraft = guarded('equipment craft', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  assertGoldUnlocked(context);
  if (typeof body.grade !== 'string' || !body.grade) {
    throw httpError(400, 'grade is required');
  }
  const result = await withLock(`${context.chatId}:${context.userId}:equipment`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const updated = craftEquipmentItem(context.session, body.grade);
    if (updated.ok) await saveSession(context.session);
    return updated;
  });
  return sendResult(res, result, context);
});

const buildsState = guarded('builds state', async (req, res) => {
  const context = await authorize(req);
  const builds = await withLock(`${context.chatId}:${context.userId}:builds`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const changed = prepareBuilds(context.session);
    if (changed) await saveSession(context.session);
    return getBuildsState(context.session);
  });
  return sendJson(res, 200, builds);
});

const buildsAction = guarded('builds action', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (body.action === 'upgrade') assertGoldUnlocked(context);
  if (typeof body.buildName !== 'string' || !body.buildName) {
    throw httpError(400, 'buildName is required');
  }
  if (!new Set(['upgrade', 'speedup', 'collect', 'change_type', 'rename']).has(body.action)) {
    throw httpError(400, 'Unknown building action');
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
  return sendResult(res, result, context);
});

const arenaState = guarded('arena state', async (req, res, requestUrl) => {
  const context = await authorize(req);
  const mode = requestUrl.searchParams.get('mode') || 'common';
  const arena = await withLock(`${context.chatId}:${context.userId}:arena`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return getArenaState(context.session, context.chatId, context.userId, mode);
  });
  return sendJson(res, 200, arena);
});

const arenaAttack = guarded('arena attack', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (!['common', 'expansion'].includes(body.mode)) {
    throw httpError(400, 'mode must be common or expansion');
  }
  if (typeof body.defenderId !== 'string' || !body.defenderId) {
    throw httpError(400, 'defenderId is required');
  }
  const result = await withLock(`${context.chatId}:${context.userId}:arena`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const battle = await attackArena(context.session, context.chatId, context.userId, body.mode, body.defenderId);
    if (battle.ok) await saveSession(context.session);
    return battle;
  });
  return sendResult(res, result, context);
});

const bossState = guarded('boss state', async (req, res) => {
  const context = await authorize(req);
  const boss = await withLock(`${context.chatId}:boss`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return getBossState(context.session, context.chatId);
  });
  return sendJson(res, 200, boss);
});

const bossSummon = guarded('boss summon', async (req, res) => {
  const context = await authorize(req);
  const result = await withLock(`${context.chatId}:boss`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return summonBossForMiniApp(context.session, context.chatId);
  });
  context.session = await getSession(context.chatId, context.userId);
  return sendResult(res, result, context);
});

const bossSkill = guarded('boss skill', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const skillIndex = Number(body.skillIndex);
  if (!Number.isInteger(skillIndex) || skillIndex < 0) {
    throw httpError(400, 'skillIndex must be a non-negative integer');
  }
  const result = await withLock(`${context.chatId}:boss`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return useBossSkill(context.session, context.chatId, context.userId, skillIndex);
  });
  context.session = await getSession(context.chatId, context.userId);
  return sendResult(res, result, context);
});

const shopState = guarded('shop state', async (req, res) => {
  const context = await authorize(req);
  const shop = await withLock(`${context.chatId}:${context.userId}:shop`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return getShopState(context.session);
  });
  return sendJson(res, 200, shop);
});

const shopBuy = guarded('shop buy', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  assertGoldUnlocked(context);
  if (typeof body.command !== 'string' || !body.command) {
    throw httpError(400, 'command is required');
  }
  const result = await withLock(`${context.chatId}:${context.userId}:shop`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const purchase = await buyShopItem(context.session, body.command);
    if (purchase.ok) await saveSession(context.session);
    return purchase;
  });
  return sendResult(res, result, context);
});

const swordState = guarded('sword state', async (req, res) => {
  const context = await authorize(req);
  const sword = await withLock(`${context.chatId}:sword`, async () => {
    const chat = await getChatSession(context.chatId);
    refreshContextSession(context, chat);
    return getMiniAppSwordDashboard(chat, context.userId);
  });
  return sendJson(res, 200, sword);
});

const swordRoll = guarded('sword roll', async (req, res) => {
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

const arcadeReset = guarded('arcade reset', async (req, res) => {
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

const arcadeState = guarded('arcade state', async (req, res) => {
  const context = await authorize(req);
  const arcade = await withLock(`${context.chatId}:${context.userId}:arcade`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return getArcadeState(context.session);
  });
  return sendJson(res, 200, arcade);
});

const arcadeStart = guarded('arcade start', async (req, res) => {
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

const arcadeRoll = guarded('arcade roll', async (req, res) => {
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

export default function startMiniAppServer() {
  if (process.env.MINI_APP_ENABLED === 'false') return null;

  const port = Number(process.env.MINI_APP_PORT || process.env.PORT || 8080);
  const host = process.env.MINI_APP_HOST || '0.0.0.0';

  const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const route = `${req.method} ${requestUrl.pathname}`;

    if (route === 'GET /healthz') return sendJson(res, 200, { ok: true });
    if (route === 'GET /api/bootstrap') return bootstrap(req, res);
    if (route === 'GET /api/updates') return updatesState(req, res);
    if (route === 'POST /api/updates/settings') return updatesSettings(req, res);
    if (route === 'POST /api/feedback') return feedbackSubmit(req, res);
    if (route === 'GET /api/forms') return formsState(req, res);
    if (route === 'POST /api/forms/save') return formsSave(req, res);
    if (route === 'GET /api/profile') return playerProfileState(req, res);
    if (route === 'POST /api/profile/class') return playerProfileClass(req, res);
    if (route === 'POST /api/profile/gender') return playerProfileGender(req, res);
    if (route === 'GET /api/skills') return playerSkillsState(req, res);
    if (route === 'POST /api/skills/enchant') return playerSkillsEnchant(req, res);
    if (route === 'GET /api/inventory') return inventoryState(req, res);
    if (route === 'POST /api/inventory/use') return inventoryUse(req, res);
    if (route === 'GET /api/exchange') return exchangeState(req, res);
    if (route === 'POST /api/exchange/buy') return exchangeBuy(req, res);
    if (route === 'GET /api/gold-transfer') return goldTransferState(req, res);
    if (route === 'POST /api/gold-transfer/send') return goldTransferSend(req, res);
    if (route === 'GET /api/social') return socialState(req, res);
    if (route === 'POST /api/social/friend') return socialFriend(req, res);
    if (route === 'GET /api/player') return playerCard(req, res, requestUrl);
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
    if (route === 'POST /api/equipment/craft') return equipmentCraft(req, res);
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
    if (route === 'POST /api/arcade/reset') return arcadeReset(req, res);
    if (route === 'POST /api/arcade/roll') return arcadeRoll(req, res);

    if (req.method === 'GET' && requestUrl.pathname.startsWith('/game-assets/')) {
      const assetPath = requestUrl.pathname.slice('/game-assets/'.length);
      if (serveFile(res, GAME_ASSETS_DIR, assetPath)) return;
      return sendJson(res, 404, { error: 'Asset not found' });
    }

    if (req.method === 'GET' && requestUrl.pathname.startsWith('/vendor/three/')) {
      const vendorPath = requestUrl.pathname.slice('/vendor/three/'.length);
      if (THREE_PUBLIC_PREFIXES.some(prefix => vendorPath.startsWith(prefix)) && serveFile(res, THREE_DIR, vendorPath)) return;
      return sendJson(res, 404, { error: 'Asset not found' });
    }

    if (req.method === 'GET' && servePage(res, requestUrl.pathname)) return;
    if (req.method === 'GET' && serveFile(res, WEBAPP_DIR, requestUrl.pathname)) return;
    // A missing model must 404: the SPA fallback below would hand the glTF
    // loader an HTML page with status 200.
    if (req.method === 'GET' && requestUrl.pathname.startsWith('/models/')) return sendJson(res, 404, { error: 'Model not found' });
    if (req.method === 'GET' && servePage(res, '/index.html')) return;
    if (req.method === 'GET' && serveFile(res, WEBAPP_DIR, '/index.html')) return;
    return sendJson(res, 404, { error: 'Not found' });
  });

  server.listen(port, host, () => {
    console.log(`[miniapp] WebGL Mini App listening on http://${host}:${port}`);
  });

  return server;
}
