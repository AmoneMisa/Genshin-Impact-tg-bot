import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { token } from '../config.js';
import { trustedChats } from '../data.js';
import getSession from '../functions/getters/getSession.js';
import { validateTelegramInitData, resolveGameChatId } from './telegramAuth.js';
import { createMiniAppState } from './state.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEBAPP_DIR = path.resolve(__dirname, '../webapp');
const GAME_ASSETS_DIR = path.resolve(__dirname, '../images');
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

async function bootstrap(req, res) {
  try {
    const validated = validateTelegramInitData(getInitData(req), token);
    if (!validated.user?.id) throw new Error('Telegram user is missing');

    const chatId = resolveGameChatId(validated);
    if (!trustedChats.includes(String(chatId))) {
      return sendJson(res, 403, { error: 'This chat is not trusted' });
    }

    const session = await getSession(chatId, validated.user.id);
    return sendJson(res, 200, createMiniAppState(session, {
      chatId,
      chatType: validated.chatType,
      user: validated.user,
    }));
  } catch (error) {
    console.error('[miniapp] bootstrap:', error);
    return sendJson(res, 401, { error: error.message || 'Unauthorized' });
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
