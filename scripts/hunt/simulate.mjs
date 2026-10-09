// Plays hunts with bare heroes to check the balance of the hunting fields:
//   node scripts/hunt/simulate.mjs [class] [level...]
// For each level it fights 40 mobs of the best-fitting zone (one second per step, skills used as soon as
// they are ready, real cooldowns) and prints the casts and seconds a kill takes, the share of HP a kill costs and the
// experience in levels per kill.
import changePlayerGameClass from '../../functions/game/player/changePlayerGameClass.js';
import updatePlayerStats from '../../functions/game/player/updatePlayerStats.js';
import getMaxHp from '../../functions/game/player/getters/getMaxHp.js';
import getCurrentHp from '../../functions/game/player/getters/getCurrentHp.js';
import { startHunt, useHuntSkill, ensureHunt } from '../../functions/game/hunt/huntFight.js';
import { getZones } from '../../functions/game/hunt/huntMobs.js';
import { levelNeed } from '../../functions/game/player/vitality.js';

const className = process.argv[2] || 'warrior';
const levels = process.argv.slice(3).map(Number);
if (!levels.length) levels.push(10, 25, 40, 55, 70, 85);

function hero(level) {
  const session = {
    userId: 1, userChatData: {user: {id: 1}},
    game: {stats: {lvl: level, currentExp: 0, needExp: 1}, inventory: {gold: 0, sp: 0, materials: {}, potions: {items: []}, equipment: {items: []}}, equipmentStats: {}, effects: [], builds: {}, respawnTime: 0},
  };
  changePlayerGameClass(session, className);
  updatePlayerStats(session);
  return session;
}

for (const level of levels) {
  const zone = getZones().reduce((best, zone) => (Math.abs(zone.level - level) < Math.abs(best.level - level) ? zone : best));
  const session = hero(level);
  const stats = session.game.gameClass.stats;
  let now = 1_700_000_000_000;
  let kills = 0, casts = 0, seconds = 0, deaths = 0, hpLost = 0, expLevels = 0;
  for (let n = 0; n < 40; n += 1) {
    stats.hp = getMaxHp(session, session.game.gameClass);
    stats.mp = session.game.gameClass.stats.maxMp ?? stats.mp;
    const hpStart = getCurrentHp(session, session.game.gameClass);
    session.game.respawnTime = 0;
    const started = startHunt(session, zone.id, {now, champion: null});
    if (!started.ok) { console.log('start failed', started.reason); break; }
    let fightCasts = 0;
    for (let t = 0; t < 600 && ensureHunt(session).mob; t += 1) {
      now += 1000;
      const skills = session.game.gameClass.skills;
      // the strongest damage skill that is ready
      const order = skills.map((skill, index) => ({skill, index})).filter(({skill}) => skill.isDealDamage).sort((a, b) => (b.skill.damageModifier || 1) - (a.skill.damageModifier || 1));
      for (const {index} of order) {
        const result = useHuntSkill(session, index, {now});
        if (result.ok) {
          fightCasts += 1;
          if (result.killed) { kills += 1; expLevels += result.rewards.exp / Math.max(1, levelNeed(level)); }
          break;
        }
      }
      seconds += 1;
    }
    casts += fightCasts;
    hpLost += (hpStart - getCurrentHp(session, session.game.gameClass)) / hpStart;
    if (ensureHunt(session).mob === null && session.game.respawnTime > now) deaths += 1;
    now += 3000; // looking for the next mob
  }
  console.log(`${className} L${level} in ${zone.title} (L${zone.level}): kills ${kills}/40, ${kills ? (casts / kills).toFixed(1) : '-'} casts, ${kills ? (seconds / kills).toFixed(1) : '-'} s per kill, HP lost ${(hpLost / 40 * 100).toFixed(1)}% per fight, deaths ${deaths}, exp ${kills ? (expLevels / kills * 100).toFixed(2) : '-'}% of a level per kill (rate x5, vitality full)`);
}
