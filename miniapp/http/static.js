import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { bundlePageAssets, optimizeScripts } from '../pageAssets.js';
import { renderShell, inlineHeadScript } from '../ssrShell.js';
import { COMPRESSIBLE, pickEncoding, etagMatches, sendCompressed } from './compression.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const WEBAPP_DIR = path.resolve(__dirname, '../../webapp');
export const GAME_ASSETS_DIR = path.resolve(__dirname, '../../images');
// three.js is served from node_modules (pinned in package.json) instead of a CDN:
// Telegram clients in some regions can't reliably reach public CDNs. Only the
// browser runtime folders are exposed.
export const THREE_DIR = path.resolve(__dirname, '../../node_modules/three');
export const THREE_PUBLIC_PREFIXES = ['build/', 'examples/jsm/'];
export const PHASER_DIR = path.resolve(__dirname, '../../node_modules/phaser/dist');
export const MIME = {
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

export function safeStaticPath(root, urlPath) {
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

export async function serveFile(res, root, urlPath) {
  let filePath = safeStaticPath(root, urlPath);
  if (!filePath) return false;
  let stat;
  try {
    stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) { filePath = path.join(filePath, 'index.html'); stat = await fs.promises.stat(filePath); }
  } catch (error) { if (['ENOENT','ENOTDIR'].includes(error.code)) return false; throw error; }
  if (!stat.isFile()) return false;

  const ext = path.extname(filePath).toLowerCase();

  const headers = {
    'content-type': MIME[ext] || 'application/octet-stream',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'cache-control': ext === '.html' ? 'no-store' : ['.js', '.css'].includes(ext) ? 'no-cache' : /^\/art\/(?:items|chests|world)\/v\d+\//.test(urlPath) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
    etag: `W/"${stat.size.toString(36)}-${Math.floor(stat.mtimeMs).toString(36)}"`,
  };
  // A phone that already has the file gets a 304 (no body) instead of the whole file again.
  if (etagMatches(res.req, headers.etag)) {
    res.writeHead(304, headers);
    res.end();
    return true;
  }
  const encoding = COMPRESSIBLE.has(ext) ? pickEncoding(res.req) : null;
  if (encoding) {
    sendCompressed(res, headers, encoding, `${filePath}|${headers.etag}`, () => fs.promises.readFile(filePath));
    return true;
  }
  res.writeHead(200, headers);
  fs.createReadStream(filePath).on('error', error => res.destroy(error)).pipe(res);
  return true;
}

// The page links ~40 feature stylesheets; each is a render-blocking request on
// a phone. Concatenate them (in their original order) into one hashed bundle and
// rewrite index.html on the fly. All CSS urls are absolute, so nothing breaks.
let pageCache = null;

function buildPage() {
  const html = fs.readFileSync(path.join(WEBAPP_DIR, 'index.html'), 'utf8');
  const readFile = file => fs.readFileSync(path.join(WEBAPP_DIR, file), 'utf8');
  const page = bundlePageAssets(html, readFile);
  page.html = renderShell(inlineHeadScript(optimizeScripts(page.html, readFile), readFile('/early-fetch.js')));
  page.htmlHash = crypto.createHash('sha1').update(page.html).digest('hex');
  return page;
}

function getPage() {
  pageCache ||= buildPage();
  return pageCache;
}

export function servePage(res, urlPath) {
  try {
    const page = getPage();
    const bundle = page.bundles.find(bundle => bundle.path === urlPath);
    if (bundle) {
      const headers = {
        'content-type': MIME['.css'],
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
      };
      const encoding = pickEncoding(res.req);
      if (encoding) sendCompressed(res, headers, encoding, `css|${bundle.path}`, () => bundle.css);
      else {
        res.writeHead(200, headers);
        res.end(bundle.css);
      }
      return true;
    }
    if (urlPath === '/' || urlPath === '/index.html' || urlPath === '/admin') {
      const headers = {
        'content-type': MIME['.html'],
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
      };
      const encoding = pickEncoding(res.req);
      if (encoding) sendCompressed(res, headers, encoding, `html|${page.htmlHash}`, () => page.html);
      else {
        res.writeHead(200, headers);
        res.end(page.html);
      }
      return true;
    }
  } catch (error) {
    console.error('[miniapp] page bundle failed, serving files as-is:', error);
  }
  return false;
}
