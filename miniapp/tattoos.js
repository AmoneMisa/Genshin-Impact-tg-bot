// Mini App face of the symbols (functions/game/player/tattoos.js).
import {applyTattoo, getTattooState, removeTattoo} from '../functions/game/player/tattoos.js';

export {getTattooState};

export function performTattooAction(session, action, body = {}) {
  let result;
  if (action === 'list') return {ok: true, action, tattoos: getTattooState(session, body)};
  if (action === 'apply') result = applyTattoo(session, body.dye);
  else if (action === 'remove') result = removeTattoo(session, body.index);
  else return {ok: false, reason: 'unknown_action', tattoos: getTattooState(session)};
  return {
    ok: result.ok, action, reason: result.reason, needLevel: result.needLevel, need: result.need, price: result.price,
    returned: result.returned, tattoos: getTattooState(session, body.query || {}),
  };
}
