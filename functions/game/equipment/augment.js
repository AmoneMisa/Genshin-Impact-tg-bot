// Life Stones (Lineage II augmentation): a stone of the item's grade plus gold adds one random bonus to a
// weapon or a piece of jewellery. Another stone replaces the bonus with a new roll.
//  - weapons roll an attack / crit / accuracy / hp / speed bonus, and a better stone (mid, high, top)
//    can also give the weapon a skill (lifestoneSkills.js);
//  - jewellery rolls a base stat (STR, DEX, CON, INT, WIT, MEN) or hp / mana / defence.
// The bonus is stored on the item as item.augment = {name, value, tier, skill?: {id, level}} and read by
// getEquipStatByName.js like a fixed item stat.
import { LIFESTONE_GRADES, LIFESTONE_TIERS, lifestoneKey as keyFor } from '../../../template/augmentData.js';
import { gradeInfo } from './catalog.js';
import { getMaterialCount, spendMaterials } from '../player/materials.js';
import { isActuallyEquipped, syncEquippedSnapshot } from './snapshots.js';
import { activeSkillState, describeSkill, isMagicWeapon, rollSkill } from './lifestoneSkills.js';
import { BASE_STAT_INFO } from '../player/baseStatsData.js';

export const lifestoneKey = keyFor;
export const AUGMENT_GRADES = LIFESTONE_GRADES;
export const AUGMENT_TIERS = LIFESTONE_TIERS.map(tier => tier.id);
// Real High Five augmentation price: the Life Stone plus Gemstones of a type that depends on the item's grade
// (Gemstone D for C/B, C for A/S, B for S80/S84) and a count that depends on the grade and on weapon / jewellery.
export const AUGMENT_GEM_GRADE = Object.freeze({C: 'D', B: 'D', A: 'C', S: 'C', S80: 'B', S84: 'B'});
export const AUGMENT_GEM_COUNT = Object.freeze({
    weapon: Object.freeze({C: 20, B: 30, A: 20, S: 25, S80: 36, S84: 36}),
    jewelry: Object.freeze({C: 200, B: 300, A: 200, S: 250, S80: 360, S84: 480}),
});

const tierInfo = id => LIFESTONE_TIERS.find(tier => tier.id === id) || null;

/** {key, count} of the Gemstones one augmentation of this item takes. */
export function augmentGems(item) {
    const grade = AUGMENT_GEM_GRADE[item?.grade];
    const count = AUGMENT_GEM_COUNT[item?.mainType === 'jewelry' ? 'jewelry' : 'weapon'][item?.grade];
    return grade && count ? {key: `craft_gem_${grade}`, count} : null;
}

// base/per: the value at the first grade and its growth per grade step (index in AUGMENT_GRADES, 0..5).
const WEAPON_BONUSES = Object.freeze([
    {name: 'attackMul', label: 'Атака', factor: true, base: 0.02, per: 0.008},
    {name: 'criticalDamage', label: 'Критический урон', factor: true, base: 0.02, per: 0.008},
    {name: 'criticalChance', label: 'Шанс крита', factor: false, base: 1, per: 0.6},
    {name: 'accuracy', label: 'Точность', factor: false, base: 2, per: 1},
    {name: 'maxHpMul', label: 'Максимальное HP', factor: true, base: 0.02, per: 0.008},
    {name: 'speedMul', label: 'Скорость боя', factor: true, base: 0.015, per: 0.006},
]);

const statBonus = name => ({name, label: BASE_STAT_INFO[name].name, factor: false, whole: true, base: 0.8, per: 0.25});
const JEWELRY_BONUSES = Object.freeze([
    statBonus('STR'), statBonus('DEX'), statBonus('CON'), statBonus('INT'), statBonus('WIT'), statBonus('MEN'),
    {name: 'maxHpMul', label: 'Максимальное HP', factor: true, base: 0.015, per: 0.006},
    {name: 'maxMpMul', label: 'Максимальная мана', factor: true, base: 0.015, per: 0.006},
    {name: 'defenceMul', label: 'Защита', factor: true, base: 0.015, per: 0.006},
]);

const poolOf = item => (item.mainType === 'jewelry' ? JEWELRY_BONUSES : WEAPON_BONUSES);

const round = value => Math.round(value * 1000) / 1000;
const gradeStep = grade => Math.max(0, AUGMENT_GRADES.indexOf(grade));

