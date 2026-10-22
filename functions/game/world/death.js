import {recordDeath} from '../player/deathPenalties.js';
import holdings from '../../../template/worldHoldings.js';
import {hallState} from './hall.js';
import {restoreRevivalVitals} from '../player/revivalVitals.js';
import getMaxHp from '../player/getters/getMaxHp.js';
import getMaxMp from '../player/getters/getMaxMp.js';
import getMaxCp from '../player/getters/getMaxCp.js';
import {CITIES} from '../../../template/worldMap.js';
import {ensureCityOrigin} from './cityNavigation.js';
import {nativeFieldBuckets} from './nativeFieldSpace.js';

export function markWorldDeath(session,now=Date.now()){
 const w=session.game.world;if(!w||session.game.gameClass?.stats?.hp>0)return;
 recordDeath(session,{now,siege:w.mode==='siege'});
 w.died=true;w.death||={at:now};w.path=[];w.pending=null;w.channel=null;
 const f=session.game.hunt?.field;
 if(f){f.path=[];if(f.native)delete f.native.journey;delete f.pendingRoom;for(const m of f.native?nativeFieldBuckets(f).flatMap(b=>b.mobs):f.mobs||[])m.aggro=false;}
}
export function deathChoices(session,clan,records=[],now=Date.now()){
 const choices=[{id:'city',label:'В город'}];
 const cid=clan&&String(clan._id);
 if(!cid)return choices;
 const hall=holdings.find(h=>h.kind==='hall'&&hallState(session,clan,h,records.find(r=>r._id===h.id),now).allowed);
 if(hall)choices.push({id:hall.id,label:'В клан холл',name:hall.name});
 // Castle wins precedence for old inconsistent saves; settlement prevents new conflicts.
 const stronghold=['castle','fort'].map(kind=>holdings.find(h=>h.kind===kind&&records.find(r=>r._id===h.id)?.owner?.clanId===cid)).find(Boolean);
 if(stronghold)choices.push({id:stronghold.id,label:stronghold.kind==='castle'?'В замок':'В форт',name:stronghold.name});
 return choices;
}
export function respawnWorld(session,destination,clan,records=[],now=Date.now()){
 if(session.game.gameClass?.stats?.hp>0)return {ok:false,reason:'not_dead'};
 if(!deathChoices(session,clan,records,now).some(c=>c.id===destination))return {ok:false,reason:'respawn_destination_unavailable'};
 const w=session.game.world,h=holdings.find(h=>h.id===destination),stats=session.game.gameClass.stats;
 const spawnY=h?(h.kind==='hall'?0.9:0.95):0.5;
 Object.assign(w,{mode:h?(h.kind==='hall'?'hall':'stronghold'):'city',city:h?.region||w.city,location:null,holding:h?.id||null,instanceId:null,x:.5,y:spawnY,path:[],moveAt:now,pending:null,channel:null,readyHolding:null});
 delete w.death;delete w.died;delete w.walkHome;delete w.holdingReturn;delete w.entryOrigin;
 delete w.cityWalk;delete w.nativePosition;delete w.z;
 if(!h)ensureCityOrigin(w,CITIES.find(c=>c.id===w.city));
 if(session.game.hunt){session.game.hunt.field=null;session.game.hunt.mob=null;session.game.hunt.playerDebuffs=[];}
 if(destination==='city')restoreRevivalVitals(session,{town:true});
 else {stats.hp=Math.max(1,Math.floor(getMaxHp(session)*.5));stats.mp=Math.max(0,Math.floor(getMaxMp(session)*.5));stats.cp=Math.max(0,Math.floor(getMaxCp(session)*.5));}
 if(session.game.deathLedger)session.game.deathLedger.active=false;
 session.game.respawnTime=0;delete session.game.l2PendingDeath;session.needsSave=true;
 return {ok:true};
}

/** Resurrection in the atlas requires the same room/floor/instance (or interior), and range. */
export function revivalPosition(member){
 const w=member.game?.world,f=member.game?.hunt?.field;
 if(!w)return null;
 if(w.mode==='location'&&f)return {space:`${w.location}:${w.instanceId||''}:${f.floor||1}:${f.native?'native':f.room}`,x:f.x,y:f.y};
 if(['city','entrance','hall','stronghold','siege'].includes(w.mode))return {space:`${w.mode}:${w.city}:${w.holding||''}`,x:w.x,y:w.y};
 return null;
}
export function nearbyCorpse(caster,target){
 if(!caster.game?.world&&!target.game?.world)return true;
 const a=revivalPosition(caster),b=revivalPosition(target);
 const size=caster.game?.world?.mode==='city'?(CITIES.find(c=>c.id===caster.game.world.city)?.size||14000):2000;
 return Boolean(a&&b&&a.space===b.space&&Math.hypot(a.x-b.x,a.y-b.y)*size<=600);
}
