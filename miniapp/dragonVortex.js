import Boss from '../db/models/Boss.js';
import {randomInt} from 'node:crypto';
import WorldInstance from '../db/models/WorldInstance.js';
import getSession from '../functions/getters/getSession.js';
import summonBoss from '../functions/game/boss/summonBoss.js';
import getAliveBoss from '../functions/game/boss/getBossStatus/getAliveBoss.js';
import {getEpicTemplate} from '../functions/game/boss/epicBosses.js';
import {worldRows} from '../functions/game/boss/worldBosses.js';
import {nearVortex,rollVortexBoss,isVortexBoss} from '../functions/game/world/dragonVortex.js';
import {advanceWorld,quickTravelBlock} from '../functions/game/world/world.js';
import {getMaterialCount,spendMaterials} from '../functions/game/player/materials.js';
import {withLock} from '../functions/general/chatLock.js';

const deps={store:WorldInstance,session:getSession,summon:summonBoss,alive:getAliveBoss,scope:()=>-(8e12+randomInt(0,1e12)),random:Math.random};
/** Public source NPC cooldown; each summon has its own fight, including repeats of the same species. */
export async function dragonVortexAction(session,body,now=Date.now(),services={}){
 advanceWorld(session,now);
 const d={...deps,...services},v=nearVortex(session,body.vortex);
 if(!v)return {ok:false,reason:'npc_too_far'};
 const blocked=quickTravelBlock(session,now);if(blocked)return {ok:false,reason:blocked};
 if(body.encounter){
  const record=await d.store.findById(String(body.encounter)),e=record?.data;
  if(e?.kind!=='dragon-vortex'||e.vortex!==v.id||e.until<=now||!await d.alive(e.scope))return {ok:false,reason:'vortex_required'};
  session.game.world.vortexEncounter={id:record._id,scope:e.scope,name:e.name,vortex:e.vortex};
  session.needsSave=true;
  return {ok:true,bossName:e.name};
 }
 return withLock('dragon-vortex:'+v.id,async()=>{
  const id='dragon-vortex:cooldown:'+v.id,record=await d.store.findById(id);
  if(record?.data.until>now)return {ok:false,reason:'vortex_cooldown',remainMs:record.data.until-now};
  if(getMaterialCount(session,'l2_17248')<1)return {ok:false,reason:'vortex_bone_required'};
  const npcId=rollVortexBoss(d.random),name=worldRows.find(r=>r.id===npcId)?.name,template=name&&getEpicTemplate(name);
  if(!template)return {ok:false,reason:'unknown_epic'};
  const scope=d.scope(),encounterId='dragon-vortex:encounter:'+(-scope);
  // Unique _id + conditional upsert also serializes requests handled by other server processes.
  try{
   await d.store.findOneAndUpdate({_id:id,$or:[{'data.until':{$lte:now}},{'data.until':{$exists:false}}]},{$set:{data:{kind:'dragon-vortex-cooldown',until:now+60000,reservation:encounterId},expiresAt:new Date(now+60000)}},{upsert:true,new:true});
  }catch(error){if(error.code===11000)return {ok:false,reason:'vortex_cooldown',remainMs:60000};throw error;}
  try{
   await d.session(scope,session.userId);
   const encounterTemplate={...template,world:{...template.world,zone:'dragon-valley',sceneKey:`dragon-valley:${v.room}:floor-1`,environment:'desert'}};
   const boss=await d.summon(scope,encounterTemplate);
   const e={id:encounterId,kind:'dragon-vortex',vortex:v.id,scope,name,npcId,source:v.spawn,until:boss.aliveTime,members:[]};
   await d.store.updateOne({_id:encounterId},{$set:{data:e,expiresAt:new Date(e.until)}},{upsert:true});
  }catch(error){await d.store.deleteOne({_id:id,'data.reservation':encounterId});throw error;}
  spendMaterials(session,{'l2_17248':1});
  session.game.world.vortexEncounter={id:encounterId,scope,name,vortex:v.id};
  session.needsSave=true;
  return {ok:true,bossName:name};
 });
}
export async function vortexEncounterFor(session,name,scope,now=Date.now(),store=WorldInstance){
 const ticket=session.game.world?.vortexEncounter;
 if(ticket?.name!==name||ticket.scope!==scope)return null;
 const record=await store.findById(ticket.id),e=record?.data;
 return e?.kind==='dragon-vortex'&&e.name===name&&e.scope===scope&&e.until>now&&isVortexBoss(e.npcId)?e:null;
}
export async function activeVortexEncounters(now=Date.now(),store=WorldInstance,bossStore=Boss){
 const rows=await store.find({'data.kind':'dragon-vortex','data.until':{$gt:now}}).lean();
 if(!rows.length)return [];
 const alive=await bossStore.find({chatId:{$in:rows.map(r=>r.data.scope)},hp:{$gt:0},aliveTime:{$gt:now}}).select('chatId').lean();
 const scopes=new Set(alive.map(b=>b.chatId));
 return rows.filter(r=>scopes.has(r.data.scope)).map(r=>({id:r._id,vortex:r.data.vortex,name:r.data.name,until:r.data.until}));
}
