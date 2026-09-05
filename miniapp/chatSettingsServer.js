import { token, myId } from '../config.js';
import { trustedChats } from '../data.js';
import getSession from '../functions/getters/getSession.js';
import { validateTelegramInitData, resolveGameChatId } from './telegramAuth.js';
import { getChatSettingsState, updateChatSettingForMiniApp } from './chatSettings.js';
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

async function handleChatSettingsRequest(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const route = `${req.method} ${requestUrl.pathname}`;
  if (route !== 'GET /api/chat-settings' && route !== 'POST /api/chat-settings/update') return false;

  try {
    const context = await authorize(req);
    if (route === 'GET /api/chat-settings') {
      const chatSettings = await getChatSettingsState({ ...context, ownerId: myId });
      sendJson(res, 200, chatSettings);
      return true;
    }

    const body = await readJsonBody(req);
    const result = await updateChatSettingForMiniApp({
      ...context,
      ownerId: myId,
      key: body.key,
      enabled: body.enabled,
    });
    sendJson(res, result.ok ? 200 : result.status || 409, result);
    return true;
  } catch (error) {
    console.error('[miniapp] chat settings:', error);
    sendJson(res, error.status || 401, { error: error.message || 'Unauthorized' });
    return true;
  }
}

export function installChatSettingsRoutes(server) {
  if (!server) return server;
  const baseListeners = server.listeners('request');
  server.removeAllListeners('request');
  server.on('request', async (req, res) => {
    if (await handleChatSettingsRequest(req, res)) return;
    for (const listener of baseListeners) {
      await listener.call(server, req, res);
      if (res.writableEnded) break;
    }
  });
  return server;
}

export default function startMiniAppServerWithChatSettings() {
  return installChatSettingsRoutes(startMiniAppServer());
}
