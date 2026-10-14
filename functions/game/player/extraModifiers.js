// Bonuses that are not a plain item stat: passive skills, clan skills, the skills of a Life Stone weapon and
// the base characteristics (STR, DEX, ...). All give stat deltas ({attackMul: 0.04} is +4% attack, {evasion: 4} is +4 points); this folds them
// into the stat the way getEquipStatByName.js asks for it (a factor for "Mul" stats, a sum otherwise).
import { passiveModifiers } from './passiveSkills.js';
import { clanPerkModifiers } from '../clans/clanPerks.js';
import { activeSkillModifiers, passiveSkillModifiers } from '../equipment/lifestoneSkills.js';
import { baseStatDelta } from './baseStats.js';
import { scrydeModifiers } from './scrydeBuffer.js';
import {runeRate} from '../runes/labRunes.js';

function sources(session, damageType) {
    return [passiveModifiers(session, damageType), clanPerkModifiers(session, damageType), passiveSkillModifiers(session, damageType), activeSkillModifiers(session, Date.now(), damageType), scrydeModifiers(session)];
}

/** The extra bonus for one stat: 1.x when `isMul`, an addend otherwise (0 when there is none). */
export default function extraStatBonus(session, statName, isMul = false, damageType) {
    let result = isMul ? 1 : 0;
    const deltas = sources(session, damageType).map(modifiers => modifiers[statName]);
    if(statName==='dropRateMul')deltas.push(runeRate(session,'drop'));
    deltas.push(baseStatDelta(session, statName, damageType));
    for (const delta of deltas) {
        if (typeof delta !== 'number' || delta === 0) continue;
        if (isMul) result *= Math.max(0, 1 + delta);
        else result += delta;
    }
    return result;
}
