import CLIENT from '../../../template/l2SkillGroups.js';

// High Five skillgrp.icon_type, not server operation/effect/name heuristics.
const groups={0:'physical',1:'magic',2:'reinforce',3:'weaken',4:'clan',5:'item',6:'toggle',7:'transform',11:'equipment',12:'ability',13:'race',14:'occupation',15:'clanPassive',16:'itemPassive'};
export function skillClientIconType(skill,enchant={}){
 const level=Number(enchant.level)>0?Number(enchant.route)*100+Number(enchant.level):Number(skill.level||skill.availableLevel||1);
 return CLIENT.skills[skill.id]?.find(([from,to])=>level>=from&&level<=to)?.[2]??null;
}
export function skillDisplayGroup(skill,enchant={}){
 return groups[skillClientIconType(skill,enchant)]||(skill.op==='P'?'otherPassive':'otherActive');
}
