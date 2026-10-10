// Arrows and bolts (High Five): a bow burns one arrow and a crossbow one bolt of the weapon's grade for every damage
// skill. A pack can be converted: arrows and bolts of one grade swap one for one (the real exchange of the Black
// Marketeer of Mammon, 100 arrows for 100 bolts, free).
import {uniqueEquipped} from '../equipment/itemBonuses.js';
import {addMaterial, getMaterialCount, materialInfo, spendMaterials} from '../player/materials.js';

/** Real item ids; they are collectable materials `l2_<id>` that monsters drop and merchants sell. */
export const AMMO_IDS = Object.freeze({
    arrow: Object.freeze({noGrade: 17, D: 1341, C: 1342, B: 1343, A: 1344, S: 1345}),
    bolt: Object.freeze({noGrade: 9632, D: 9633, C: 9634, B: 9635, A: 9636, S: 9637}),
});
export const AMMO_GRADES = Object.freeze(Object.keys(AMMO_IDS.arrow));
const KIND_BY_WEAPON = Object.freeze({bow: 'arrow', crossbow: 'bolt'});
/** Starting stock of a character with a bow or crossbow, so that nobody is left without ammunition. */
export const STARTER_AMMO = 500;

export const ammoKey = (kind, grade) => `l2_${AMMO_IDS[kind]?.[grade]}`;
const gradeOf = weapon => (['S80', 'S84'].includes(weapon.grade) ? 'S' : weapon.grade || 'noGrade');

/** The ammunition of the worn weapon: {kind, grade, key} or null when the weapon needs none. */
export function wornAmmo(session) {
    const weapon = uniqueEquipped(session?.game?.equipmentStats || {}).find(item => item?.mainType === 'weapon');
    const kind = KIND_BY_WEAPON[weapon?.kind];
    if (!kind) return null;
    const grade = gradeOf(weapon);
    return AMMO_IDS[kind][grade] ? {kind, grade, key: ammoKey(kind, grade)} : null;
}

/** Does this skill burn ammunition: only damage skills do, and only with a bow or a crossbow. */
export const needsAmmo = (session, skill) => Boolean(skill?.isDealDamage && wornAmmo(session));

export function hasAmmo(session, skill) {
    if (!needsAmmo(session, skill)) return true;
    grantStarterAmmo(session);
    return getMaterialCount(session, wornAmmo(session).key) >= 1;
}

/** Burns one arrow / bolt for a skill (the caller has checked hasAmmo). Returns what was spent or null. */
export function spendAmmo(session, skill) {
    if (!needsAmmo(session, skill)) return null;
    const ammo = wornAmmo(session);
    return spendMaterials(session, {[ammo.key]: 1}) ? {key: ammo.key, kind: ammo.kind, amount: 1} : null;
}

/** For the screens: what the worn weapon shoots and how many are left. */
export function getAmmoState(session) {
    const ammo = wornAmmo(session);
    if (!ammo) return null;
    return {...ammo, name: materialInfo(ammo.key).name, count: getMaterialCount(session, ammo.key)};
}

/** Grants the starting stock once to a character who wears a bow or crossbow. */
export function grantStarterAmmo(session) {
    const ammo = wornAmmo(session);
    if (!ammo || session.game.ammoStarter) return false;
    session.game.ammoStarter = true;
    addMaterial(session, ammo.key, STARTER_AMMO);
    return true;
}

/** Converts arrows to bolts or the other way round, one for one, within a grade. */
export function convertAmmo(session, {from, grade, count}) {
    if (!['arrow', 'bolt'].includes(from)) return {ok: false, reason: 'invalid_kind'};
    if (!AMMO_IDS[from][grade]) return {ok: false, reason: 'invalid_grade'};
    const amount = Math.floor(Number(count));
    if (!Number.isSafeInteger(amount) || amount < 1) return {ok: false, reason: 'invalid_count'};
    const to = from === 'arrow' ? 'bolt' : 'arrow';
    if (!spendMaterials(session, {[ammoKey(from, grade)]: amount})) return {ok: false, reason: 'not_enough_ammo'};
    addMaterial(session, ammoKey(to, grade), amount);
    return {ok: true, from, to, grade, count: amount, key: ammoKey(to, grade)};
}
