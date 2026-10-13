// H5: one attack element; armor has up to three defenses without opposite pairs.
// Legacy item.attribute values remain readable without changing their meaning.
import { ATTRIBUTE_GRADES, ATTRIBUTE_TIERS, ELEMENTS, attributeKey } from '../../../template/augmentData.js';
import { getMaterialCount, spendMaterials } from '../player/materials.js';
import {spendUsableMaterial,usableMaterialCount} from '../player/boundMaterials.js';
import { gradeIndex } from './catalog.js';
import {l2RawStat} from '../player/l2Effects.js';
import {hallElementResist} from '../clans/clanHall.js';
import { uniqueEquipped } from './itemBonuses.js';
import { isActuallyEquipped, syncEquippedSnapshot } from './snapshots.js';
import {ATTRIBUTE_ITEMS, CLOAK_ATTRIBUTES} from '../../../template/l2AttributeRules.js';

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

export const canAttribute = item => Boolean(item && !item.shadow && ATTRIBUTE_GRADES.includes(item.grade)
    && (item.mainType === 'weapon' || (item.mainType === 'armor' && ['body','greaves','fullBody','helmet','gloves','boots'].includes(item.category)))
    && (item.elementEnabled === true || ATTRIBUTE_ITEMS[item.name] || item.epicWeapon || item.custom));

// Read legacy armor as the defense it originally granted. Migration never flips an old stone.
export function armorAttributes(item) {
    if (item?.attributes && typeof item.attributes === 'object') return item.attributes;
    return item?.attribute?.value > 0 && elementInfo(item.attribute.element) ? {[item.attribute.element]: Number(item.attribute.value)} : {};
}

const sideOf = item => (item.mainType === 'weapon' ? 'weapon' : 'armor');

/** Gold for taking an attribute off an item. */
export const clearGold = item => 20000 * (1 + Math.max(0, gradeIndex(item.grade)));

export function describeAttribute(attribute) {
    const info = elementInfo(attribute?.element);
    if (!info || !(attribute.value > 0)) return null;
    return {element: info.id, label: info.label, icon: info.icon, value: attribute.value};
}

/** Shared preview and mutation guard. Never spends stones. */
export function attributeEligibility(item, element, tier) {
    if (!canAttribute(item)) return {ok:false,reason:'not_attributable'};
    if (item.timed) return {ok:false,reason:'timed_item'};
    if (!elementInfo(element) || !tierInfo(tier)) return {ok:false,reason:'unknown_stone'};
    const weapon=item.mainType==='weapon', defense=weapon?element:elementInfo(element).opposite;
    const attributes=armorAttributes(item);
    const value=Number(weapon?item.attribute?.value:attributes[defense])||0;
    if (weapon && value>0 && item.attribute.element!==element) return {ok:false,reason:'wrong_element'};
    if (!weapon && attributes[element]>0) return {ok:false,reason:'opposite_element'};
    if (!weapon && !(attributes[defense]>0) && Object.values(attributes).filter(v=>v>0).length>=3) return {ok:false,reason:'attribute_slots_full'};
    const cap=tierInfo(tier)[sideOf(item)].cap;
    return value>=cap?{ok:false,reason:'attribute_tier_max',cap}:{ok:true,cap};
}

/** Adds the points of one stone. Returns {ok, attribute} or {ok: false, reason}. */
export function addAttribute(session, item, element, tier, {random = Math.random} = {}) {
    const eligibility=attributeEligibility(item,element,tier);
    if (!eligibility.ok) return eligibility;
    const weapon = item.mainType === 'weapon';
    const defense = weapon ? element : elementInfo(element).opposite;
    const attributes = {...armorAttributes(item)};
    const current = weapon ? item.attribute : {element: defense, value: attributes[defense] || 0};

    const limits = tierInfo(tier)[sideOf(item)];
    const value = Number(current?.value) || 0;
    if (!spendUsableMaterial(session, attributeKey(tier, element))) return {ok: false, reason: 'no_attribute_stone', stone: attributeKey(tier, element)};

    if (random() >= tierInfo(tier).chance) return {ok: true, success: false, attribute: current, consumed: true};
    const next = Math.min(limits.cap, value + (weapon && value === 0 ? 20 : limits.add));
    if (weapon) item.attribute = {element, value: next};
    else {item.attributes = {...attributes, [defense]: next}; item.attribute = null;}
    item.attributeVersion = 2;
    if (isActuallyEquipped(session, item)) syncEquippedSnapshot(session, item);
    return {ok: true, success: true, attribute: {element: defense, value: next}};
}

/** Removes an attribute for gold (the stones are lost). */
export function clearAttribute(session, item) {
    if (!item) return {ok: false, reason: 'not_attributable'};
    if (!item.attribute && !Object.keys(armorAttributes(item)).length) return {ok: false, reason: 'no_attribute'};
    const gold = clearGold(item);
    if ((Number(session.game.inventory.gold) || 0) < gold) return {ok: false, reason: 'not_enough_gold', gold};
    session.game.inventory.gold -= gold;
    item.attribute = null;
    item.attributes = {};
    item.attributeVersion = 2;
    if (isActuallyEquipped(session, item)) syncEquippedSnapshot(session, item);
    return {ok: true, gold};
}

