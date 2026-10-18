import {ZAKEN_SHIP,locationLevel} from '../hunt/locationLevels.js';
import {buildMob,getZone,getMobDef} from '../hunt/huntMobs.js';
import {nearestOpenPoint} from './navigation.js';
import {roomById} from '../hunt/huntRooms.js';

const deckOf=room=>4+Math.floor((room-1)/5);
const roomOf=number=>locationLevel('devils-isle',deckOf(number)).rooms.find(r=>r.sourceRoom===number);
export function candleRoom(id){
 const index=ZAKEN_SHIP.rooms.findIndex(r=>r[3]===id||r[4]===id);
 return index>=0?index+1:({6:3,7:3,18:8,19:8,30:13,31:13})[id]||null;
}
export function shipInstance(session){
 const w=session.game.world,instance=w?.instanceId&&session.ownerDocument?.().game?.worldInstances?.[w.instanceId];
 return instance?.kind==='zaken-ship'&&instance.members.includes(String(session.userId))?instance:null;
}
export function createShipVoyage(id,members,now,random=Math.random){
 return {id,kind:'zaken-ship',location:'devils-isle',createdAt:now,until:now+ZAKEN_SHIP.durationMs,members:members.map(m=>String(m.userId)),rooms:{},secretRoom:1+Math.min(14,Math.floor(random()*15)),candles:{},revealAt:null,revealed:false};
}
function bucket(instance,number){const room=roomOf(number);return instance.rooms[`${deckOf(number)}:${room.id}`]||={mobs:[],respawns:[]};}
function spawnAdds(instance,number,ids,now,random){
 const zone=getZone('devils-isle'),room=roomById(zone,roomOf(number).id,deckOf(number)),target=bucket(instance,number);
 const source=ZAKEN_SHIP.rooms[number-1];
 for(const [i,id] of ids.entries()){
  const mob=buildMob(zone,getMobDef(zone,id),{now,random,champion:null});
  const angle=(target.mobs.length+i)*2.39996;
  target.mobs.push({...mob,...nearestOpenPoint({x:.5+Math.cos(angle)*.22,y:.5+Math.sin(angle)*.22},room.walls),instanceId:`${instance.id}:c${Object.keys(instance.candles).length}:${number}:${target.mobs.length}`,sourcePosition:{x:source[0]+Math.floor(random()*350),y:source[1]+Math.floor(random()*350),z:source[2]},aggro:true,buffs:[]});
 }
}
export function tickShip(instance,now,random=Math.random){
 if(instance?.kind!=='zaken-ship'||instance.until<=now)return;
 const blue=ZAKEN_SHIP.rooms[instance.secretRoom-1].slice(3);
 for(const [raw,candle] of Object.entries(instance.candles))if(!candle.settled&&candle.at+ZAKEN_SHIP.burnDelayMs<=now){
  candle.settled=true;
  if(!blue.includes(Number(raw)))spawnAdds(instance,candleRoom(Number(raw)),ZAKEN_SHIP.ordinaryNpcIds,now,random);
 }
 if(instance.revealAt&&instance.revealAt<=now&&!instance.revealed){instance.revealed=true;spawnAdds(instance,instance.secretRoom,ZAKEN_SHIP.ordinaryNpcIds.filter(id=>id!=='29024'),now,random);}
}
function candlePoint(id){
 const peers=Array.from({length:36},(_,i)=>i+1).filter(n=>candleRoom(n)===candleRoom(id));
 const angle=2*Math.PI*peers.indexOf(id)/peers.length;
 return {x:.5+Math.cos(angle)*.32,y:.5+Math.sin(angle)*.32};
}
export function lightShipCandle(session,id,now){
 const instance=shipInstance(session),field=session.game.hunt?.field;
 if(!instance||instance.until<=now||!Number.isInteger(id)||id<1||id>36)return {ok:false,reason:'ship_required'};
 const number=candleRoom(id),point=candlePoint(id);
 if(field?.floor!==deckOf(number)||field.room!==roomOf(number).id||Math.hypot(field.x-point.x,field.y-point.y)>.1)return {ok:false,reason:'candle_too_far'};
 if(instance.candles[id])return {ok:false,reason:'candle_already_lit'};
 instance.candles[id]={at:now,settled:false};
 const blue=ZAKEN_SHIP.rooms[instance.secretRoom-1].slice(3);
 if(blue.every(n=>instance.candles[n]))instance.revealAt=now+ZAKEN_SHIP.revealDelayMs;
 tickShip(instance,now);return {ok:true};
}
export function shipDto(session,now){
 const instance=shipInstance(session),field=session.game.hunt?.field;
 if(!instance||instance.until<=now||field?.floor<4)return null;
 const blue=ZAKEN_SHIP.rooms[instance.secretRoom-1].slice(3);
 const candles=Array.from({length:36},(_,i)=>i+1).filter(id=>deckOf(candleRoom(id))===field.floor&&roomOf(candleRoom(id)).id===field.room).map(id=>{
  const lit=instance.candles[id],point=candlePoint(id);
  return {id,...point,state:!lit?'unlit':now<lit.at+ZAKEN_SHIP.burnDelayMs?'burning':blue.includes(id)?'blue':'red',near:Math.hypot(field.x-point.x,field.y-point.y)<=.1};
 });
 const boss=instance.revealed&&field.floor===deckOf(instance.secretRoom)&&field.room===roomOf(instance.secretRoom).id?{id:'zaken',point:{x:.5,y:.5}}:null;
 return {until:instance.until,candles,blue:blue.filter(id=>instance.candles[id]?.settled).length,boss};
}
export function locationBossGate(session,name,now=Date.now()){
 const w=session.game.world,field=session.game.hunt?.field;
 if(w?.mode!=='location'||!field||session.game.hunt.zone!==w.location)return false;
 const level=locationLevel(w.location,field.floor);
 if(name==='zaken')return Boolean(shipDto(session,now)?.boss)&&Math.hypot(field.x-.5,field.y-.5)<=.1;
 return level?.boss===name&&field.room===(level.bossRoom||level.startId)&&Math.hypot(field.x-.5,field.y-.5)<=.1;
}
