import {specialSkills} from '../functions/game/player/hotbar.js';
import {getL2BuffsState} from './l2Buffs.js';
import {describeSkill} from '../functions/game/equipment/lifestoneSkills.js';
import getCurrentMp from '../functions/game/player/getters/getCurrentMp.js';
export function battleSpecialDto(session, now=Date.now()) {
  const buffs=getL2BuffsState(session,now),mp=getCurrentMp(session,session.game.gameClass);
  return specialSkills(session,now).map(row=>{
    const buff=buffs.find(b=>b.id===row.id);
    const stone=row.type==='ls'?describeSkill({id:row.id.slice(3),level:row.level}):null;
    return {...row,iconId:stone?.id,description:buff?.effect||stone?.text||'',costMp:buff?.cost||0,
      canUse:row.canUse && (!buff||row.running||(mp>=buff.cost&&buff.cooldownUntil<=now))};
  });
}
export function excludeToggleSkills(skills,special) {
  const names=new Set(special.filter(s=>s.type==='toggle').map(s=>s.name));
  return skills.filter(s=>!names.has(s.name));
}