// Epic jewellery and weapons (boss drops, rented epics) cannot be augmented, as in Lineage II.
export const isEpicItem = item => Boolean(item?.epic || item?.epicWeapon || item?.epicBoss);

export const canAugment = item => (item?.mainType === 'weapon' || item?.mainType === 'jewelry')
    && !isEpicItem(item) && AUGMENT_GRADES.includes(item.grade) && Boolean(gradeInfo(item.grade));

/** Display form of an augment: "Атака +4.8%", "Сила +2", plus the weapon skill if there is one. */
export function describeAugment(augment) {
    if (!augment) return null;
    const bonus = [...WEAPON_BONUSES, ...JEWELRY_BONUSES].find(entry => entry.name === augment.name);
    if (!bonus) return null;
    return {
        name: bonus.label,
        text: bonus.factor ? `+${round(augment.value * 100)}%` : `+${round(augment.value)}`,
        tier: tierInfo(augment.tier) ? augment.tier : 'normal',
        skill: describeSkill(augment.skill),
    };
}

/** The stat entry the stat pipeline reads: factor stats are stored as the delta, folded in as 1 + delta. */
export function augmentStat(item, statName, isMul) {
    const augment = item?.augment;
    if (!augment || augment.name !== statName || typeof augment.value !== 'number') return null;
    return isMul ? 1 + augment.value : augment.value;
}

function roll(item, tier, random) {
    const step = gradeStep(item.grade);
    const pool = poolOf(item);
    const bonus = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
    const power = tierInfo(tier).power;
    // 70%..130% of the grade's value, more often near the middle.
    const spread = 0.7 + (random() + random()) * 0.3;
    const raw = (bonus.base + bonus.per * step) * power * spread;
    const augment = {name: bonus.name, value: bonus.whole ? Math.max(1, Math.round(raw)) : round(raw), tier};

    if (item.mainType === 'weapon' && random() < tierInfo(tier).skill) {
        const tierRank = AUGMENT_TIERS.indexOf(tier);
        // Grade step and stone quality raise the skill level, 1..5.
        const level = Math.max(1, Math.min(5, 1 + Math.floor(step / 2) + tierRank - 1));
        augment.skill = rollSkill(item, level, random);
    }
    return augment;
}

/**
 * Spends a Life Stone of the item's grade and tier plus the grade's Gemstones, and gives (or re-rolls) its bonus.
 * Returns {ok, augment, replaced, gems} or {ok: false, reason}.
 */
export function augmentItem(session, item, {tier = 'normal', random = Math.random} = {}) {
    if (isEpicItem(item)) return {ok: false, reason: 'epic_item'};
    if (!item || !canAugment(item)) return {ok: false, reason: 'not_augmentable'};
    if (!tierInfo(tier)) return {ok: false, reason: 'unknown_stone'};
    if (item.timed) return {ok: false, reason: 'timed_item'};
    const gems = augmentGems(item);
    if (getMaterialCount(session, gems.key) < gems.count) return {ok: false, reason: 'no_gemstones', gem: gems.key, count: gems.count};
    if (!spendMaterials(session, {[lifestoneKey(item.grade, tier)]: 1})) return {ok: false, reason: 'no_lifestone', stone: lifestoneKey(item.grade, tier)};

    spendMaterials(session, {[gems.key]: gems.count});
    const replaced = item.augment || null;
    item.augment = roll(item, tier, random);
    if (isActuallyEquipped(session, item)) syncEquippedSnapshot(session, item);
    return {ok: true, augment: item.augment, replaced, gems};
}

/** Stones in inventory, prices and the current bonus for an item's card; null when it cannot be augmented. */
export function augmentInfo(session, item, now = Date.now()) {
    if (!canAugment(item)) return null;
    const gems = augmentGems(item);
    return {
        kind: item.mainType,
        gems: {...gems, have: getMaterialCount(session, gems.key)},
        magic: isMagicWeapon(item),
        current: describeAugment(item.augment),
        active: isActuallyEquipped(session, item) ? activeSkillState(session, item, now) : null,
        tiers: LIFESTONE_TIERS.map(tier => ({
            id: tier.id,
            label: tier.label,
            key: lifestoneKey(item.grade, tier.id),
            stones: getMaterialCount(session, lifestoneKey(item.grade, tier.id)),
            skillChance: item.mainType === 'weapon' ? tier.skill : 0,
        })),
    };
}
