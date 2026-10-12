import {isPlayerOnline} from './onlinePresence.js';
import getCurrentHp from './getters/getCurrentHp.js';
import getCurrentMp from './getters/getCurrentMp.js';
import getCurrentCp from './getters/getCurrentCp.js';
import getMaxHp from './getters/getMaxHp.js';
import getMaxMp from './getters/getMaxMp.js';
import getMaxCp from './getters/getMaxCp.js';
import {l2RawStat} from './l2Effects.js';
const resources={hp:{current:getCurrentHp,max:getMaxHp,stat:'regHp',battle:.35},mp:{current:getCurrentMp,max:getMaxMp,stat:'regMp',battle:1},cp:{current:getCurrentCp,max:getMaxCp,stat:'regCp',battle:.2}};
/** One scheduler tick: no offline accumulation and no regeneration on a corpse. */
export function regenerateResource(session, kind, now = Date.now()) {
  const stats=session?.game?.gameClass?.stats, def=resources[kind];
  if(!stats||!def||!isPlayerOnline(session,now)||stats.hp<=0||session.game.respawnTime>now)return false;
  const current=def.current(session),max=def.max(session);
  let rate=(Number(stats[kind+'RestoreSpeed'])||0)*l2RawStat(session,def.stat,true)+l2RawStat(session,def.stat,false);
  if(session.game.stats?.inFightTimer>now)rate*=def.battle;
  const next=Math.min(max,Math.max(0,current)+Math.max(0,rate));
  if(next===stats[kind])return false;
  stats[kind]=next;session.needsSave=true;return true;
}
