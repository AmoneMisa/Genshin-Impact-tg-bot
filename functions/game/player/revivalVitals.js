import getMaxHp from './getters/getMaxHp.js';
import getMaxMp from './getters/getMaxMp.js';
/** All resurrection sources restore the same resources; town return starts at 1 HP. */
export function restoreRevivalVitals(session, {town = false} = {}) {
  const stats = session.game.gameClass.stats;
  stats.hp = town ? 1 : Math.max(1, Math.round(getMaxHp(session) * .6));
  stats.mp = Math.max(0, Math.round(getMaxMp(session) * .3));
  stats.cp = 0;
  session.game.respawnTime = 0;
  delete session.game.l2PendingDeath;
  delete session.game.hpPotion;
  session.needsSave = true;
}
