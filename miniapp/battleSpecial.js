import {specialSkills} from '../functions/game/player/hotbar.js';
import {getL2BuffsState} from './l2Buffs.js';
import {describeSkill} from '../functions/game/equipment/lifestoneSkills.js';
import getCurrentMp from '../functions/game/player/getters/getCurrentMp.js';
import {classEffectSkills,isL2PetSkill} from '../functions/game/player/l2Effects.js';
export function battleSpecialDto(session, now=Date.now()) {
  const buffs=getL2BuffsState(session,now),mp=getCurrentMp(session,session.game.gameClass);
  return specialSkills(session,now).map(row=>{
    const buff=buffs.find(b=>b.id===row.id);
    const stone=row.type==='ls'?describeSkill({id:row.id.slice(3),level:row.level}):null;
    return {...row,iconId:stone?.id,description:buff?.effect||stone?.text||'',costMp:buff?.cost||0,
      canUse:row.canUse && (!buff||(row.type==='toggle'&&row.running)||(mp>=buff.cost&&buff.cooldownUntil<=now))};
  });
}
export function excludeToggleSkills(skills,special,session=null) {
  const names=new Set(special.filter(s=>s.type==='toggle'||s.type==='summon').map(s=>s.name));
  if(session) for(const skill of classEffectSkills(session,{includeLocked:true})) {
    if(skill.operate==='T'||isL2PetSkill(skill)) names.add(skill.name);
  }
  return skills.filter(s=>!names.has(s.name));
}
