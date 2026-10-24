import npcRoutes from '../../../template/nativeNpcRoutes.js';
import routes from '../../../template/nativeRoutes.js';
import {nativeSegment} from './nativeNavigation.js';
import {worldGeodata} from './l2jGeodata.js';
import data from '../../../template/nativeFloorTransports.js';
import {LOCATION_LEVELS} from '../../../template/locationLevels.js';
import {nativeActorPoint} from './nativeFieldSpace.js';
import {findNativePath} from './nativeNavigation.js';
import {nativeGroundFor} from './nativeGround.js';
import {createNativeJourney} from './nativeJourney.js';
import {teleportCastleAllowed} from './teleportSieges.js';

const context=hunt=>hunt?.field?.native?.outside?'entrance':hunt?.field?.native?.sourceFloor;
export const nativeFloorPorts=hunt=>{const p=data.zones[hunt?.zone]?.[context(hunt)];return p?(Array.isArray(p)?p:[p]):[];};
export const nativeFloorPort=hunt=>nativeFloorPorts(hunt)[0];
export const nativeWalkingExitAvailable=hunt=>!hunt?.field?.native||!data.walkingExits[hunt.zone]||data.walkingExits[hunt.zone].includes(context(hunt));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const identity=(p,t)=>`${p.npcId}:${t.list}:${t.index}`;
export function nativeFloorGuides(hunt){
 const point=nativeActorPoint(hunt?.field);if(!point)return [];
 return nativeFloorPorts(hunt).map(port=>{
  const npc=LOCATION_LEVELS[hunt.zone].floors.flatMap(f=>f.npcs||[]).find(n=>Number(n.id)===port.npcId);
  return {npcId:port.npcId,name:port.name||npc?.name||String(port.npcId),near:distance(point,port.point)<=data.interactionDistance};
 });
}
export const nativeFloorGuide=hunt=>nativeFloorGuides(hunt)[0]||null;
export function nativePortOptions(hunt){
 const ports=nativeFloorPorts(hunt),guides=nativeFloorGuides(hunt);if(!ports.length)return [];
 const model=LOCATION_LEVELS[hunt.zone];
 const targets=ports.flatMap((port,i)=>port.targets.map(t=>({floor:t.floor,title:t.floor===0?'Вход в локацию':model.floors.find(f=>f.number===t.floor).title,routeId:identity(port,t),mode:'teleport',enabled:guides[i].near&&!t.scenarioRequired,...(t.floor===hunt.field.native.sourceFloor&&!hunt.field.native.outside?{title:'К северному залу'}:{})})));
 if(!hunt.field.native.outside&&!targets.some(t=>t.floor===hunt.field.native.sourceFloor))targets.push({floor:hunt.field.native.sourceFloor,title:model.floors.find(f=>f.number===hunt.field.native.sourceFloor).title,mode:'teleport',enabled:false});
 return targets;
}
/** The request selects a pinned route; NPC, destination and fee stay server-owned. */
export function nativeFloorTeleport(session,floor,now,routeId){
 const hunt=session.game.hunt,ports=nativeFloorPorts(hunt);
 const port=ports.find(p=>p.targets.some(t=>t.floor===floor&&(!routeId||identity(p,t)===routeId))),target=port?.targets.find(t=>t.floor===floor&&(!routeId||identity(port,t)===routeId));
 if(!target)return routeId?{ok:false,reason:'invalid_floor'}:null;
 if(target.scenarioRequired)return {ok:false,reason:'epic_entry_required'};
 if(distance(nativeActorPoint(hunt.field),port.point)>data.interactionDistance)return {ok:false,reason:'npc_too_far'};
 if(hunt.field.action||session.game.world.channel||session.game.sitting||session.game.storeMode)return {ok:false,reason:'npc_interaction_blocked'};
 if(port.maxLevel&&session.game.stats.lvl>port.maxLevel)return {ok:false,reason:'npc_level_limit'};
 if(port.normal&&!data.normalKarmaAllowed&&session.game.karma>0)return {ok:false,reason:'karma_gatekeeper'};
 if(!teleportCastleAllowed(session,port.castleIds,now))return {ok:false,reason:'quick_travel_siege'};
 if(target.fee!==0||target.item!==57)return {ok:false,reason:'not_allowed'};
 const points=[target.point,...target.alternatives||[]],point=points[Math.floor(Math.random()*points.length)];
 return {ok:true,point,floor:target.floor||1,outside:target.floor===0};
}
export function nativeGuideTravel(session,now,speed,npcId){
 const hunt=session.game.hunt,ports=nativeFloorPorts(hunt),port=npcId==null?ports[0]:ports.find(p=>p.npcId===Number(npcId)),from=nativeActorPoint(hunt?.field);if(!port||!from)return {ok:false,reason:'unknown_npc'};
 if(distance(from,port.point)<=data.interactionDistance)return {ok:false,reason:'npc_already_near'};
 const allowed=nativeGroundFor(session);let plan=findNativePath(from,port.point,{allowed,stride:2,maxNodes:6000,margin:128,heuristicWeight:2,reversible:true});
 if(!plan.ok&&npcRoutes.geodataCommit===routes.geodataCommit&&npcRoutes.barriersSha256===routes.barriersSha256){
  const candidates=[];
  for(const r of npcRoutes.zones[hunt.zone]||[])if(r.npcId===port.npcId&&String(context(hunt))===r.floor){
   const vertices=[r.from,...r.path];for(let i=0;i<vertices.length;i++)candidates.push({point:vertices[i],suffix:vertices.slice(i+1),distance:distance(from,vertices[i])});
  }
  candidates.sort((a,b)=>a.distance-b.distance);
  for(const c of candidates.slice(0,64))if(c.distance<=8192&&nativeSegment(from,c.point,{allowed,reversible:true})){plan={ok:true,start:from,path:[c.point,...c.suffix]};break;}
  if(!plan.ok)for(const c of candidates.slice(0,6)){
   if(c.distance>8192)continue;
   const join=findNativePath(from,c.point,{allowed,stride:2,maxNodes:1000,margin:128,heuristicWeight:2,reversible:true});if(join.ok){plan={...join,path:[...join.path,...c.suffix]};break;}
  }
 }
 if(!plan.ok)return plan;const start=worldGeodata.point(plan.start);if(!start)return {ok:false,reason:'path_blocked'};
 const trip=createNativeJourney(start,plan.path,{now,speed,allowed});if(!trip)return {ok:false,reason:'path_blocked'};
 trip.native.historyStart={...start};return {ok:true,trip};
}
