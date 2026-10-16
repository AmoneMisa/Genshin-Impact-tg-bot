import zlib from 'zlib';
import { promisify } from 'node:util';
import { sendApiError } from './response.js';

const gzip = promisify(zlib.gzip);
const brotli = promisify(zlib.brotliCompress);

// Text assets (the Mini App is ~1.9 MB of JS and CSS) are compressed once per file version. Old phones on a slow
// network gain the most from this; the compressed copy is kept in memory keyed by the ETag, so it cannot go stale.
// Brotli is ~15-20% smaller than gzip for JS/CSS; clients that do not send `br` still get gzip.
export const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg']);
const CACHE_LIMIT = 400;
const compressed = new Map();

const ENCODERS = {
  br: value => brotli(value, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }),
  gzip: value => gzip(value, { level: 6 }),
};

/** The best encoding the client accepts: 'br', 'gzip' or null. */
export function pickEncoding(req) {
  const header = req?.headers?.['accept-encoding'] || '';
  if (/\bbr\b/.test(header)) return 'br';
  return /\bgzip\b/.test(header) ? 'gzip' : null;
}

export function etagMatches(req, etag) {
  const header = req?.headers?.['if-none-match'];
  return Boolean(header) && header.split(',').some(tag => tag.trim() === etag || tag.trim() === '*');
}

// Least recently used: a hit moves the entry to the end, the oldest one is dropped when the cache is full.
function remember(key, value) {
  compressed.delete(key);
  compressed.set(key, value);
  if (compressed.size > CACHE_LIMIT) compressed.delete(compressed.keys().next().value);
}

export async function sendCompressed(res, headers, encoding, key, read) {
  const cacheKey = `${encoding}|${key}`;
  try {
    let body = compressed.get(cacheKey);
    if (body) remember(cacheKey, body);
    else {
      body = Promise.resolve().then(read).then(ENCODERS[encoding]);
      remember(cacheKey, body);
    }
    body = await body;
    if (res.destroyed) return;
    res.writeHead(200, { ...headers, 'content-encoding': encoding, vary: 'accept-encoding', 'content-length': body.length });
    res.end(body);
  } catch (error) {
    compressed.delete(cacheKey);
    if (!res.destroyed) sendApiError(res, 'compression', error);
  }
}
