import {normalTeleportFee} from './townTravel.js';
import {teleportPrice} from '../runes/labRunes.js';
import {teleportCastleAllowed} from './teleportSieges.js';
/** Town NPCs may only offer their own original H5 route and fee. */
export function locationTravelQuote(session,location,npc,now=Date.now()){
 if(!npc?.gateway)return null;
 if(!location.entryRoutes)return {gold:teleportPrice(session,location.teleportGold,now),item:57,count:0};
 const route=location.entryRoutes.find(r=>r.npcName===npc.name&&r.type==='NORMAL')||location.entryRoutes.find(r=>r.npcName===npc.name);
 if(!route)return null;
 if(!teleportCastleAllowed(session,route.castleIds,now))return null;
 if(route.type.startsWith('NOBLES')&&!session.game.isNoble)return null;
 return {gold:route.item===57?(route.type==='NORMAL'?normalTeleportFee(session,route.fee,now):teleportPrice(session,route.fee,now)):0,item:route.item,count:route.fee,source:route.source};
}
