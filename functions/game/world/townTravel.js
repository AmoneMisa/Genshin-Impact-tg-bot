import {TOWN_TELEPORTS} from '../../../template/townTeleports.js';
import {teleportPrice} from '../runes/labRunes.js';
import {activeProfessionIndex} from '../player/classProgression.js';
import {graciaTownQuote} from './graciaTravel.js';
// TeleportHolder.shouldPayFee / calculateFee, pinned H5. Calendar follows server local time.
export function normalTeleportFee(session,fee,now=Date.now()){
 if(Number(session.game.stats?.lvl)<=40&&activeProfessionIndex(session)===0)return 0;
 const date=new Date(now),day=date.getDay();
 const base=date.getHours()>=20&&(day===1||day===2)?Math.floor(fee/2):fee;
 return teleportPrice(session,base,now);
}
export function townTravelQuote(session,target,now=Date.now()){
 const gracia=graciaTownQuote(session,target,now);if(gracia)return gracia;
 const from=session.game.world?.city;
 if((from==='dion'&&target==='floran')||(from==='floran'&&target==='dion'))return {mode:'walk',gold:0};
 const route=TOWN_TELEPORTS[from]?.[target];
 return route&&route.item===57?{...route,mode:'teleport',gold:normalTeleportFee(session,route.fee,now)}:null;
}
