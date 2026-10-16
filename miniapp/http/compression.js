import zlib from 'zlib';
import { promisify } from 'node:util';
import { sendApiError } from './response.js';

const gzip = promisify(zlib.gzip);

// Text assets (the Mini App is ~1.9 MB of JS and CSS) are gzipped once per file version. Old phones on a slow
// network gain the most from this; the compressed copy is kept in memory keyed by the ETag, so it cannot go stale.
export const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg']);
export const gzipCache = new Map();

export function acceptsGzip(req) {
  return /\bgzip\b/.test(req?.headers?.['accept-encoding'] || '');
}

export function etagMatches(req, etag) {
  const header = req?.headers?.['if-none-match'];
  return Boolean(header) && header.split(',').some(tag => tag.trim() === etag || tag.trim() === '*');
}

export async function sendGzip(res, headers, key, read) {
  try {
  let body = gzipCache.get(key);
  if (!body) {
    body = Promise.resolve().then(read).then(value => gzip(value, {level:6}));
    if (gzipCache.size > 400) gzipCache.clear();
    gzipCache.set(key, body);
  }
  body = await body;
  if (res.destroyed) return;
  res.writeHead(200, { ...headers, 'content-encoding': 'gzip', vary: 'accept-encoding', 'content-length': body.length });
  res.end(body);
  } catch (error) { gzipCache.delete(key); if (!res.destroyed) sendApiError(res, 'compression', error); }
}
