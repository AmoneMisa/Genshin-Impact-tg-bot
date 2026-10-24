import {PASS_EPICS} from '../../../template/epicPasses.js';
import {ABSORPTION} from '../../../template/soulCrystalSource.js';
import {getZones} from '../hunt/huntMobs.js';
import HELLBOUND_ACCESS from '../../../template/hellboundAccess.js';
/** Only objectives of a character's active quests; identifiers are checked again before teleporting. */
export function questTargets(session,locations){
 const objectives=[];
 for(const [name,q] of Object.entries(session.game.academy?.passQuests||{})){const step=PASS_EPICS[name]?.steps[q.step];if(step?.type==='collect')objectives.push({title:PASS_EPICS[name].title,zone:step.zone,names:step.mobs});}
 const soul=session.game.soulCrystalQuest?.startedAt,stage=Number(session.game.soulCrystal?.stage||0);
 const rows=new Map();
 for(const zone of getZones()){const location=locations.find(l=>l.id===zone.id);if(!location||location.instance)continue;for(const mob of zone.mobs){const titles=objectives.filter(o=>o.zone===zone.id&&(!o.names?.length||o.names.includes(mob.name))).map(o=>o.title);if(soul&&ABSORPTION[mob.id]?.rules.some(r=>r.stages.includes(stage)||(r.maxStage!==null&&stage<r.maxStage)))titles.push('Улучшение оружия');if(!titles.length)continue;const id=zone.id+':'+mob.id;rows.set(id,{id,name:mob.name,mobId:mob.id,location:zone.id,region:location.region,x:location.x,y:location.y,levelMin:mob.level,levelMax:mob.level,quests:[...new Set(titles)]});}}
 const q=session.game.worldQuests?.[130];
 if(q&&!q.completedAt){
  const npcId=q.condition===2?30612:[1,3].includes(q.condition)?32292:null,npc=HELLBOUND_ACCESS.npcs.find(n=>n.npcId===npcId);
  if(npc)rows.set('130:'+npc.id,{id:'130:'+npc.id,npcReference:npc.id,name:npc.name,region:npc.region,x:npc.x,y:npc.y,z:npc.z,levelMin:HELLBOUND_ACCESS.quest.minimumLevel,levelMax:HELLBOUND_ACCESS.quest.minimumLevel,quests:['Путь на Хеллбаунд']});
 }
 return [...rows.values()];
}
