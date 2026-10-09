// Attributes (Lineage II elements). A weapon carries one element and hits harder with it; armor pieces and
// shields carry an element and resist hits of it. Attribute stones are dropped by bosses of the same
// element; every stone adds points until the item reaches the cap of the stone tier (a stone carries a
// weapon up to 25, a crystal up to 75, a jewel up to 150; armor takes a fraction).
//
//   attack:  damage x (1 + points x 0.15%)   - x1.5 against a boss of the opposite element, x0.5 against its own
//   resist:  damage x (1 - points x 0.2%)    - the resistances of all worn pieces add up (150 at most)
//
// The attribute is stored as item.attribute = {element, value}.
import { ATTRIBUTE_GRADES, ATTRIBUTE_TIERS, ELEMENTS, attributeKey } from '../../../template/augmentData.js';
import { getMaterialCount, spendMaterials } from '../player/materials.js';
import { gradeIndex } from './catalog.js';
import { uniqueEquipped } from './itemBonuses.js';
import { isActuallyEquipped, syncEquippedSnapshot } from './snapshots.js';

export { ATTRIBUTE_GRADES, ATTRIBUTE_TIERS, ELEMENTS, attributeKey };

export const ATTACK_PER_POINT = 0.0015;
export const RESIST_PER_POINT = 0.002;
export const RESIST_CAP = 150;
export const WEAK_BONUS = 1.5;
export const SAME_ELEMENT_BONUS = 0.5;

const elementInfo = id => ELEMENTS.find(element => element.id === id) || null;
const tierInfo = id => ATTRIBUTE_TIERS.find(tier => tier.id === id) || null;

// Boss templates use older words for some elements.
const BOSS_ELEMENT = {lightning: 'wind', ice: 'water', light: 'holy', poison: 'dark'};

/** The attribute element a boss template's `element` stands for, or null. */
export function normalizeElement(value) {
    if (elementInfo(value)) return value;
    return BOSS_ELEMENT[value] || null;
}

export const canAttribute = item => ['weapon', 'armor', 'shield'].includes(item?.mainType) && ATTRIBUTE_GRADES.includes(item.grade);

const sideOf = item => (item.mainType === 'weapon' ? 'weapon' : 'armor');

/** Gold for taking an attribute off an item. */
export const clearGold = item => 20000 * (1 + Math.max(0, gradeIndex(item.grade)));

export function describeAttribute(attribute) {
    const info = elementInfo(attribute?.element);
    if (!info || !(attribute.value > 0)) return null;
    return {element: info.id, label: info.label, icon: info.icon, value: attribute.value};
}

/** Adds the points of one stone. Returns {ok, attribute} or {ok: false, reason}. */
export function addAttribute(session, item, element, tier) {
    if (!item || !canAttribute(item)) return {ok: false, reason: 'not_attributable'};
    if (item.timed) return {ok: false, reason: 'timed_item'};
    if (!elementInfo(element) || !tierInfo(tier)) return {ok: false, reason: 'unknown_stone'};
    const current = item.attribute;
    if (current?.value > 0 && current.element !== element) return {ok: false, reason: 'wrong_element'};

    const limits = tierInfo(tier)[sideOf(item)];
    const value = Number(current?.value) || 0;
    if (value >= limits.cap) return {ok: false, reason: 'attribute_tier_max', cap: limits.cap};
    if (!spendMaterials(session, {[attributeKey(tier, element)]: 1})) return {ok: false, reason: 'no_attribute_stone', stone: attributeKey(tier, element)};

    item.attribute = {element, value: Math.min(limits.cap, value + limits.add)};
    if (isActuallyEquipped(session, item)) syncEquippedSnapshot(session, item);
    return {ok: true, attribute: item.attribute};
}

/** Removes an attribute for gold (the stones are lost). */
export function clearAttribute(session, item) {
    if (!item || !canAttribute(item)) return {ok: false, reason: 'not_attributable'};
    if (!item.attribute) return {ok: false, reason: 'no_attribute'};
    const gold = clearGold(item);
    if ((Number(session.game.inventory.gold) || 0) < gold) return {ok: false, reason: 'not_enough_gold', gold};
    session.game.inventory.gold -= gold;
    item.attribute = null;
    if (isActuallyEquipped(session, item)) syncEquippedSnapshot(session, item);
    return {ok: true, gold};
}

/** What the worn gear gives: the weapon's element {element, value} and the resistances by element. */
export function attributeProfile(session) {
    const result = {attack: null, resist: {}};
    const stats = session?.game?.equipmentStats;
    if (!stats) return result;
    for (const item of uniqueEquipped(stats)) {
        const attribute = item?.attribute;
        if (!attribute || !(attribute.value > 0) || !elementInfo(attribute.element)) continue;
        if (item.mainType === 'weapon') {
            if (!result.attack || attribute.value > result.attack.value) result.attack = {element: attribute.element, value: attribute.value};
        } else if (item.mainType === 'armor' || item.mainType === 'shield') {
            result.resist[attribute.element] = Math.min(RESIST_CAP, (result.resist[attribute.element] || 0) + attribute.value);
        }
    }
    return result;
}

/** Damage factor of a weapon attribute against a target element (null for a target without one). */
export function attackFactor(attack, targetElement = null) {
    if (!attack || !(attack.value > 0)) return 1;
    let bonus = attack.value * ATTACK_PER_POINT;
    if (targetElement) {
        if (targetElement === elementInfo(attack.element)?.opposite) bonus *= WEAK_BONUS;
        else if (targetElement === attack.element) bonus *= SAME_ELEMENT_BONUS;
    }
    return 1 + bonus;
}

/** Damage factor of the worn armor against a hit of an element. */
export function resistFactor(resist, element) {
    if (!element) return 1;
    return 1 - Math.min(RESIST_CAP, Number(resist?.[element]) || 0) * RESIST_PER_POINT;
}

/** Fighter against fighter: the attacker's weapon element against the defender's resistance to it. */
export function pvpFactor(attackerProfile, defenderProfile) {
    const attack = attackerProfile?.attack;
    if (!attack) return 1;
    return attackFactor(attack) * resistFactor(defenderProfile?.resist, attack.element);
}

/** An item's card: what it carries and the stones the player holds that fit it. */
export function attributeInfo(session, item) {
    if (!canAttribute(item)) return null;
    const side = sideOf(item);
    const current = describeAttribute(item.attribute);
    const options = [];
    for (const tier of ATTRIBUTE_TIERS) {
        for (const element of ELEMENTS) {
            if (current && current.element !== element.id) continue;
            const stones = getMaterialCount(session, attributeKey(tier.id, element.id));
            if (!stones) continue;
            options.push({tier: tier.id, tierLabel: tier.label, element: element.id, icon: element.icon, label: element.label, stones, add: tier[side].add, cap: tier[side].cap, full: (current?.value || 0) >= tier[side].cap});
        }
    }
    return {side, current, options, clearGold: current ? clearGold(item) : 0};
}

/** The hero screen: weapon element and resistances. */
export function getAttributesState(session) {
    const profile = attributeProfile(session);
    return {
        attack: profile.attack ? {...describeAttribute(profile.attack), bonus: Math.round(profile.attack.value * ATTACK_PER_POINT * 1000) / 10} : null,
        resist: ELEMENTS.map(element => ({
            element: element.id, label: element.label, icon: element.icon,
            value: profile.resist[element.id] || 0,
            reduction: Math.round((profile.resist[element.id] || 0) * RESIST_PER_POINT * 1000) / 10,
        })),
    };
}
