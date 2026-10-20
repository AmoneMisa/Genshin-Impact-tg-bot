// Request-scoped authoritative holdings. Never persist or accept this from a client.
import rules from '../../../template/teleportRules.js';
const contexts=new WeakMap();
export async function withTeleportSieges(session,records,work){
 const prior=contexts.get(session);contexts.set(session,records);
 try{return await work();}finally{if(prior)contexts.set(session,prior);else contexts.delete(session);}
}
export function teleportCastleAllowed(session,castleIds,now){
 if(rules.teleportWhileSiegeInProgress||!castleIds?.length)return true;
 const records=contexts.get(session);if(!records)return false;
 return castleIds.every(id=>{const siege=records.find(r=>r._id==='castle:'+id)?.siege;return !siege||siege.settled||now<siege.startsAt||now>=siege.endsAt;});
}
export const locationTeleportAllowed=(session,location,now)=>teleportCastleAllowed(session,[...new Set((location.entryRoutes||[]).flatMap(r=>r.castleIds||[]))],now);
