// The first skills of a character are real Lineage II (High Five) skills of its start class, not invented ones:
// a Human Fighter strikes with Power Strike and Mortal Blow, a Human Mystic casts Wind Strike and Ice Bolt, a Cleric
// heals with Heal. Each keeps the engine numbers of the slot it takes (damageModifier, cooldown, cost: the class
// balance is built on them) and gets the real name, the real id (`l2Id`, which gives its icon, its level and its power
// by the hero level: functions/game/player/skillLevel.js) and the real level at which the hero learns it.
import l2 from './l2Classes.js';

const firstNeed = id => {
    let need = Infinity;
    for (const rows of Object.values(l2.learn)) for (const [sid, , n] of rows) if (sid === id && n < need) need = n;
    return Number.isFinite(need) ? need : 1;
};

const PHYSICAL = 'Мощный удар из арсенала класса. Сила растёт с уровнем умения.';
const MAGIC = 'Заклинание из арсенала класса. Сила растёт с уровнем умения.';

/**
 * One slot: the engine skill of the family (its numbers) under the name, id and learning level of the real skill.
 * `id` null is the basic attack: it is not a skill of the real tree and carries no id.
 */
function slotOf(base, id, patch = {}) {
    const real = id === null ? {name: 'Attack', needLvl: 1} : {name: l2.skills[String(id)].name, l2Id: id, needLvl: firstNeed(id)};
    const skill = {...base, ...real, ...patch};
    delete skill.costHpPct;
    for (const key of Object.keys(skill)) if (skill[key] === undefined) delete skill[key];
    return skill;
}

/** `baseSkills` is the invented kit by family; the result are the real kits by family and by start class. */
export function buildStartKits(baseSkills) {
    const kit = (family, slots) => slots.map(([id, patch], slot) => slotOf(baseSkills[family][slot], id, {...patch, slot}));
    const strike = description => ({effect: 'strong_attack', description: description || PHYSICAL});
    const fatal = {...strike('Смертельный удар: повышенный шанс критического удара.'), critChanceBonus: 30};
    const basic = description => ({effect: 'common_attack', description});
    const heal = {effect: 'heal', description: 'Исцеляет часть здоровья.'};
    const drain = {effect: 'vampire', vampirePower: 0.2, description: 'Заклинание, возвращающее часть урона здоровьем.',
        damageModifier: 2.5, cooldown: 45, cost: 67, isSelf: false, isDealDamage: true, isShield: false, shieldPower: undefined};

    const families = {
        warrior: kit('warrior', [[null, basic('Основная атака оружием: без перезарядки.')], [3, strike()], [16, fatal]]),
        berserk: kit('berserk', [[null, basic('Основная атака оружием: без перезарядки.')], [3, {...strike(), cost: 30}], [29, {...strike(), cost: 60}]]),
        rogue: kit('rogue', [[null, basic('Основная атака кинжалом: без перезарядки.')], [16, fatal], [56, {...strike('Усиленный выстрел.'), effect: 'strong_attack', hits: undefined, damageModifier: 4.16}]]),
        archer: kit('archer', [[null, basic('Основной выстрел: без перезарядки.')], [56, strike('Усиленный выстрел.')],
            [16, {...fatal, effect: 'strong_attack'}]]),
        mage: kit('mage', [[1177, basic('Основное заклинание: без перезарядки.')], [1184, {effect: 'magic_attack', description: MAGIC}], [1147, drain]]),
        priest: kit('priest', [[null, basic('Основная атака: без перезарядки.')], [1011, heal],
            [1031, {effect: 'magic_attack', description: MAGIC, damageModifier: 2.4, cooldown: 45, cost: 40}]]),
    };
    // the other mystics have their own first spells
    const mystic = (second, third) => kit('mage', [[1177, basic('Основное заклинание: без перезарядки.')], [second, {effect: 'magic_attack', description: MAGIC}], third]);
    const classes = {
        humanMystic: families.mage,
        darkMystic: families.mage,
        elvenMystic: mystic(1184, [1015, {...heal, healPower: 0.25, cooldown: 30, cost: 68, isSelf: true, isHeal: true, isDealDamage: false, isShield: false,
            shieldPower: undefined, damageModifier: undefined}]),
        orcMystic: mystic(1090, [1100, {effect: 'magic_attack', description: MAGIC, damageModifier: 3, cooldown: 30, cost: 50, isSelf: false,
            isDealDamage: true, isShield: false, shieldPower: undefined}]),
    };
    return {families, classes};
}
