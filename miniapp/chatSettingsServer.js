import { PassThrough } from 'node:stream';
import { token, myId } from '../config.js';
import { trustedChats } from '../data.js';
import bot from '../bot.js';
import getSession from '../functions/getters/getSession.js';
import { validateTelegramInitData, resolveGameChatId } from './telegramAuth.js';
import { getChatSettingsState, updateChatSettingForMiniApp } from './chatSettings.js';
import { getSelfMuteStateForMiniApp, performSelfMuteForMiniApp } from './selfMute.js';
import {
  checkMiniAppFeatureAccess,
  getArcadeSettingKey,
  getMiniAppRouteSettingKey,
  isArcadeSettingRoute,
  isMiniAppGroupOnlyRoute,
} from './featureAccess.js';
import startMiniAppServer from './server.js';

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function getInitData(req) {
  const header = req.headers['x-telegram-init-data'];
  if (typeof header === 'string' && header) return header;
  const auth = req.headers.authorization || '';
  return auth.startsWith('tma ') ? auth.slice(4) : '';
}

async function readRawBody(req, maxBytes = 8192) {
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

    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseJsonBody(rawBody) {
  if (!rawBody.length) return {};
  try {
    return JSON.parse(rawBody.toString('utf8'));
  } catch {
    const error = new Error('Invalid JSON body');
    error.status = 400;
    throw error;
  }
}

async function readJsonBody(req, maxBytes = 8192) {
  return parseJsonBody(await readRawBody(req, maxBytes));
}

function replayRequest(req, rawBody) {
  const replay = new PassThrough();
  replay.method = req.method;
  replay.url = req.url;
  replay.headers = req.headers;
  replay.rawHeaders = req.rawHeaders;
  replay.httpVersion = req.httpVersion;
  replay.httpVersionMajor = req.httpVersionMajor;
  replay.httpVersionMinor = req.httpVersionMinor;
  replay.trailers = req.trailers;
  replay.rawTrailers = req.rawTrailers;
  replay.socket = req.socket;
  replay.connection = req.connection;
  process.nextTick(() => replay.end(rawBody));
  return replay;
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

  const userId = validated.user.id;
  const session = await getSession(chatId, userId);
  const isGroupContext = String(chatId) !== String(userId);
  const membershipStatus = session.userChatData?.status || session.$locals?.telegramMembership?.status;
  if (isGroupContext && ['left', 'kicked'].includes(membershipStatus)) {
    const error = new Error('User is not a member of this game chat');
    error.status = 403;
    throw error;
  }

  return { chatId, userId, session };
}

async function handleUtilityRequest(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const route = `${req.method} ${requestUrl.pathname}`;
  const supported = new Set([
    'GET /api/chat-settings',
    'POST /api/chat-settings/update',
    'GET /api/self-mute',
    'POST /api/self-mute/activate',
  ]);
  if (!supported.has(route)) return false;

  try {
    const context = await authorize(req);

    if (route === 'GET /api/chat-settings') {
      const chatSettings = await getChatSettingsState({ ...context, ownerId: myId });
      sendJson(res, 200, chatSettings);
      return true;
    }

    if (route === 'POST /api/chat-settings/update') {
      const body = await readJsonBody(req);
      const result = await updateChatSettingForMiniApp({
        ...context,
        ownerId: myId,
        key: body.key,
        enabled: body.enabled,
      });
      sendJson(res, result.ok ? 200 : result.status || 409, result);
      return true;
    }

    if (route === 'GET /api/self-mute') {
      const selfMute = await getSelfMuteStateForMiniApp({ ...context, bot });
      sendJson(res, 200, selfMute);
      return true;
    }

    const result = await performSelfMuteForMiniApp({ ...context, bot });
    sendJson(res, result.ok ? 200 : result.status || 409, result);
    return true;
  } catch (error) {
    console.error('[miniapp] utility route:', error);
    sendJson(res, error.status || 401, { error: error.message || 'Unauthorized' });
    return true;
  }
}

async function checkFeatureGate(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let settingKey = getMiniAppRouteSettingKey(req.method, requestUrl.pathname);
  const groupOnly = isMiniAppGroupOnlyRoute(req.method, requestUrl.pathname);
  const arcadeRoute = isArcadeSettingRoute(req.method, requestUrl.pathname);
  if (!settingKey && !groupOnly && !arcadeRoute) return { handled: false, request: req };

  try {
    const context = await authorize(req);
    let request = req;

    if (arcadeRoute) {
      const rawBody = await readRawBody(req);
      const body = parseJsonBody(rawBody);
      settingKey = getArcadeSettingKey(body.gameId);
      if (!settingKey) {
        sendJson(res, 400, { error: 'Unknown arcade game', reason: 'unknown_arcade_game' });
        return { handled: true, request: null };
      }
      request = replayRequest(req, rawBody);
    }

    const access = await checkMiniAppFeatureAccess({ ...context, settingKey, groupOnly });
    if (!access.ok) {
      sendJson(res, access.status || 403, access);
      return { handled: true, request: null };
    }

    return { handled: false, request };
  } catch (error) {
    console.error('[miniapp] feature gate:', error);
    sendJson(res, error.status || 401, { error: error.message || 'Unauthorized' });
    return { handled: true, request: null };
  }
}

async function dispatchBase(server, listeners, req, res) {
  for (const listener of listeners) {
    await listener.call(server, req, res);
    if (res.writableEnded) break;
  }
}

export function installChatSettingsRoutes(server) {
  if (!server) return server;
  const baseListeners = server.listeners('request');
  server.removeAllListeners('request');
  server.on('request', async (req, res) => {
    if (await handleUtilityRequest(req, res)) return;
    const gate = await checkFeatureGate(req, res);
    if (gate.handled) return;
    await dispatchBase(server, baseListeners, gate.request, res);
  });
  return server;
}

export default function startMiniAppServerWithChatSettings() {
  return installChatSettingsRoutes(startMiniAppServer());
}
