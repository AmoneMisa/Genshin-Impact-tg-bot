// Mini App face of fishing (functions/game/fishing/fishing.js).
import {castOnce, getFishingState, openFish, setAuto, settleFishing} from '../functions/game/fishing/fishing.js';

export {getFishingState};

/** Runs one fishing action; every action first settles the casts that fell due while auto fishing was on. */
export function performFishingAction(session, action, body = {}, now = Date.now()) {
  let result;
  switch (action) {
    case 'state': result = {ok: true, caught: settleFishing(session, now)}; break;
    case 'cast': result = castOnce(session, now); break;
    case 'auto': result = setAuto(session, body.enabled === true, now); break;
    case 'open': result = openFish(session, body.item ?? 'all', body.count ?? 'all'); break;
    default: return {ok: false, reason: 'unknown_action', fishing: getFishingState(session, now)};
  }
  return {...result, action, fishing: getFishingState(session, now)};
}
