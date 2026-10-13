import {PASS_EPICS} from '../../../template/epicPasses.js';
import {ABSORPTION} from '../../../template/soulCrystalSource.js';
import {getZones} from '../hunt/huntMobs.js';
/** Only objectives of a character's active quests; identifiers are checked again before teleporting. */
export function questTargets(session,locations){
 const objectives=[];
 for(const [name,q] of Object.entries(session.game.academy?.passQuests||{})){const step=PASS_EPICS[name]?.steps[q.step];if(step?.type==='collect')objectives.push({title:PASS_EPICS[name].title,zone:step.zone,names:step.mobs});}
 const soul=session.game.soulCrystalQuest?.startedAt,stage=Number(session.game.soulCrystal?.stage||0);
 const rows=new Map();
 for(const zone of getZones()){const location=locations.find(l=>l.id===zone.id);if(!location||location.instance)continue;for(const mob of zone.mobs){const titles=objectives.filter(o=>o.zone===zone.id&&(!o.names?.length||o.names.includes(mob.name))).map(o=>o.title);if(soul&&ABSORPTION[mob.id]?.rules.some(r=>r.stages.includes(stage)||(r.maxStage!==null&&stage<r.maxStage)))titles.push('Улучшение оружия');if(!titles.length)continue;const id=zone.id+':'+mob.id;rows.set(id,{id,name:mob.name,mobId:mob.id,location:zone.id,region:location.region,x:location.x,y:location.y,levelMin:mob.level,levelMax:mob.level,quests:[...new Set(titles)]});}}
 return [...rows.values()];
}
