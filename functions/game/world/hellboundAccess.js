import source from '../../../template/hellboundAccess.js';
import {CITIES,CITY_NPCS} from '../../../template/worldMap.js';
import {nativeWorldPoint,nativeIsland} from './nativeTravel.js';
import {outdoorPoint} from './holdingEntry.js';
import {nativeTownSource} from './nativeTownGraph.js';
import {hellboundStage} from '../hunt/sourcePopulation.js';
import {normalTeleportFee} from './townTravel.js';
import {geoRegionId} from './l2jGeodata.js';

export function hellboundPlayerPoint(session){
 const w=session.game.world;if(!w||w.instanceId||w.walkHome?.kind==='ferry'||w.walkHome?.kind==='airship')return null;
 const native=nativeWorldPoint(session);if(native)return native;
 if(w.mode!=='city')return null;
 const point=outdoorPoint(session),city=CITIES.find(c=>c.id===w.city);if(!point)return null;
 const z=Number.isFinite(w.z)?w.z:city?.z??nativeTownSource(w.city)?.z;
 return Number.isFinite(z)?{...point,z}:null;
}
export const hellboundNpc=id=>source.npcs.find(n=>n.id===id)||null;
export function nearHellboundNpc(session,npc){const p=hellboundPlayerPoint(session);return Boolean(p&&npc&&Math.hypot(p.x-npc.x,p.y-npc.y,p.z-npc.z)<=source.interactionDistance);}
export function hellboundApproachQuote(session,now){
 const route=source.approach,keeper=CITY_NPCS.find(n=>n.city===route.city&&n.npcId===route.npcId&&n.gateway);
 return {city:route.city,gold:normalTeleportFee(session,route.fee,now),gatekeeper:keeper?.id,near:Boolean(session.game.world?.mode==='city'&&session.game.world.city===route.city&&nearHellboundNpc(session,keeper)),inCity:session.game.world?.mode==='city'&&session.game.world.city===route.city};
}
const quest=session=>session.game.worldQuests?.[130];
export function hellboundEscapePoint(session,random=Math.random){
 const point=hellboundPlayerPoint(session);if(!point||!source.escape.regions.includes(geoRegionId(point.x,point.y)))return null;
 return {...source.escape.points[Math.min(source.escape.points.length-1,Math.floor(random()*source.escape.points.length))]};
}
export function hellboundAdmission(session){
 if(!hellboundPlayerPoint(session))return 'hellbound_ground_required';
 if(hellboundStage(session)<=0)return 'hellbound_locked';
 if(source.requiresQuest&&!quest(session)?.completedAt&&!session.game.worldQuests?.[133]?.completedAt)return 'hellbound_quest_required';
 return null;
}
export function hellboundNpcAction(session,id,event,now){
 const npc=hellboundNpc(id);if(!npc)return {ok:false,reason:'unknown_npc'};
 if(!nearHellboundNpc(session,npc))return {ok:false,reason:'npc_too_far'};
 if(npc.npcId===32314){
  if(event!=='enter')return {ok:false,reason:'invalid_action'};
  const denied=hellboundAdmission(session);return denied?{ok:false,reason:denied}:{ok:true,portal:{...source.entry},npc:id};
 }
 const q=quest(session);if(q?.completedAt)return {ok:false,reason:'quest_completed'};
 if(event==='start'&&npc.npcId===30612&&!q){
  if(Number(session.game.stats?.lvl)<source.quest.minimumLevel)return {ok:false,reason:'hellbound_level_required'};
  if(hellboundStage(session)<=0)return {ok:false,reason:'hellbound_locked'};
  (session.game.worldQuests||={})[130]={condition:1,startedAt:now,items:{}};return {ok:true};
 }
 if(event==='report'&&npc.npcId===32292&&q?.condition===1){q.condition=2;return {ok:true};}
 if(event==='crystal'&&npc.npcId===30612&&q?.condition===2){(q.items||={})[12823]=1;q.condition=3;return {ok:true};}
 if(event==='complete'&&npc.npcId===32292&&q?.condition===3){
  if(!(q.items?.[12823]>0))return {ok:false,reason:'quest_item_required'};
  delete q.items[12823];q.completedAt=now;delete q.condition;return {ok:true};
 }
 return {ok:false,reason:'quest_step_required'};
}
export function hellboundAccessDto(session,now=Date.now()){
 const q=quest(session),stage=hellboundStage(session),condition=q?.condition||0,level=Number(session.game.stats?.lvl)||0;
 const text=q?.completedAt?'Путь на Хеллбаунд открыт.':condition===1?'Поговорите с Галате в Хейне.':condition===2?'Вернитесь к Касиану за кристаллом.':condition===3?'Передайте кристалл Касиана Галате.':'Путь на Хеллбаунд начинается у Касиана.';
 return {stage,approach:hellboundApproachQuote(session,now),quest:{id:130,condition,completed:Boolean(q?.completedAt),text,items:q?.items?.[12823]>0?[{id:12823,name:source.quest.itemName,count:q.items[12823]}]:[]},npcs:source.npcs.map(n=>{
  const near=nearHellboundNpc(session,n),actions=[];
  if(n.npcId===32314)actions.push({event:'enter',label:'Войти на Хеллбаунд',reason:hellboundAdmission(session)});
  else if(n.npcId===30612&&!q)actions.push({event:'start',label:'Начать путь на Хеллбаунд',reason:level<source.quest.minimumLevel?'hellbound_level_required':stage<=0?'hellbound_locked':null});
  else if(n.npcId===32292&&condition===1)actions.push({event:'report',label:'Узнать о проходе на Хеллбаунд'});
  else if(n.npcId===30612&&condition===2)actions.push({event:'crystal',label:'Получить кристалл Касиана'});
  else if(n.npcId===32292&&condition===3)actions.push({event:'complete',label:'Передать кристалл Галате',reason:q.items?.[12823]>0?null:'quest_item_required'});
  return {...n,near,text,canWalk:Boolean(hellboundPlayerPoint(session)&&!nativeIsland(session)),actions:actions.map(a=>({...a,enabled:near&&!a.reason}))};
 })};
}
