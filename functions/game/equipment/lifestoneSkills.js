// Skills a Life Stone can add to a weapon (Lineage II augmentation skills). Three kinds:
//  - passive: a permanent stat bonus while the weapon is worn;
//  - chance: a chance on every damaging hit to hit harder;
//  - active: a button on the forge screen that gives a timed bonus (with a long cooldown).
// The weapon stores {id, level}; the numbers always come from this table.
import { uniqueEquipped } from './itemBonuses.js';
import { isActuallyEquipped } from './snapshots.js';

export const ACTIVE_SECONDS = 10 * 60;
export const ACTIVE_COOLDOWN_SECONDS = 60 * 60;

// for: 'physical' | 'magic' | undefined (any weapon). flat: the bonus is points, not a share.
const passive = (id, name, label, stat, per, extra = {}) => ({ id: `passive_${id}`, kind: 'passive', name, label, stat, per, ...extra });
const active = (id, name, label, stat, per, extra = {}) => ({ id: `active_${id}`, kind: 'active', name, label, stat, per, ...extra });
const chance = (id, name, chanceBase, chancePer, mulBase, mulPer, extra = {}) => ({ id: `chance_${id}`, kind: 'chance', name, chance: chanceBase, chancePer, mul: mulBase, mulPer, ...extra });

export const LS_SKILLS = Object.freeze([
    passive('duel_might', 'Дуэльная мощь', 'Атака', 'attackMul', 0.015, { for: 'physical' }),
    passive('magic_power', 'Магическая мощь', 'Атака', 'attackMul', 0.015, { for: 'magic' }),
    passive('magic_barrier', 'Магический барьер', 'Защита', 'defenceMul', 0.015),
    passive('focus', 'Фокус', 'Шанс крита', 'criticalChance', 0.8, { flat: true }),
    passive('guidance', 'Наведение', 'Точность', 'accuracy', 1.2, { flat: true }),
    passive('haste', 'Ускорение', 'Скорость боя', 'speedMul', 0.01),
    passive('vitality', 'Живучесть', 'Максимальное HP', 'maxHpMul', 0.015),
    passive('clarity', 'Ясность', 'Максимальная мана', 'maxMpMul', 0.02, { for: 'magic' }),
    chance('critical_anger', 'Критический гнев', 0.05, 0.015, 0.2, 0.06, { for: 'physical' }),
    chance('death_blow', 'Смертельный удар', 0.02, 0.01, 0.6, 0.15),
    chance('magic_burst', 'Магический всплеск', 0.06, 0.015, 0.25, 0.07, { for: 'magic' }),
    active('might', 'Мощь', 'Атака', 'attackMul', 0.04, { for: 'physical' }),
    active('empower', 'Усиление', 'Атака', 'attackMul', 0.05, { for: 'magic' }),
    active('haste', 'Рывок', 'Скорость боя', 'speedMul', 0.03),
    active('shield', 'Щит', 'Защита', 'defenceMul', 0.05),
    active('focus', 'Сосредоточение', 'Шанс крита', 'criticalChance', 2, { flat: true }),
].map(Object.freeze));

const KIND_TITLE = { passive: 'Пассивно', chance: 'Шанс', active: 'Активно' };

const round = value => Math.round(value * 1000) / 1000;
const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export const skillById = id => LS_SKILLS.find(skill => skill.id === id) || null;

/** Is this weapon a staff-like one (mage and priest lines)? */
export const isMagicWeapon = item => Array.isArray(item?.classOwner) && item.classOwner.some(owner => owner === 'mage' || owner === 'priest');

const fitsWeapon = (skill, item) => !skill.for || skill.for === (isMagicWeapon(item) ? 'magic' : 'physical');

export function rollSkill(item, level, random = Math.random) {
    const pool = LS_SKILLS.filter(skill => fitsWeapon(skill, item));
    const skill = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
    return { id: skill.id, level };
}

export function skillChance(skill, level) {
    return Math.min(0.5, skill.chance + skill.chancePer * (level - 1));
}

export function skillMultiplier(skill, level) {
    return skill.mul + skill.mulPer * (level - 1);
}

const bonusAt = (skill, level) => skill.per * level;

