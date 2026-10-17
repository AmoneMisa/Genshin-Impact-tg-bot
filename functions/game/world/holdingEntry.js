import {CITIES} from '../../../template/worldMap.js';
export const ENTRANCE_SIZE=2000;
export function outdoorPoint(session){
 const w=session.game.world,city=CITIES.find(c=>c.id===w.city);
 if(w.mode==='entrance'&&w.entryOrigin)return {x:w.entryOrigin.x+(w.x-.5)*ENTRANCE_SIZE,y:w.entryOrigin.y+(w.y-.5)*ENTRANCE_SIZE};
 if(w.mode==='city'&&city)return {x:city.x+(w.x-.5)*(city.size||14000),y:city.y+(w.y-.5)*(city.size||14000)};
 return null;
}
export function atHoldingEntrance(session,holding){
 const point=outdoorPoint(session),entry=holding?.entry;
 return Boolean(point&&entry&&Math.hypot(point.x-entry.x,point.y-entry.y)<=180);
}
export function arriveHoldingEntrance(session,holding,now){
 if(!holding?.entry)return false;
 Object.assign(session.game.world,{mode:'entrance',city:holding.region,holding:holding.id,x:.5,y:.5,z:holding.entry.z,
  entryOrigin:{x:holding.entry.x,y:holding.entry.y,z:holding.entry.z},path:[],pending:null,channel:null,readyHolding:holding.id,moveAt:now});
 return true;
}
export function enterHolding(session,holding,mode,now){
 if(!holding.entry)return {ok:false,reason:'holding_entry_missing'};
 if(!atHoldingEntrance(session,holding))return {ok:false,reason:'holding_region_required'};
 const w=session.game.world;
 w.holdingReturn={mode:w.mode,city:w.city,x:w.x,y:w.y,z:w.z,holding:w.holding||null,entryOrigin:w.entryOrigin||null};
 Object.assign(w,{mode,holding:holding.id,x:.5,y:mode==='hall'?.9:.95,path:[],pending:null,channel:null,readyHolding:null,moveAt:now});
 return {ok:true};
}
export function leaveHolding(session,holding,{force=false,now=Date.now()}={}){
 const w=session.game.world,doorY=w.mode==='hall'?.9:.95;
 if(!force&&(!['hall','stronghold','siege'].includes(w.mode)||w.holding!==holding?.id||Math.hypot(w.x-.5,w.y-doorY)>.1))return {ok:false,reason:'entrance_required'};
 const back=w.holdingReturn;
 if(back)Object.assign(w,back,{path:[],pending:null,channel:null,moveAt:now,readyHolding:holding.id});
 else if(!arriveHoldingEntrance(session,holding,now))return {ok:false,reason:'holding_entry_missing'};
 delete w.holdingReturn;return {ok:true};
}
