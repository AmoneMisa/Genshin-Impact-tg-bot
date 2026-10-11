import getClassStats from './getters/getGameClassStatsFromTemplate.js';
import {L2_STATS_VERSION} from './l2BaseStats.js';
export function migrateBaseStats(session) {
    if(session.game.baseStatsVersion===L2_STATS_VERSION)return false;
    const stats=session.game.gameClass?.stats;
    if(!stats)return false;
    const next=getClassStats(stats.name,session.game.stats?.lvl||1);
    if(next.l2Id===undefined)return false;
    const resources=Object.fromEntries(['hp','mp','cp'].map(key=>{
        const maximum='max'+key[0].toUpperCase()+key[1];
        const share=Math.max(0,Math.min(1,(Number(stats[key])||0)/Math.max(1,Number(stats[maximum])||1)));
        return [key,Math.round(next[maximum]*share)];
    }));
    Object.assign(stats,next,resources);
    session.game.baseStatsVersion=L2_STATS_VERSION;
    return true;
}
