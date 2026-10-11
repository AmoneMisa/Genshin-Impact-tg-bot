import {isMagicClass} from '../classes/classFamily.js';
import {L2_EFFECT_SKILLS} from '../../../template/l2EffectSkills.js';
import l2 from '../../../template/l2Classes.js';

export function combatType(gameClass, explicit) {
    if (explicit === 'magic' || explicit === 'physical') return explicit;
    const stats = gameClass?.stats || gameClass || {};
    return isMagicClass(stats.name) ? 'magic' : 'physical';
}

/** Explicit skill metadata wins over the caster's family, including physical skills of a mage. */
export function skillCombatType(skill, gameClass) {
    if (skill?.damageType === 'magic' || skill?.damageType === 'physical') return skill.damageType;
    const id = skill?.l2Id ?? skill?.id;
    const flag = skill?.isMagic ?? skill?.fields?.isMagic ?? L2_EFFECT_SKILLS[id]?.fields?.isMagic ?? l2.skills[id]?.magic;
    if (flag !== undefined && flag !== null) return Number(flag) === 1 || flag === true || flag === 'true' ? 'magic' : 'physical';
    return combatType(gameClass);
}

export const nativeCombatStat = (stat, type) => ({
    attack: type === 'magic' ? 'mAtk' : 'pAtk',
    attackMul: type === 'magic' ? 'mAtkMul' : 'pAtkMul',
    defence: type === 'magic' ? 'mDef' : 'pDef',
    defenceMul: type === 'magic' ? 'mDefMul' : 'pDefMul',
    power: type === 'magic' ? 'mPower' : 'pPower',
})[stat];

export function matchesCombatStat(stat, type) {
    return !type || !(type === 'magic' ? ['pAtk','pDef'] : ['mAtk','mDef']).includes(stat);
}
