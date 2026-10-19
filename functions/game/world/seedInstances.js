import {l2ActionBlock} from '../player/l2Effects.js';
import {SEED_MODES} from '../../../template/seedInstances.js';
import {locationLevel} from '../hunt/locationLevels.js';
import {partyMembers} from '../party/party.js';

const all=chat=>[...(chat?.members||[]),...(chat?.$locals?.guests||[])];
const store=session=>session.ownerDocument?.()?.game?.worldInstances||{};
export const seedInstance=session=>store(session)[session.game.world?.instanceId];
export function seedModeAt(location,floor){return Object.entries(SEED_MODES).find(([,m])=>m.location===location&&m.startFloor===floor)?.[0]||null;}
function ready(member,mode,now){
 const w=member.game.world,f=member.game.hunt?.field,lvl=Number(member.game.stats?.lvl);
 if(lvl<mode.minLevel||lvl>mode.maxLevel)return 'instance_level';
 if(w?.locks?.['seed:'+mode.instanceId]>now)return 'instance_locked';
 if(member.game.gameClass?.stats?.hp<=0||w?.instanceId||w?.mode!=='location'||w.location!==mode.location||f?.floor!==1||f.room!=='r0c0'||Math.hypot(f.x-.9,f.y-.1)>.1)return 'party_not_ready';
 const abnormal=l2ActionBlock(member,{move:true},now);if(abnormal)return abnormal;
 if(member.game.stats?.inFightTimer>now||f.mobs.some(m=>m.currentHp>0&&m.aggro))return 'quick_travel_combat';
 if(mode.quest&&member.game.world?.seedQuests?.[mode.quest]!==1)return 'seed_quest_required';
 return null;
}
export function seedAssemblyAction(session,{action,seedMode,assembly:assemblyId},now){
 const chat=session.ownerDocument?.(),mode=SEED_MODES[seedMode],party=session.game.party;
 if(!chat||!mode||!mode.commandChannel)return {ok:false,reason:'invalid_action'};
 const members=partyMembers(chat,session);
 if(String(party?.leaderId)!==String(session.userId)||!members.length)return {ok:false,reason:'not_leader'};
 for(const member of members){const blocked=ready(member,mode,now);if(blocked)return {ok:false,reason:blocked};}
 const instances=chat.game.worldInstances||={};
 let assembly=instances[assemblyId||session.game.world.seedAssembly];
 if(action==='seed_assembly'){
  if(Object.values(instances).filter(i=>i.until>now).length>=64)return {ok:false,reason:'instance_busy'};
  const id=`seed:${seedMode}:${session.userId}:${now}`;
  assembly={id,kind:'seed-assembly',seedMode,location:mode.location,leader:String(session.userId),members:[],parties:[],until:now+3600000,rooms:{}};instances[id]=assembly;
 }else if(action!=='seed_join')return {ok:false,reason:'invalid_action'};
 if(!assembly||assembly.kind!=='seed-assembly'||assembly.seedMode!==seedMode||assembly.until<=now)return {ok:false,reason:'seed_assembly_missing'};
 if(assembly.parties.includes(party.id))return {ok:false,reason:'already_member'};
 if(members.some(m=>assembly.members.includes(String(m.userId)))||assembly.members.length+members.length>mode.partyMax)return {ok:false,reason:'party_full'};
 assembly.members.push(...members.map(m=>String(m.userId)));assembly.parties.push(party.id);
 for(const member of members){member.game.world.seedAssembly=assembly.id;member.needsSave=true;}
 return {ok:true,assembly:assembly.id};
}
export function seedAdmission(session,key,now){
 const mode=SEED_MODES[key],chat=session.ownerDocument?.();
 if(!mode||!chat)return {ok:false,reason:'instance_party_required'};
 let members,assembly;
 if(mode.commandChannel){
  assembly=store(session)[session.game.world.seedAssembly];
  if(!assembly||assembly.kind!=='seed-assembly'||assembly.seedMode!==key||assembly.until<=now)return {ok:false,reason:'seed_assembly_required'};
  if(assembly.leader!==String(session.userId))return {ok:false,reason:'not_leader'};
  members=assembly.members.map(id=>all(chat).find(m=>String(m.userId)===id));
 }else{
  members=partyMembers(chat,session);
  if(String(session.game.party?.leaderId)!==String(session.userId))return {ok:false,reason:'not_leader'};
 }
 if(members.length<mode.partyMin||members.length>mode.partyMax)return {ok:false,reason:'seed_raid_size'};
 if(members.some(m=>!m))return {ok:false,reason:'party_not_ready'};
 for(const member of members){const denied=ready(member,mode,now);if(denied)return {ok:false,reason:denied};}
 if(assembly&&members.some(m=>!assembly.parties.includes(m.game.party?.id)))return {ok:false,reason:'party_not_ready'};
 return {ok:true,members,mode,key,assembly};
}
export function seedFloorBlock(session,location,floor,now){
 const f=session.game.hunt?.field,instance=seedInstance(session),mode=SEED_MODES[instance?.seedMode];
 if(floor===1)return null;
 if(!mode||instance.kind!=='seed'||instance.until<=now||!instance.members.includes(String(session.userId))||mode.location!==location)return 'seed_entry_required';
 if(floor<mode.startFloor||floor>mode.lastFloor)return 'invalid_floor';
 if(floor>f.floor&&!seedStageCleared(instance,f.floor))return 'objectives_remaining';
 return null;
}
export function seedStageCleared(instance,number){
 const level=locationLevel(instance.location,number);if(!level)return false;
 const wanted=[];
 for(const room of level.rooms){let index=0;for(const spawn of room.spawns)for(let k=0;k<spawn.count;k++,index++){
  if(level.objectiveIds&&!level.objectiveIds.includes(Number(spawn.id)))continue;
  if(level.objectiveGroups&&!level.objectiveGroups.includes(spawn.sourceGroup))continue;
  wanted.push(`${number}:${room.id}:${index}`);
 }}
 return wanted.length>0&&wanted.every(key=>instance.defeated?.[key]);
}
export function recordSeedKill(session,mob,now){
 const instance=seedInstance(session),f=session.game.hunt?.field;
 if(instance?.kind!=='seed'||!f||instance.until<=now)return;
 (instance.defeated||={})[`${f.floor}:${mob.sourceRoom}:${mob.sourceSlot}`]=true;
 if(f.floor===SEED_MODES[instance.seedMode].lastFloor&&seedStageCleared(instance,f.floor)){
  instance.completedAt||=now;
  if(instance.seedMode==='tiat')instance.until=Math.min(instance.until,now+300000);
 }
}
export function seedDto(session,now){
 const w=session.game.world,f=session.game.hunt?.field,instance=seedInstance(session),assembly=store(session)[w?.seedAssembly];
 const modes=Object.entries(SEED_MODES).filter(([,m])=>m.location===w?.location).map(([key,m])=>({key,title:m.title,partyMin:m.partyMin,partyMax:m.partyMax,minLevel:m.minLevel,maxLevel:m.maxLevel,startFloor:m.startFloor,commandChannel:Boolean(m.commandChannel),quest:m.quest}));
 if(!modes.length)return null;
 return {modes,assembly:assembly?.kind==='seed-assembly'&&assembly.until>now?{id:assembly.id,count:assembly.members.length,seedMode:assembly.seedMode,leader:assembly.leader}:null,
  active:instance?.kind==='seed'?{until:instance.until,completed:Boolean(instance.completedAt),cleared:seedStageCleared(instance,f.floor)}:null,quests:w.seedQuests||{}};
}