function effectText(skill, level) {
    if (skill.kind === 'chance') {
        return `${round(skillChance(skill, level) * 100)}% шанс · урон +${round(skillMultiplier(skill, level) * 100)}%`;
    }
    const value = bonusAt(skill, level);
    const amount = skill.flat ? `+${round(value)}` : `${value > 0 ? '+' : ''}${round(value * 100)}%`;
    return `${skill.label} ${amount}${skill.kind === 'active' ? ` на ${ACTIVE_SECONDS / 60} мин` : ''}`;
}

/** Display form of a skill stored on an augment: {id, kind, title, name, level, text}. */
export function describeSkill(entry) {
    const skill = skillById(entry?.id);
    if (!skill) return null;
    const level = Math.max(1, Math.floor(number(entry.level, 1)));
    return { id: skill.id, kind: skill.kind, title: KIND_TITLE[skill.kind], name: skill.name, level, text: effectText(skill, level) };
}

/** The skills of the worn weapons: [{skill, level}] (a two-handed weapon is counted once). */
export function equippedSkills(session) {
    const result = [];
    for (const item of uniqueEquipped(session?.game?.equipmentStats || {})) {
        const entry = item?.augment?.skill;
        const skill = skillById(entry?.id);
        if (skill && item.mainType === 'weapon') result.push({ skill, level: Math.max(1, Math.floor(number(entry.level, 1))) });
    }
    return result;
}

/** Stat deltas of the passive skills of worn weapons. */
export function passiveSkillModifiers(session) {
    const result = {};
    for (const { skill, level } of equippedSkills(session)) {
        if (skill.kind === 'passive') result[skill.stat] = (result[skill.stat] || 0) + bonusAt(skill, level);
    }
    return result;
}

/** Stat deltas of a running active skill (session.game.lsBuff = {id, level, until, readyAt}). */
export function activeSkillModifiers(session, now = Date.now()) {
    const buff = session?.game?.lsBuff;
    const skill = skillById(buff?.id);
    if (!skill || skill.kind !== 'active' || number(buff.until) <= now) return {};
    return { [skill.stat]: bonusAt(skill, Math.max(1, number(buff.level, 1))) };
}

/** Damage factor from the chance skills of the worn weapons: 1 when none fires. */
export function chanceSkillFactor(chances, random = Math.random) {
    let factor = 1;
    for (const { skill, level } of chances || []) {
        if (random() < skillChance(skill, level)) factor *= 1 + skillMultiplier(skill, level);
    }
    return factor;
}

export const equippedChanceSkills = session => equippedSkills(session).filter(({ skill }) => skill.kind === 'chance');

/** The active skill of a worn weapon and the state of its cooldown, for the weapon's card. */
export function activeSkillState(session, item, now = Date.now()) {
    const entry = item?.augment?.skill;
    const skill = skillById(entry?.id);
    if (!skill || skill.kind !== 'active') return null;
    const buff = session?.game?.lsBuff;
    const readyAt = number(buff?.readyAt);
    return {
        name: skill.name,
        running: number(buff?.until) > now && buff?.id === skill.id,
        cooldownMs: Math.max(0, readyAt - now),
    };
}

/** Uses the active skill of a worn weapon. The caller saves the session. */
export function activateSkill(session, item, now = Date.now()) {
    const entry = item?.augment?.skill;
    const skill = skillById(entry?.id);
    if (!skill || skill.kind !== 'active') return { ok: false, reason: 'no_active_skill' };
    if (!isActuallyEquipped(session, item)) return { ok: false, reason: 'not_equipped' };
    const readyAt = number(session.game.lsBuff?.readyAt);
    if (readyAt > now) return { ok: false, reason: 'skill_cooldown', cooldownMs: readyAt - now };
    session.game.lsBuff = {
        id: skill.id,
        level: Math.max(1, Math.floor(number(entry.level, 1))),
        until: now + ACTIVE_SECONDS * 1000,
        readyAt: now + ACTIVE_COOLDOWN_SECONDS * 1000,
    };
    return { ok: true, id: skill.id, name: skill.name, seconds: ACTIVE_SECONDS };
}
