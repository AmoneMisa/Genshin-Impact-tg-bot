// Permanent bonuses that are not part of any item: passive skills and clan skills. Both give
// stat deltas ({attackMul: 0.04} is +4% attack, {evasion: 4} is +4 points); this folds them
// into the stat the way getEquipStatByName.js asks for it (a factor for "Mul" stats, a sum otherwise).
import { passiveModifiers } from './passiveSkills.js';
import { clanPerkModifiers } from '../clans/clanPerks.js';

function sources(session) {
    return [passiveModifiers(session), clanPerkModifiers(session)];
}

/** The extra bonus for one stat: 1.x when `isMul`, an addend otherwise (0 when there is none). */
export default function extraStatBonus(session, statName, isMul = false) {
    let result = isMul ? 1 : 0;
    for (const modifiers of sources(session)) {
        const delta = modifiers[statName];
        if (typeof delta !== 'number') continue;
        if (isMul) result *= Math.max(0, 1 + delta);
        else result += delta;
    }
    return result;
}
