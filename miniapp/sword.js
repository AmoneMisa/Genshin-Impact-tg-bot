import { getSwordState, rollSword } from '../functions/game/sword/swordCore.js';

export function getMiniAppSwordState(session, now = Date.now()) {
  return getSwordState(session, now);
}

export function rollMiniAppSword(session, options = {}) {
  return rollSword(session, options);
}
