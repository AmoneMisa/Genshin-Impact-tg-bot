import { GOLD_LOCK_REASON } from '../../functions/game/general/goldLock.js';

export function sendJson(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(JSON.stringify(payload));
}

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/** Wraps a route handler: any thrown error becomes a proper JSON error response. */
export function guarded(scope, handler) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return sendApiError(args[1], scope, error);
    }
  };
}

export function sendApiError(res, scope, error) {
  if (error.code === 20 && /Transaction numbers|replica set/i.test(error.message)) return sendJson(res,503,{ok:false,reason:'database_transactions_required',error:'Для сохранения игры требуется MongoDB replica set. Обратитесь к администратору.'});
  if (error.code === 112 || error.name === 'VersionError') return sendJson(res,409,{ok:false,reason:'character_conflict',error:'Character changed concurrently; refresh and retry the action'});
  if (error.reason === GOLD_LOCK_REASON) return sendJson(res, 409, { ok: false, reason: error.reason, error: error.message });
  if (error.status && error.status < 500) console.warn(`[miniapp] ${scope}: ${error.status} ${error.message}`);
  else console.error(`[miniapp] ${scope}:`, error);
  // Only errors that opted into a status expose their message; anything else is
  // an internal failure and must not leak details (or masquerade as 401).
  if (error.status) return sendJson(res, error.status, { error: error.message });
  return sendJson(res, 500, { error: 'Internal server error' });
}