/** What the worn gear gives: the weapon's element {element, value} and the resistances by element. */
export function attributeProfile(session) {
    const result = {attack: null, resist: {}};
    const stats = session?.game?.equipmentStats;
    const hall=hallElementResist(session);
    for(const element of ['fire','water','wind','earth','holy','dark']){const bonus=l2RawStat(session,element+'Res')+hall;if(bonus)result.resist[element]=bonus;}
    if (!stats) return result;
    for (const item of uniqueEquipped(stats)) {
        const cloak = CLOAK_ATTRIBUTES[item.name];
        if (cloak) for (const [element, value] of Object.entries(cloak.resist)) result.resist[element] = (result.resist[element] || 0) + value;
        if (item.mainType !== 'weapon') {
            for (const [element, value] of Object.entries(armorAttributes(item))) if (elementInfo(element) && value > 0) result.resist[element] = (result.resist[element] || 0) + Number(value);
            continue;
        }
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
    return elementalFactor(attack.value, typeof targetElement === 'object' ? Number(targetElement?.[attack.element]) || 0 : 0);
}

// High Five Formulas.calcAttributeBonus. NPC element alone is not elemental defense.
export function elementalFactor(attack, defense=0) {
    if(attack<=defense||!attack)return 1;
    let a=.25,d=.2894;
    if(attack>=450){[a,d]=defense>=450?[.06909,.078]:defense>=350?[.0887,.1007]:[.129,.1473];}
    else if(attack>=300){[a,d]=defense>=300?[.0887,.1007]:defense>=150?[.129,.1473]:[.25,.2894];}
    else if(attack>=150){[a,d]=defense>=150?[.129,.1473]:defense>=0?[.25,.2894]:[.4,.55];}
    else if(defense<0){a=.4;d=.55;}
    const diff=attack-defense,max=diff>=300?100:diff>=150?70:40;
    return Math.max(1,1+Math.max(-50,Math.min(max,a*(attack+100)**2/144-d*(defense+100)**2/169))/100);
}

/** Damage factor of the worn armor against a hit of an element. */
export function resistFactor(resist, element, attack=0) {
    if (!element) return 1;
    return elementalFactor(attack, Number(resist?.[element]) || 0);
}

/** Fighter against fighter: the attacker's weapon element against the defender's resistance to it. */
export function pvpFactor(attackerProfile, defenderProfile) {
    const attack = attackerProfile?.attack;
    if (!attack) return 1;
    return elementalFactor(attack.value,Number(defenderProfile?.resist?.[attack.element])||0);
}

/** An item's card: what it carries and the stones the player holds that fit it. */
export function attributeInfo(session, item) {
    if (!canAttribute(item) && !item?.attribute && !Object.keys(armorAttributes(item)).length) return null;
    const side = sideOf(item);
    const currents = side === 'weapon' ? [describeAttribute(item.attribute)].filter(Boolean) : Object.entries(armorAttributes(item)).map(([element, value]) => describeAttribute({element, value})).filter(Boolean);
    const current = currents[0] || null;
    const options = [];
    for (const tier of ATTRIBUTE_TIERS) {
        for (const element of ELEMENTS) {
            if (!canAttribute(item)) continue;
            const defense = side === 'weapon' ? element.id : element.opposite;
            if (side === 'weapon' && current && current.element !== element.id) continue;
            if (side === 'armor' && (currents.some(c => c.element === element.id) || (currents.length >= 3 && !currents.some(c => c.element === defense)))) continue;
            const value = currents.find(c => c.element === defense)?.value || 0;
            const stones = usableMaterialCount(session, attributeKey(tier.id, element.id));
            if (!stones) continue;
            options.push({tier: tier.id, tierLabel: tier.label, element: element.id, icon: element.icon, label: side === 'weapon' ? element.label : elementInfo(defense).label + ' · защита', stones, chance: tier.chance, add: side === 'weapon' && !value ? 20 : tier[side].add, cap: tier[side].cap, full: value >= tier[side].cap});
        }
    }
    const eligibility=ATTRIBUTE_TIERS.flatMap(tier=>ELEMENTS.map(element=>({tier:tier.id,element:element.id,...attributeEligibility(item,element.id,tier.id)})));
    return {side, current, currents, options, eligibility, clearGold: current ? clearGold(item) : 0};
}

/** The hero screen: weapon element and resistances. */
export function getAttributesState(session) {
    const profile = attributeProfile(session);
    return {
        attack: profile.attack ? {...describeAttribute(profile.attack), bonus: Math.round((elementalFactor(profile.attack.value,0)-1)*1000)/10} : null,
        resist: ELEMENTS.map(element => ({
            element: element.id, label: element.label, icon: element.icon,
            value: profile.resist[element.id] || 0,
            reduction: null,
        })),
    };
}
