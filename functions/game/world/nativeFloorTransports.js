import data from '../../../template/nativeFloorTransports.js';
import {LOCATION_LEVELS} from '../../../template/locationLevels.js';
import {nativeActorPoint} from './nativeFieldSpace.js';
import {findNativePath} from './nativeNavigation.js';
import {nativeGroundFor} from './nativeGround.js';
import {createNativeJourney} from './nativeJourney.js';
import {teleportCastleAllowed} from './teleportSieges.js';

export const nativeFloorPort=hunt=>data.zones[hunt?.zone]?.[hunt?.field?.native?.sourceFloor];
export const nativeWalkingExitAvailable=hunt=>!hunt?.field?.native||!data.walkingExits[hunt.zone]||data.walkingExits[hunt.zone].includes(hunt.field.native.sourceFloor);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function nativeFloorGuide(hunt){
 const port=nativeFloorPort(hunt),point=nativeActorPoint(hunt?.field);if(!port||!point)return null;
 const npc=LOCATION_LEVELS[hunt.zone].floors.flatMap(f=>f.npcs||[]).find(n=>Number(n.id)===port.npcId);
 return {name:npc?.name||String(port.npcId),near:distance(point,port.point)<=data.interactionDistance};
}
export function nativePortOptions(hunt){
 const port=nativeFloorPort(hunt),guide=nativeFloorGuide(hunt);if(!port||!guide)return [];
 const model=LOCATION_LEVELS[hunt.zone];
 return [...port.targets.map(t=>({floor:t.floor,title:model.floors.find(f=>f.number===t.floor).title,mode:'teleport',enabled:guide.near})),{floor:hunt.field.native.sourceFloor,title:model.floors.find(f=>f.number===hunt.field.native.sourceFloor).title,mode:'teleport',enabled:false}];
}
/** Only exact pinned inner lists are accepted; no request supplies an NPC or XYZ. */
export function nativeFloorTeleport(session,floor,now){
 const hunt=session.game.hunt,port=nativeFloorPort(hunt),target=port?.targets.find(t=>t.floor===floor);
 if(!target)return null;
 if(!nativeFloorGuide(hunt)?.near)return {ok:false,reason:'npc_too_far'};
 if(hunt.field.action||session.game.world.channel||session.game.sitting||session.game.storeMode)return {ok:false,reason:'npc_interaction_blocked'};
 if(port.normal&&!data.normalKarmaAllowed&&session.game.karma>0)return {ok:false,reason:'karma_gatekeeper'};
 if(!teleportCastleAllowed(session,port.castleIds,now))return {ok:false,reason:'quick_travel_siege'};
 if(target.fee!==0||target.item!==57)return {ok:false,reason:'not_allowed'};
 return {ok:true,point:target.point,floor:target.floor};
}
export function nativeGuideTravel(session,now,speed){
 const hunt=session.game.hunt,port=nativeFloorPort(hunt),from=nativeActorPoint(hunt?.field);if(!port||!from)return {ok:false,reason:'unknown_npc'};
 if(nativeFloorGuide(hunt)?.near)return {ok:false,reason:'npc_already_near'};
 const allowed=nativeGroundFor(session),plan=findNativePath(from,port.point,{allowed,stride:2,maxNodes:6000,margin:128,heuristicWeight:2,reversible:true});
 if(!plan.ok)return plan;const trip=createNativeJourney(plan.start,plan.path,{now,speed,allowed});if(!trip)return {ok:false,reason:'path_blocked'};
 trip.native.historyStart={...plan.start};return {ok:true,trip};
}
