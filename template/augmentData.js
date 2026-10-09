// Plain data of the Lineage II style item upgrades, shared by the materials template and the game code:
// Life Stones (augmentation of weapons and jewellery) and attribute stones (elements of weapons and armor).
// See functions/game/equipment/augment.js and attributes.js.

/** Grades whose weapons and jewellery can be augmented. */
export const LIFESTONE_GRADES = Object.freeze(['C', 'B', 'A', 'S', 'S80', 'S84']);

/**
 * Life Stone qualities. `power` scales the bonus, `gold` the price, `skill` is the chance that a weapon
 * also gets a skill. The plain stone keeps the old material keys (lifestone_S), the others are
 * lifestone_<tier>_<grade>.
 */
export const LIFESTONE_TIERS = Object.freeze([
    {id: 'normal', label: '', power: 1, gold: 1, skill: 0},
    {id: 'mid', label: 'средний', power: 1.3, gold: 2, skill: 0.25},
    {id: 'high', label: 'высокий', power: 1.6, gold: 3.5, skill: 0.5},
    {id: 'top', label: 'высший', power: 2, gold: 6, skill: 0.8},
]);

export const lifestoneKey = (grade, tier = 'normal') => (tier === 'normal' ? `lifestone_${grade}` : `lifestone_${tier}_${grade}`);

/** The six elements of Lineage II attributes; every element is strong against the opposite one. */
export const ELEMENTS = Object.freeze([
    {id: 'fire', label: 'Огонь', icon: '🔥', opposite: 'water'},
    {id: 'water', label: 'Вода', icon: '💧', opposite: 'fire'},
    {id: 'wind', label: 'Ветер', icon: '🌪️', opposite: 'earth'},
    {id: 'earth', label: 'Земля', icon: '🪨', opposite: 'wind'},
    {id: 'holy', label: 'Свет', icon: '✨', opposite: 'dark'},
    {id: 'dark', label: 'Тьма', icon: '🌑', opposite: 'holy'},
]);

/**
 * Attribute stones: each adds `add` points to an item until the item holds `cap`. Armor pieces take
 * a fraction of the weapon values because five pieces add up.
 */
export const ATTRIBUTE_TIERS = Object.freeze([
    {id: 'stone', label: 'Камень атрибута', weapon: {add: 5, cap: 25}, armor: {add: 2, cap: 10}},
    {id: 'crystal', label: 'Кристалл атрибута', weapon: {add: 10, cap: 75}, armor: {add: 4, cap: 30}},
    {id: 'jewel', label: 'Самоцвет атрибута', weapon: {add: 25, cap: 150}, armor: {add: 10, cap: 60}},
]);

/** Grades that can carry an attribute. */
export const ATTRIBUTE_GRADES = Object.freeze(['B', 'A', 'S', 'S80', 'S84']);

export const attributeKey = (tier, element) => `attr_${tier}_${element}`;

/**
 * Where Life Stones are sold, as in Lineage II: mid stones in the gold shop up to grade S (level 78),
 * high stones in the clan shop up to S80, top stones in the Donate shop up to S84. Prices by grade.
 */
export const LIFESTONE_SHOP = Object.freeze({
    mid: Object.freeze({C: 7500, B: 22500, A: 67500, S: 180000}),
    high: Object.freeze({
        C: Object.freeze({gold: 30000, crystals: 15}),
        B: Object.freeze({gold: 60000, crystals: 30}),
        A: Object.freeze({gold: 150000, crystals: 60}),
        S: Object.freeze({gold: 350000, crystals: 100}),
        S80: Object.freeze({gold: 700000, crystals: 160}),
    }),
    top: Object.freeze({C: 4, B: 6, A: 10, S: 18, S80: 28, S84: 40}),
});
