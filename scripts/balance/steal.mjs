// Measures how raiding (functions/game/builds/stealResources.js) depends on class: for every
// attacker / target pair at equal level, the share of the target's hp+cp pool that is still
// standing after the 2 minute passive-defender raid.
//   node scripts/balance/steal.mjs [classes] [levels]
import playerDamagePlayer, { poolPercent } from '../../functions/game/arena/playerDamagePlayer.js';
import changePlayerClass from '../../functions/game/player/changePlayerGameClass.js';
import updatePlayerStats from '../../functions/game/player/updatePlayerStats.js';

const CLASSES = (process.argv[2] || 'warrior,mage,priest,archer,rogue,berserk').split(',');
const LEVELS = (process.argv[3] || '20,40,60,90').split(',').map(Number);
const RUNS = 8;

function player(className, lvl) {
  const session = {
    userId: 1, userChatData: { user: { id: 1 } },
    game: { stats: { lvl }, inventory: { gold: 0, arena: { items: [{ tokens: 0 }, { pvpSign: null }] } }, gameClass: { stats: { name: 'noClass' } }, effects: [], equipmentStats: {} },
  };
  changePlayerClass(session, className);
  updatePlayerStats(session);
  return session;
}

export function remaining(attackerClass, targetClass, lvl) {
  let sum = 0;
  for (let i = 0; i < RUNS; i++) {
    const [, , details] = playerDamagePlayer(player(attackerClass, lvl), player(targetClass, lvl), false, false, 120, false, { defenderActs: false });
    sum += poolPercent(details.defender);
  }
  return sum / RUNS;
}

if (process.argv[1]?.endsWith('steal.mjs')) {
  for (const lvl of LEVELS) {
    console.log(`\nlevel ${lvl}: target pool % left after 120 s (rows attack, columns defend)`);
    console.log('          ' + CLASSES.map(name => name.slice(0, 7).padStart(8)).join(''));
    for (const a of CLASSES) {
      console.log(a.padEnd(10) + CLASSES.map(b => remaining(a, b, lvl).toFixed(0).padStart(8)).join(''));
    }
  }
}
