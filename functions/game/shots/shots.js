// Soulshots / Spiritshots in a fight. With auto-shots on (session.game.autoShots), a damage skill burns
// the charges of the weapon's grade before it is cast and hits harder for it:
//   fighters use Soulshots; mage and priest lines use Blessed Spiritshots when they have them, else Spiritshots.
// The boost is handed to the damage code through a one-skill slot: armShots() before castSkill,
// clearShots() after it; calcDamage reads shotBoost().
import { SHOTS_PER_CAST, SHOT_KINDS, shotKey } from '../../../template/shotsData.js';
import { isMagicClass } from '../classes/classFamily.js';
import { uniqueEquipped } from '../equipment/itemBonuses.js';
import { getMaterialCount, spendMaterials } from '../player/materials.js';

const boosts = new WeakMap();
const kindInfo = id => SHOT_KINDS.find(kind => kind.id === id);

/** The grade of the worn weapon (shots must match it), or null with no weapon. */
export function weaponGrade(session) {
    const weapon = uniqueEquipped(session?.game?.equipmentStats || {}).find(item => item?.mainType === 'weapon');
    return weapon ? (weapon.grade || 'noGrade') : null;
}

const className = session => session?.game?.gameClass?.stats?.name || 'noClass';

/** Shot kinds this character may burn, best first. */
export const shotKindsFor = session => (isMagicClass(className(session)) ? ['blessed', 'spiritshot'] : ['soulshot']);

/** For the screen: the grade, per-cast cost, and how many charges of each fitting kind are owned. */
export function getShotsState(session) {
    const grade = weaponGrade(session);
    const perCast = grade ? SHOTS_PER_CAST[grade] || 1 : 0;
    return {
        enabled: Boolean(session?.game?.autoShots),
        grade,
        perCast,
        kinds: grade ? shotKindsFor(session).map(id => ({
            id, label: kindInfo(id).label, icon: kindInfo(id).icon, boost: kindInfo(id).boost,
            key: shotKey(id, grade), count: getMaterialCount(session, shotKey(id, grade)),
        })) : [],
    };
}

export function setAutoShots(session, enabled) {
    session.game.autoShots = Boolean(enabled);
    return session.game.autoShots;
}

/**
 * Burns the charges for one damage skill when auto-shots are on and enough are owned. Returns
 * {kind, spent, boost} or null; the boost stays armed until clearShots().
 */
export function armShots(session, skill) {
    boosts.delete(session);
    if (!skill?.isDealDamage || !session?.game?.autoShots) return null;
    const grade = weaponGrade(session);
    if (!grade) return null;
    const need = SHOTS_PER_CAST[grade] || 1;
    for (const id of shotKindsFor(session)) {
        const key = shotKey(id, grade);
        if (getMaterialCount(session, key) < need) continue;
        spendMaterials(session, {[key]: need});
        const boost = kindInfo(id).boost;
        boosts.set(session, boost);
        return {kind: id, spent: need, boost};
    }
    return null;
}

export const shotBoost = session => boosts.get(session) || 1;
export const clearShots = session => boosts.delete(session);
