// Life Stones (Lineage II augmentation): a stone of the weapon's grade plus gold adds one random
// bonus to the weapon. Another stone replaces the bonus with a new roll. The bonus is stored on the
// item as item.augment = {name, value} and read by getEquipStatByName.js like a fixed item stat.
import getRandom from '../../getters/getRandom.js';
import { gradeInfo } from './catalog.js';
import { getMaterialCount, spendMaterials } from '../player/materials.js';
import { isActuallyEquipped, syncEquippedSnapshot } from './snapshots.js';

export const lifestoneKey = grade => `lifestone_${grade}`;
export const AUGMENT_GRADES = Object.freeze(['C', 'B', 'A', 'S', 'S80', 'S84']);
export const AUGMENT_GOLD = Object.freeze({C: 5000, B: 15000, A: 45000, S: 120000, S80: 300000, S84: 600000});

/** Possible bonuses and their value range per grade step (index in AUGMENT_GRADES, 0..5). */
const BONUSES = Object.freeze([
    {name: 'attackMul', label: 'Атака', factor: true, base: 0.02, per: 0.008},
    {name: 'criticalDamage', label: 'Критический урон', factor: true, base: 0.02, per: 0.008},
    {name: 'criticalChance', label: 'Шанс крита', factor: false, base: 1, per: 0.6},
    {name: 'accuracy', label: 'Точность', factor: false, base: 2, per: 1},
    {name: 'maxHpMul', label: 'Максимальное HP', factor: true, base: 0.02, per: 0.008},
    {name: 'speedMul', label: 'Скорость боя', factor: true, base: 0.015, per: 0.006},
]);

const round = value => Math.round(value * 1000) / 1000;
const gradeStep = grade => Math.max(0, AUGMENT_GRADES.indexOf(grade));

export const canAugment = item => item?.mainType === 'weapon' && AUGMENT_GRADES.includes(item.grade) && Boolean(gradeInfo(item.grade));

/** Display form of an augment: "Атака +4.8%" / "Шанс крита +1.6". */
export function describeAugment(augment) {
    if (!augment) return null;
    const bonus = BONUSES.find(entry => entry.name === augment.name);
    if (!bonus) return null;
    return {name: bonus.label, text: bonus.factor ? `+${round(augment.value * 100)}%` : `+${round(augment.value)}`};
}

/** The stat entry the stat pipeline reads: factor stats are stored as the delta, folded in as 1 + delta. */
export function augmentStat(item, statName, isMul) {
    const augment = item?.augment;
    if (!augment || augment.name !== statName || typeof augment.value !== 'number') return null;
    return isMul ? 1 + augment.value : augment.value;
}

function roll(grade, random) {
    const step = gradeStep(grade);
    const bonus = BONUSES[Math.floor(random() * BONUSES.length)];
    const scale = bonus.base + bonus.per * step;
    // 70%..130% of the grade's value, more often near the middle.
    const spread = 0.7 + (random() + random()) * 0.3;
    return {name: bonus.name, value: round(scale * spread)};
}

/**
 * Spends a Life Stone of the weapon's grade and gold, and gives (or re-rolls) its bonus.
 * Returns {ok, augment, replaced} or {ok: false, reason}.
 */
export function augmentItem(session, item, {random = Math.random} = {}) {
    if (!item || !canAugment(item)) return {ok: false, reason: 'not_augmentable'};
    if (item.timed) return {ok: false, reason: 'timed_item'};
    const inventory = session.game.inventory;
    const gold = AUGMENT_GOLD[item.grade];
    if ((Number(inventory.gold) || 0) < gold) return {ok: false, reason: 'not_enough_gold', gold};
    if (!spendMaterials(session, {[lifestoneKey(item.grade)]: 1})) return {ok: false, reason: 'no_lifestone', stone: lifestoneKey(item.grade)};

    inventory.gold -= gold;
    const replaced = item.augment || null;
    item.augment = roll(item.grade, random);
    if (isActuallyEquipped(session, item)) syncEquippedSnapshot(session, item);
    return {ok: true, augment: item.augment, replaced, gold};
}

/** Stones in inventory and the gold price for an item's card; null when it cannot be augmented. */
export function augmentInfo(session, item) {
    if (!canAugment(item)) return null;
    return {
        stones: getMaterialCount(session, lifestoneKey(item.grade)),
        gold: AUGMENT_GOLD[item.grade],
        current: describeAugment(item.augment),
    };
}
