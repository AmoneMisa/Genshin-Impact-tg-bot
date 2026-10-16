import { lockScope } from '../lockScope.js';
import { withLock as sharedLock } from '../../functions/general/chatLock.js';

export function getInitData(req) {
  const header = req.headers['x-telegram-init-data'];
  if (typeof header === 'string' && header) return header;
  const auth = req.headers.authorization || '';
  return auth.startsWith('tma ') ? auth.slice(4) : '';
}

export async function readJsonBody(req, maxBytes = 8192) {
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
export function withLock(rawKey, action) {
  return sharedLock(lockScope(rawKey), action);
}
