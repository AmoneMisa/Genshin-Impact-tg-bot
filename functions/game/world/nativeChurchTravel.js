import data from '../../../template/paganChurchRoute.js';
import routes from '../../../template/nativeRoutes.js';
import {worldGeodata} from './l2jGeodata.js';
import {nativeActorPoint} from './nativeFieldSpace.js';
import {nativeGroundFor} from './nativeGround.js';
import {nativeFallEdge} from './nativeFalling.js';
import {findNativePath} from './nativeNavigation.js';
import {createNativeJourney} from './nativeJourney.js';
import {nativeFallBody,scheduleNativeFallDamage} from './nativeFallDamage.js';
import getSpeed from '../player/getters/getSpeed.js';
import {l2ActionBlock,l2MoveMultiplier} from '../player/l2Effects.js';
import {ROOM_SIZE} from './navigation.js';

const valid=()=>data.source.geodataCommit===worldGeodata.manifest.commit&&data.source.barriersSha256===routes.barriersSha256&&Object.entries(data.source.regions).every(([id,sha])=>worldGeodata.manifest.regions[id]?.sha256===sha);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function nativeChurchOptions(hunt){
 const f=hunt?.field;if(hunt?.zone!=='pagan-temple'||!f?.native||![3,4].includes(f.native.sourceFloor))return [];
 if(f.native.sourceFloor===4&&f.native.z<=data.mirror.z+40)return [];
 return [{floor:4,title:f.native.sourceFloor===3?'Спуститься к зеркалу Триола':'Продолжить спуск к зеркалу Триола',mode:'drop',enabled:valid()&&!f.native.journey&&!f.action}];
}
export function beginNativeChurchTravel(session,now,speed){
 const hunt=session.game.hunt,f=hunt?.field,point=nativeActorPoint(f);
 if(!valid()||!nativeFallBody(session))return {ok:false,reason:'geodata_missing'};
 if(hunt.zone!=='pagan-temple'||![3,4].includes(f?.native?.sourceFloor)||!point||session.game.world.instanceId)return {ok:false,reason:'invalid_floor'};
 const allowed=nativeGroundFor(session,now),walks=data.stages.map((stage,index)=>({stage,index})).filter(s=>s.stage.kind==='walk').sort((a,b)=>distance(point,a.stage.to)-distance(point,b.stage.to));
 for(const {stage,index}of walks){
  if(distance(point,stage.to)>8192)continue;
  const plan=findNativePath(point,stage.to,{allowed,stride:1,maxNodes:6000,margin:128,heuristicWeight:2,reversible:true});if(!plan.ok)continue;
  const trip=createNativeJourney(plan.start,plan.path.length?plan.path:[stage.to],{now,speed,allowed});if(!trip)continue;
  trip.native.historyStart={...plan.start};trip.native.churchNextStage=index+1;return {ok:true,trip};
 }
 return {ok:false,reason:'path_blocked'};
}
/** The server consumes one derived ledge at a time. No flight time is invented:
 * position changes use the original stored lower floor; the H5 damage task has
 * its own source delay. Each walking section retains ordinary geodata checks. */
export function advanceNativeChurchTravel(session,now){
 const hunt=session.game.hunt,f=hunt?.field,index=f?.native?.churchPendingStage;
 if(hunt?.zone!=='pagan-temple'||!Number.isInteger(index)||f.native.journey)return;
 if(!valid()){delete f.native.churchPendingStage;return;}
 if(l2ActionBlock(session,{move:true},now)||session.game.gameClass?.stats?.hp<=0)return;
 let stage=data.stages[index],next=index;
 if(!stage){delete f.native.churchPendingStage;f.native.sourceFloor=4;return;}
 const allowed=nativeGroundFor(session,now),point=nativeActorPoint(f);
 if(distance(point,stage.from)>1e-5){delete f.native.churchPendingStage;return;}
 if(stage.kind==='fall'){
  if(!nativeFallEdge(stage.from,stage.to,{allowed})){delete f.native.churchPendingStage;return;}
  Object.assign(f,{x:stage.to.x/ROOM_SIZE,y:stage.to.y/ROOM_SIZE,path:[],moveAt:now});f.native.z=stage.to.z;f.native.sourceFloor=4;
  scheduleNativeFallDamage(session,stage.height,now);session.needsSave=true;stage=data.stages[++next];
 }
 if(!stage){delete f.native.churchPendingStage;return;}
 if(stage.kind!=='walk'){f.native.churchPendingStage=next;return;}
 const trip=createNativeJourney(stage.from,stage.path,{now,speed:getSpeed(session)*l2MoveMultiplier(session,now),allowed});
 if(!trip){delete f.native.churchPendingStage;return;}
 trip.native.historyStart={...stage.from};trip.native.churchNextStage=next+1;f.native.journey=trip;delete f.native.churchPendingStage;
}
