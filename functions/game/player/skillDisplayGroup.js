/** Group using exported High Five operation/effect data. Not a replacement for client skillgrp. */
export function skillDisplayGroup(skill) {
 const effects=skill.effects||[];
 if(skill.op==='P'){
  if(skill.id===239||/\b(?:Weapon|Armor|Shield) Mastery\b/.test(skill.name||''))return 'equipment';
  if(effects.includes('Lucky')||effects.includes('HpByLevel'))return 'race';
  if(effects.some(e=>e.startsWith('TriggerSkill'))||/\bBoost\b|\bSkill Mastery\b/.test(skill.name||''))return 'ability';
  return 'occupation';
 }
 if(skill.op==='T')return 'toggle';
 if(effects.includes('Transformation'))return 'transform';
 if(effects.some(e=>/RecipeBook|ConvertItem/.test(e)))return 'item';
 if(skill.debuff||effects.some(e=>['Debuff','DamOverTime','ManaDamOverTime','Stun','Root','Sleep','Paralyze','Fear','Mute','PhysicalMute','Petrification'].includes(e)))return 'weaken';
 if(effects.some(e=>['Buff','ImmobileBuff','ImmobilePetBuff'].includes(e)))return 'reinforce';
 return Number(skill.magic)>0?'magic':'physical';
}
