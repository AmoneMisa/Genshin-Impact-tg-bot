import Store from '../db/models/TreasureChest.js';
import {chestSlots,chestSpawn,chestNear,chestLevelAllowed,unlockState,valueAt,TREASURE_DATA as DATA} from '../functions/game/hunt/treasureRules.js';
import {stopHuntAction} from '../functions/game/hunt/huntFight.js';
import {addMaterial,getMaterialCount,spendMaterials,materialInfo} from '../functions/game/player/materials.js';
import {l2ActionBlock} from '../functions/game/player/l2Effects.js';
import {lootInfo} from '../functions/game/hunt/lootTable.js';
import {dropRolls} from '../functions/game/hunt/huntRewards.js';
import {HUNT} from '../functions/game/hunt/huntConfig.js';
const local=s=>(s.$locals||={});
function valid(s){return s.game.world?.mode==='location'&&!s.game.world.instanceId&&s.game.hunt?.zone===s.game.world.location&&s.game.hunt?.field&&s.game.gameClass?.stats?.hp>0;}
function candidates(s){return valid(s)?chestSlots.filter(slot=>slot.group.territories.some(t=>t.gate?.zone===s.game.hunt.zone)):[];}
async function recordsFor(s,store){
 const slots=candidates(s);if(!slots.length)return [];
 const query={_id:{$in:slots.map(s=>s.id)}};let rows=await store.find(query).lean();
 const missing=slots.filter(slot=>!rows.some(r=>r._id===slot.id));
 if(missing.length){await store.bulkWrite(missing.map(slot=>({updateOne:{filter:{_id:slot.id},update:{$setOnInsert:{cycle:0,openedAt:0,respawnAt:0}},upsert:true}})));rows=await store.find(query).lean();}
 return rows.map(record=>({slot:slots.find(s=>s.id===record._id),record}));
}
function interrupted(s,cast,now){
 const f=s.game.hunt?.field;
 return !valid(s)||s.game.gameClass.stats.name!==cast.className||s.game.hunt.zone!==cast.zone||f.room!==cast.room||(f.floor||1)!==cast.floor||f.path?.length||f.action||f.autoAttack||Math.hypot(f.x-cast.x,f.y-cast.y)>.001||(f.treasureHitAt||0)>cast.at||now-(f.seenAt||cast.at)>5000||l2ActionBlock(s,{},now);
}
export function chestRewards(session,npcId,random=Math.random){
 const result={exp:0,sp:0,gold:0,items:[],leveledUp:false};
 for(const [id,min,max,chance] of DATA.npcs[npcId].drops){
  const copies=dropRolls(chance*(id===57?1:HUNT.dropRate),random);if(!copies)continue;
  const amount=copies*(min+Math.floor(random()*(max-min+1)));
  if(id===57){const gold=Math.round(amount*HUNT.goldScale);session.game.inventory.gold+=gold;result.gold+=gold;continue;}
  const key=lootInfo(id).key;addMaterial(session,key,amount);const info=materialInfo(key);
  result.items.push({item:key,name:info.name,icon:info.icon,amount});
 }
 return result;
}
/** Resolves completed casts and reads shared spawn availability before rendering a hunt answer. */
export async function hydrateTreasures(session,now=Date.now(),store=Store,random=Math.random){
 const f=session.game.hunt?.field,cast=f?.treasureCast;
 if(cast){
  if(interrupted(session,cast,now)){delete f.treasureCast;}
  else if(cast.until<=now){
   delete f.treasureCast;
   const slot=chestSlots.find(s=>s.id===cast.id),spawn=slot&&chestSpawn(slot,cast.cycle);
   if(spawn&&chestNear(session,spawn)&&chestLevelAllowed(Number(session.game.stats.lvl),DATA.npcs[spawn.npc.id].level)){
    const respawnAt=cast.until+spawn.npc.respawnMs+Math.round((random()*2-1)*spawn.npc.respawnRandomMs);
    const claimed=await store.findOneAndUpdate({_id:slot.id,cycle:cast.cycle,openedAt:0},{$set:{openedAt:cast.until,respawnAt}},{new:true});
    if(claimed){
     const reward=chestRewards(session,spawn.npc.id,random),hunt=session.game.hunt;
     hunt.lastLoot={at:now,...reward};hunt.log.unshift({id:`chest:${slot.id}:${cast.cycle}`,at:now,icon:'◇',text:'Сундук открыт.',loot:hunt.lastLoot});hunt.log.length=Math.min(hunt.log.length,40);
     session.needsSave=true;
    }
   }
  }
 }
 const rows=await recordsFor(session,store),markers=[];
 for(const entry of rows){
  let r=entry.record;
  if(r.openedAt&&r.respawnAt<=now){const fresh=await store.findOneAndUpdate({_id:r._id,cycle:r.cycle,openedAt:{$gt:0},respawnAt:{$lte:now}},{$inc:{cycle:1},$set:{openedAt:0,respawnAt:0}},{new:true});if(!fresh)continue;r=fresh;}
  if(r.openedAt)continue;
  const spawn=chestSpawn(entry.slot,r.cycle),g=spawn.gate;
  if(!g||g.zone!==session.game.hunt?.zone||(session.game.hunt.field.floor||1)!==g.floor||session.game.hunt.field.room!==g.room)continue;
  const npc=DATA.npcs[spawn.npc.id];markers.push({id:r._id,cycle:r.cycle,name:npc.name,level:npc.level,point:g.point,near:chestNear(session,spawn),levelAllowed:chestLevelAllowed(Number(session.game.stats.lvl),npc.level)});
 }
 local(session).treasures=markers;return markers;
}
export async function treasureAction(session,body,now=Date.now(),store=Store){
 await hydrateTreasures(session,now,store);
 const marker=local(session).treasures.find(c=>c.id===body.chest);if(!marker?.near)return {ok:false,reason:'chest_too_far'};
 if(!marker.levelAllowed)return {ok:false,reason:'chest_level'};
 const blocked=l2ActionBlock(session,{},now);if(blocked)return {ok:false,reason:blocked};
 const f=session.game.hunt.field;if(f.treasureCast)return {ok:false,reason:'chest_casting'};
 const u=unlockState(session);
 if(body.method==='learn'){
  if(!u.next)return {ok:false,reason:'chest_unlock_unavailable'};
  if((Number(session.game.inventory.sp)||0)<u.next.sp)return {ok:false,reason:'not_enough_sp'};
  const items=Object.fromEntries(u.next.items.map(([id,n])=>['l2_'+id,n]));
  if(!spendMaterials(session,items))return {ok:false,reason:'not_enough_items'};
  session.game.inventory.sp-=u.next.sp;(session.game.l2UtilitySkills||={})[27]=u.next.level;return {ok:true};
 }
 if(!['unlock','key'].includes(body.method))return {ok:false,reason:'invalid_action'};
 if(body.method==='unlock'&&!u.level)return {ok:false,reason:'chest_unlock_unavailable'};
 const skill=DATA.skills[body.method==='unlock'?27:22271],rank=body.method==='unlock'?u.level:1;
 if((session.game.l2CastAt?.[skill.id]||0)>now)return {ok:false,reason:'cooldown'};
 const key=body.method==='unlock'?1661:21746,count=body.method==='unlock'?valueAt(skill.itemConsumeCount,rank):1,mp=valueAt(skill.mpConsume,rank);
 if(getMaterialCount(session,'l2_'+key)<count)return {ok:false,reason:'chest_key_required'};
 if((Number(session.game.gameClass.stats.mp)||0)<mp)return {ok:false,reason:'not_enough_resource'};
 stopHuntAction(f,now);spendMaterials(session,{['l2_'+key]:count});session.game.gameClass.stats.mp-=mp;
 (session.game.l2CastAt||={})[skill.id]=now+valueAt(skill.reuseDelay,rank);
 f.treasureCast={id:marker.id,cycle:marker.cycle,at:now,until:now+valueAt(skill.hitTime,rank),className:session.game.gameClass.stats.name,zone:session.game.hunt.zone,floor:f.floor||1,room:f.room,x:f.x,y:f.y};
 session.needsSave=true;return {ok:true,casting:true,until:f.treasureCast.until};
}
export function treasureDto(session,now=Date.now()){
 const u=unlockState(session),skill=DATA.skills[27],cast=session.game.hunt?.field?.treasureCast;
 return {chests:local(session).treasures||[],unlock:{...u,canLearn:Boolean(u.next&&(session.game.inventory.sp||0)>=u.next.sp),keyCost:valueAt(skill.itemConsumeCount,u.level||1),mpCost:valueAt(skill.mpConsume,u.level||1),ready:(session.game.l2CastAt?.[27]||0)<=now},keyReady:(session.game.l2CastAt?.[22271]||0)<=now,keyCount:getMaterialCount(session,'l2_21746'),thiefKeys:getMaterialCount(session,'l2_1661'),casting:cast?{id:cast.id,at:cast.at,until:cast.until}:null};
}
