import buffPotions from '../../../template/buffPotions.js';
import potionsInInventoryTemplate from '../../../template/potionsInInventoryTemplate.js';
import {LEGACY_L2_BUFFS,resolveEffectSkill} from './l2Effects.js';

// Lineage II style buffs. They come from potions (full strength) and from class
// buff skills (template/classBuffs.js, scaled by a buff level). Both live in
// session.game.effects as {potionId, until, factor}; the modifiers always come
// from template/buffPotions.js, never from the stored effect.

const MAX_FACTOR = 1.3;

const factorOf = effect => {
 const factor = Number(effect?.factor);
 return Number.isFinite(factor) && factor > 0 ? Math.min(MAX_FACTOR, factor) : 1;
};

export function activePotionBuffs(session,now=Date.now()) {
 return (session?.game?.effects||[]).filter(e=>e?.potionId && Number(e.until)>now && buffPotions.some(p=>p.id===e.potionId));
}

/** A modifier scaled by buff strength: 1.15 at factor .5 becomes 1.075, +15 becomes +7.5. */
export function scaleModifier(value,isMul,factor=1) {
 return isMul ? 1+(value-1)*factor : value*factor;
}

export function potionStatBonus(session,stat,isMul=false,now=Date.now()) {
 let result=isMul?1:0;
 for(const effect of activePotionBuffs(session,now)) {
  // Resolve modifiers from trusted definitions, not a client-supplied item.
  const value=buffPotions.find(p=>p.id===effect.potionId).modifiers[stat];
  if(value===undefined) continue;
  const scaled=scaleModifier(value,isMul,factorOf(effect));
  result=isMul?result*scaled:result+scaled;
 }
 return result;
}

/**
 * Puts a buff on a player. A potion (factor 1) always replaces the effect; a
 * weaker class buff never downgrades a stronger one that is still running, it
 * only keeps it from running out earlier.
 */
export function applyPotionBuff(session,id,now=Date.now(),{factor=1}={}) {
 const definition=buffPotions.find(p=>p.id===id);if(!definition)return null;
 if(!Array.isArray(session.game.effects))session.game.effects=[];
 const until=now+definition.seconds*1000;
 const strength=Math.min(MAX_FACTOR,Math.max(0.1,Number(factor)||1));
 const current=session.game.effects.find(e=>e?.potionId===id && Number(e.until)>now);
 if(current && factorOf(current)>strength) {
  current.until=Math.max(Number(current.until),until);
  return current;
 }
 const native=LEGACY_L2_BUFFS[id];
 const original=resolveEffectSkill(native);
 const nativeCurrent=session.game.effects.find(e=>e.l2SkillId&&Number(e.until)>now&&resolveEffectSkill(e.l2SkillId,e.level)?.fields.abnormalType===original?.fields.abnormalType);
 if(nativeCurrent&&resolveEffectSkill(nativeCurrent.l2SkillId,nativeCurrent.level).strength>=original.levels*strength){nativeCurrent.until=Math.max(nativeCurrent.until,until);return nativeCurrent;}
 session.game.effects=session.game.effects.filter(e=>e?.potionId!==id && !(e?.l2SkillId && resolveEffectSkill(e.l2SkillId,e.level)?.fields.abnormalType===resolveEffectSkill(native)?.fields.abnormalType));
 const effect={name:definition.name,potionId:id,amount:0,until,factor:strength};
 session.game.effects.push(effect);return effect;
}

/** Adds `count` of a potion with an id (buff potion or elixir) to its inventory stack, created from the template when new. */
export function addPotionById(session,id,count=1) {
 const definition=potionsInInventoryTemplate.find(p=>p.id===id);if(!definition)return null;
 const items=session?.game?.inventory?.potions?.items;if(!Array.isArray(items))return null;
 const existing=items.find(p=>p.id===id);
 if(existing)existing.count=(Number(existing.count)||0)+count;
 else items.push({...definition,count});
 return definition;
}

/** Adds `count` buff potions to the inventory stack. */
export const addBuffPotion=(session,id,count=1)=>potionsInInventoryTemplate.some(p=>p.id===id && p.type==='buff')?addPotionById(session,id,count):null;

export const BUFF_POTION_IDS=buffPotions.map(p=>p.id);
