// Skills taught by the 2nd and 3rd professions (see classTree.js). Each promoted
// class repeats its parent's skills in the same slots - so a skill's enchant level
// survives a promotion - and adds two of its own after them. Field reference:
// classSkillsTemplate.js.

const flags = {cooldown: 0, isSelf: false, isDealDamage: false, isHeal: false, isShield: false, isBuff: false, costHp: 0, cost: 0};

/** Damage skill. */
const hit = (name, description, tier, needLvl, cooldown, cost, extra) => ({
    name, description, effect: "strong_attack", ...flags, isDealDamage: true, tier, needLvl, cooldown, cost, ...extra
});
const heal = (name, description, tier, needLvl, cooldown, cost, healPower, extra) => ({
    name, description, effect: "heal", ...flags, isSelf: true, isHeal: true, tier, needLvl, cooldown, cost, healPower, ...extra
});
const shield = (name, description, tier, needLvl, cooldown, cost, shieldPower, extra) => ({
    name, description, effect: "shield", ...flags, isSelf: true, isShield: true, tier, needLvl, cooldown, cost, shieldPower, ...extra
});
/** Self buff (no damage). */
const buff = (name, description, tier, needLvl, cooldown, cost, buffs, extra) => ({
    name, description, effect: "buff", ...flags, isSelf: true, isBuff: true, tier, needLvl, cooldown, cost, buffs, ...extra
});

export const professionSkills = {
    // --- Паладин -----------------------------------------------------------
    crusader: [
        hit("Удар возмездия", "Карающий удар на 300% урона. Возвращает 8% нанесённого урона здоровьем.", 2, 22, 16, 70,
            {effect: "vampire", damageModifier: 3, vampirePower: 0.08}),
        buff("Клятва света", "Клятва придаёт силы: +35% к урону по боссу на следующие 4 атаки.", 2, 28, 60, 90,
            [{kind: "damage", amount: 35, charges: 4}])
    ],
    phoenixKnight: [
        heal("Возрождение феникса", "Пламя феникса исцеляет 45% здоровья.", 3, 42, 150, 160, 0.45),
        hit("Пылающий меч", "Меч, объятый огнём, наносит 600% урона и возвращает 10% урона здоровьем.", 3, 50, 40, 150,
            {effect: "vampire", damageModifier: 6, vampirePower: 0.1, enchantItem: {key: "essence_ignar", perLevel: 1}})
    ],
    warden: [
        shield("Несокрушимый щит", "Щит, поглощающий урон в размере 60% от максимального здоровья.", 2, 22, 70, 85, 0.6),
        buff("Вызов", "Босс сосредотачивается на тебе на 12 секунд, а получаемый урон падает на 30%.", 2, 28, 45, 60,
            [{kind: "taunt", seconds: 12}, {kind: "guard", amount: 30, seconds: 12}])
    ],
    bastion: [
        shield("Крепость", "Непробиваемый щит в размере 100% максимального здоровья.", 3, 42, 140, 170, 1),
        buff("Неприступный бастион", "На 15 секунд босс бьёт только по тебе, а получаемый урон падает на 55%.", 3, 50, 90, 140,
            [{kind: "taunt", seconds: 15}, {kind: "guard", amount: 55, seconds: 15}],
            {enchantItem: {key: "essence_terrax", perLevel: 1}})
    ],

    // --- Маг ---------------------------------------------------------------
    elementalist: [
        hit("Цепная молния", "Молния прыгает три раза, каждый удар — 160% урона.", 2, 22, 24, 110,
            {effect: "multi_hit", hits: 3, damageModifier: 1.6}),
        hit("Ледяной шип", "Шип льда на 320% урона, который на 10 секунд ослабляет защиту босса на 20%.", 2, 28, 14, 75,
            {effect: "magic_attack", damageModifier: 3.2, debuff: {kind: "armorBreak", amount: 20, seconds: 10}})
    ],
    archmage: [
        hit("Метеоритный дождь", "Пять метеоритов, каждый по 220% урона.", 3, 44, 90, 330,
            {effect: "multi_hit", hits: 5, damageModifier: 2.2}),
        hit("Ледяные оковы", "300% урона и оглушение босса на 4 секунды.", 3, 52, 60, 220,
            {effect: "magic_attack", damageModifier: 3, debuff: {kind: "stun", amount: 0, seconds: 4},
                enchantItem: {key: "essence_radjahal", perLevel: 1}})
    ],
    warlock: [
        hit("Похищение жизни", "240% урона. Возвращает 20% нанесённого урона здоровьем.", 2, 22, 20, 80,
            {effect: "vampire", damageModifier: 2.4, vampirePower: 0.2}),
        {
            name: "Проклятие слабости", description: "Проклятие на 15 секунд: босс наносит на 25% меньше урона.",
            effect: "debuff", ...flags, tier: 2, needLvl: 28, cooldown: 40, cost: 70,
            debuff: {kind: "weaken", amount: 25, seconds: 15}
        }
    ],
    soulReaper: [
        hit("Жатва душ", "550% урона, а по боссу с запасом здоровья ниже 35% — вдвое больше.", 3, 44, 45, 200,
            {effect: "execute", damageModifier: 5.5, executeBelow: 0.35, executeBonus: 1}),
        hit("Пожирание", "450% урона. Возвращает 30% нанесённого урона здоровьем.", 3, 52, 70, 230,
            {effect: "vampire", damageModifier: 4.5, vampirePower: 0.3, enchantItem: {key: "essence_veraxis", perLevel: 1}})
    ],

    // --- Прист -------------------------------------------------------------
    cleric: [
        heal("Малое исцеление", "Быстрое исцеление на 18% здоровья.", 2, 22, 8, 50, 0.18),
        {
            name: "Источник маны", description: "Возвращает 35% максимальной маны.",
            effect: "restore", ...flags, isSelf: true, tier: 2, needLvl: 28, cooldown: 90, cost: 0, restoreMp: 0.35
        }
    ],
    saint: [
        heal("Священное чудо", "Исцеляет 70% здоровья.", 3, 44, 120, 220, 0.7),
        shield("Ореол", "Сияющий щит на 90% здоровья и возврат 20% маны.", 3, 52, 100, 200, 0.9,
            {restoreMp: 0.2, enchantItem: {key: "essence_selene", perLevel: 1}})
    ],
    inquisitor: [
        hit("Священный огонь", "Огонь веры на 340% урона.", 2, 22, 15, 72, {effect: "magic_attack", damageModifier: 3.4}),
        hit("Кара небес", "450% урона, а по раненому боссу (здоровье ниже 30%) — на 60% больше.", 2, 28, 30, 100,
            {effect: "execute", damageModifier: 4.5, executeBelow: 0.3, executeBonus: 0.6})
    ],
    judicator: [
        hit("Луч правосудия", "Луч света на 750% урона.", 3, 44, 50, 240, {effect: "magic_attack", damageModifier: 7.5}),
        hit("Приговор", "500% урона, по боссу ниже 30% здоровья — на 120% больше.", 3, 52, 60, 260,
            {effect: "execute", damageModifier: 5, executeBelow: 0.3, executeBonus: 1.2, enchantItem: {key: "essence_selene", perLevel: 1}})
    ],

    // --- Лучник ------------------------------------------------------------
    ranger: [
        hit("Град стрел", "Пять стрел, каждая по 80% урона.", 2, 22, 20, 90, {effect: "multi_hit", hits: 5, damageModifier: 0.8}),
        buff("Охотничий азарт", "Следующие 5 атак: шанс крита выше на 50%.", 2, 28, 55, 60, [{kind: "critChance", amount: 50, charges: 5}])
    ],
    hawkeye: [
        hit("Тысяча стрел", "Восемь стрел подряд, каждая по 100% урона.", 3, 44, 80, 300, {effect: "multi_hit", hits: 8, damageModifier: 1}),
        buff("Глаз сокола", "Следующие 5 атак: шанс крита +80% и критический урон +50%.", 3, 52, 90, 160,
            [{kind: "critChance", amount: 80, charges: 5}, {kind: "critDamage", amount: 50, charges: 5}],
            {enchantItem: {key: "essence_zephyrion", perLevel: 1}})
    ],
    sniper: [
        hit("Выстрел в слабое место", "420% урона и +30% к шансу крита.", 2, 22, 18, 95, {damageModifier: 4.2, critChanceBonus: 30}),
        hit("Бронебойная стрела", "200% урона. На 12 секунд снижает защиту босса на 30%.", 2, 28, 30, 80,
            {damageModifier: 2, debuff: {kind: "armorBreak", amount: 30, seconds: 12}})
    ],
    phantomShot: [
        hit("Призрачная стрела", "Стрела из теней на 800% урона и +40% к шансу крита.", 3, 44, 55, 260, {damageModifier: 8, critChanceBonus: 40}),
        hit("Ночной охотник", "300% урона. На 15 секунд снижает защиту босса на 35%.", 3, 52, 45, 190,
            {damageModifier: 3, debuff: {kind: "armorBreak", amount: 35, seconds: 15}, enchantItem: {key: "essence_veraxis", perLevel: 1}})
    ],

    // --- Разбойник ---------------------------------------------------------
    assassin: [
        hit("Удар в спину", "400% урона и +35% к шансу крита.", 2, 22, 14, 85, {damageModifier: 4, critChanceBonus: 35}),
        buff("Смертельная метка", "Следующие 3 атаки: критический урон +60%.", 2, 28, 50, 70, [{kind: "critDamage", amount: 60, charges: 3}])
    ],
    shadowBlade: [
        hit("Тысяча порезов", "Семь быстрых порезов, каждый по 110% урона.", 3, 44, 70, 240, {effect: "multi_hit", hits: 7, damageModifier: 1.1}),
        hit("Казнь из тени", "500% урона и +50% к шансу крита; по боссу ниже 40% здоровья — на 150% больше.", 3, 52, 60, 230,
            {effect: "execute", damageModifier: 5, critChanceBonus: 50, executeBelow: 0.4, executeBonus: 1.5,
                enchantItem: {key: "essence_umbra", perLevel: 1}})
    ],
    trickster: [
        hit("Ослепление", "150% урона и оглушение босса на 3 секунды.", 2, 22, 35, 70,
            {damageModifier: 1.5, debuff: {kind: "stun", amount: 0, seconds: 3}}),
        buff("Тень", "На 12 секунд: 50% шанс уклониться от удара босса и перезарядка быстрее на 30%.", 2, 28, 50, 65,
            [{kind: "evade", amount: 50, seconds: 12}, {kind: "haste", amount: 30, seconds: 12}])
    ],
    phantomDancer: [
        hit("Вихрь теней", "Четыре удара по 180% урона. На 8 секунд даёт 40% уклонения.", 3, 44, 65, 210,
            {effect: "multi_hit", hits: 4, damageModifier: 1.8, buffs: [{kind: "evade", amount: 40, seconds: 8}]}),
        hit("Дымовая завеса", "200% урона, оглушение босса на 5 секунд и 60% уклонения на 12 секунд.", 3, 52, 100, 180,
            {damageModifier: 2, debuff: {kind: "stun", amount: 0, seconds: 5}, buffs: [{kind: "evade", amount: 60, seconds: 12}],
                enchantItem: {key: "essence_umbra", perLevel: 1}})
    ],

    // --- Берсерк -----------------------------------------------------------
    slayer: [
        hit("Рубка", "Три удара по 140% урона. Платишь 3% здоровья.", 2, 22, 18, 0,
            {effect: "multi_hit", hits: 3, damageModifier: 1.4, costHpPct: 0.03}),
        buff("Неистовство", "Платишь 5% здоровья: следующие 3 атаки наносят на 50% больше урона.", 2, 28, 50, 0,
            [{kind: "damage", amount: 50, charges: 3}], {costHpPct: 0.05})
    ],
    warbringer: [
        hit("Громовой удар", "Платишь 6% здоровья ради удара на 700% урона.", 3, 44, 55, 0, {damageModifier: 7, costHpPct: 0.06}),
        buff("Боевой клич", "Платишь 8% здоровья: следующие 4 атаки на 80% сильнее, а перезарядка быстрее на 20% на 15 секунд.", 3, 52, 100, 0,
            [{kind: "damage", amount: 80, charges: 4}, {kind: "haste", amount: 20, seconds: 15}],
            {costHpPct: 0.08, enchantItem: {key: "essence_ignar", perLevel: 1}})
    ],
    ironclad: [
        shield("Кровавая броня", "Платишь 3% здоровья и получаешь щит на 50% здоровья.", 2, 22, 60, 0, 0.5, {costHpPct: 0.03}),
        buff("Железная плоть", "На 15 секунд получаемый урон падает на 40%.", 2, 28, 55, 70, [{kind: "guard", amount: 40, seconds: 15}])
    ],
    titan: [
        hit("Землетрясение", "550% урона и оглушение босса на 3 секунды.", 3, 44, 70, 200,
            {damageModifier: 5.5, debuff: {kind: "stun", amount: 0, seconds: 3}}),
        buff("Несокрушимый", "На 15 секунд получаемый урон падает на 60%, плюс щит на 50% здоровья.", 3, 52, 120, 150,
            [{kind: "guard", amount: 60, seconds: 15}], {shieldPower: 0.5, enchantItem: {key: "essence_terrax", perLevel: 1}})
    ]
};

// --- 3rd-class awakening: two more powerful skills at levels 60 and 75 (slots 7-8).
// Big numbers, long cooldowns; each wants a boss essence for its top enchant levels.
export const awakenedSkills = {
    phoenixKnight: [
        heal("Огненное воскрешение", "Пламя феникса исцеляет 80% здоровья и на 10 секунд снижает получаемый урон на 30%.", 3, 60, 240, 300, 0.8,
            {buffs: [{kind: "guard", amount: 30, seconds: 10}], enchantItem: {key: "essence_ignar", perLevel: 1}}),
        hit("Гнев феникса", "Испепеляющий удар на 1400% урона, возвращает 15% урона здоровьем.", 3, 75, 120, 320,
            {effect: "vampire", damageModifier: 14, vampirePower: 0.15, enchantItem: {key: "essence_pira", perLevel: 1}})
    ],
    bastion: [
        shield("Стена света", "Щит на 160% максимального здоровья.", 3, 60, 200, 320, 1.6, {enchantItem: {key: "essence_terrax", perLevel: 1}}),
        buff("Последний рубеж", "На 20 секунд босс бьёт только по тебе, а получаемый урон падает на 75%. Тут же даёт щит на 80% здоровья.", 3, 75, 180, 280,
            [{kind: "taunt", seconds: 20}, {kind: "guard", amount: 75, seconds: 20}], {shieldPower: 0.8, enchantItem: {key: "essence_tiamara", perLevel: 1}})
    ],
    archmage: [
        hit("Звёздный шторм", "Восемь звёзд падают на цель, каждая по 260% урона.", 3, 60, 200, 520,
            {effect: "multi_hit", hits: 8, damageModifier: 2.6, enchantItem: {key: "essence_zephyrion", perLevel: 1}}),
        hit("Разлом реальности", "1600% урона и оглушение босса на 5 секунд.", 3, 75, 150, 450,
            {effect: "magic_attack", damageModifier: 16, debuff: {kind: "stun", amount: 0, seconds: 5}, enchantItem: {key: "essence_radjahal", perLevel: 1}})
    ],
    soulReaper: [
        hit("Жатва мира", "900% урона, по боссу ниже 40% здоровья — на 150% больше.", 3, 60, 100, 380,
            {effect: "execute", damageModifier: 9, executeBelow: 0.4, executeBonus: 1.5, enchantItem: {key: "essence_veraxis", perLevel: 1}}),
        hit("Бессмертие душ", "1000% урона. Возвращает 40% нанесённого урона здоровьем.", 3, 75, 160, 420,
            {effect: "vampire", damageModifier: 10, vampirePower: 0.4, enchantItem: {key: "essence_tiamara", perLevel: 1}})
    ],
    saint: [
        heal("Небесное исцеление", "Исцеляет 100% здоровья и возвращает 25% маны.", 3, 60, 240, 380, 1,
            {restoreMp: 0.25, enchantItem: {key: "essence_selene", perLevel: 1}}),
        shield("Божественный щит", "Щит на 150% здоровья и возврат 40% маны.", 3, 75, 200, 360, 1.5,
            {restoreMp: 0.4, enchantItem: {key: "essence_umbra", perLevel: 1}})
    ],
    judicator: [
        hit("Гнев небес", "Небесный огонь на 1500% урона.", 3, 60, 130, 460,
            {effect: "magic_attack", damageModifier: 15, enchantItem: {key: "essence_selene", perLevel: 1}}),
        hit("Последний суд", "1000% урона, по боссу ниже 35% здоровья — втрое больше.", 3, 75, 140, 480,
            {effect: "execute", damageModifier: 10, executeBelow: 0.35, executeBonus: 2, enchantItem: {key: "essence_veraxis", perLevel: 1}})
    ],
    hawkeye: [
        hit("Дождь комет", "Двенадцать стрел с небес, каждая по 140% урона.", 3, 60, 160, 480,
            {effect: "multi_hit", hits: 12, damageModifier: 1.4, enchantItem: {key: "essence_zephyrion", perLevel: 1}}),
        buff("Зрение сокола", "Следующие 5 атак: урон +100% и шанс крита +100%.", 3, 75, 200, 300,
            [{kind: "damage", amount: 100, charges: 5}, {kind: "critChance", amount: 100, charges: 5}], {enchantItem: {key: "essence_kivaha", perLevel: 1}})
    ],
    phantomShot: [
        hit("Выстрел судьбы", "1800% урона и +60% к шансу крита.", 3, 60, 140, 500,
            {damageModifier: 18, critChanceBonus: 60, enchantItem: {key: "essence_veraxis", perLevel: 1}}),
        hit("Тьма над целью", "600% урона. На 20 секунд снижает защиту босса на 50%.", 3, 75, 100, 380,
            {damageModifier: 6, debuff: {kind: "armorBreak", amount: 50, seconds: 20}, enchantItem: {key: "essence_umbra", perLevel: 1}})
    ],
    shadowBlade: [
        hit("Танец тысячи клинков", "Двенадцать ударов, каждый по 150% урона.", 3, 60, 160, 460,
            {effect: "multi_hit", hits: 12, damageModifier: 1.5, enchantItem: {key: "essence_umbra", perLevel: 1}}),
        hit("Поцелуй смерти", "1200% урона и +60% к шансу крита; по боссу ниже 30% здоровья — втрое больше.", 3, 75, 150, 480,
            {effect: "execute", damageModifier: 12, critChanceBonus: 60, executeBelow: 0.3, executeBonus: 2, enchantItem: {key: "essence_veraxis", perLevel: 1}})
    ],
    phantomDancer: [
        hit("Затмение", "Шесть ударов по 250% урона, 70% уклонения на 12 секунд.", 3, 60, 150, 420,
            {effect: "multi_hit", hits: 6, damageModifier: 2.5, buffs: [{kind: "evade", amount: 70, seconds: 12}], enchantItem: {key: "essence_selene", perLevel: 1}}),
        hit("Бесконечный танец", "400% урона, оглушение босса на 6 секунд и ускорение перезарядки на 40% на 15 секунд.", 3, 75, 200, 400,
            {damageModifier: 4, debuff: {kind: "stun", amount: 0, seconds: 6}, buffs: [{kind: "haste", amount: 40, seconds: 15}], enchantItem: {key: "essence_zephyrion", perLevel: 1}})
    ],
    warbringer: [
        buff("Рёв войны", "Платишь 10% здоровья: следующие 5 атак на 120% сильнее.", 3, 60, 220, 0,
            [{kind: "damage", amount: 120, charges: 5}], {costHpPct: 0.1, enchantItem: {key: "essence_ignar", perLevel: 1}}),
        hit("Кровавая жатва", "Платишь 9% здоровья: удар на 1600% урона, возвращает 20% урона здоровьем.", 3, 75, 140, 0,
            {effect: "vampire", damageModifier: 16, vampirePower: 0.2, costHpPct: 0.09, enchantItem: {key: "essence_pira", perLevel: 1}})
    ],
    titan: [
        hit("Гнев гор", "1300% урона и оглушение босса на 4 секунды.", 3, 60, 130, 360,
            {damageModifier: 13, debuff: {kind: "stun", amount: 0, seconds: 4}, enchantItem: {key: "essence_terrax", perLevel: 1}}),
        buff("Вечная твердь", "На 20 секунд получаемый урон падает на 80%, плюс щит на 100% здоровья.", 3, 75, 240, 300,
            [{kind: "guard", amount: 80, seconds: 20}], {shieldPower: 1, enchantItem: {key: "essence_tiamara", perLevel: 1}})
    ]
};

// Which class each profession grows out of (matches CLASS_TREE in classTree.js).
export const PROFESSION_PARENT = {
    crusader: 'warrior', warden: 'warrior', phoenixKnight: 'crusader', bastion: 'warden',
    elementalist: 'mage', warlock: 'mage', archmage: 'elementalist', soulReaper: 'warlock',
    cleric: 'priest', inquisitor: 'priest', saint: 'cleric', judicator: 'inquisitor',
    ranger: 'archer', sniper: 'archer', hawkeye: 'ranger', phantomShot: 'sniper',
    assassin: 'rogue', trickster: 'rogue', shadowBlade: 'assassin', phantomDancer: 'trickster',
    slayer: 'berserk', ironclad: 'berserk', warbringer: 'slayer', titan: 'ironclad'
};

/** Full skill list (inherited + own, slots assigned) for every profession. */
export function assembleProfessionSkills(baseSkills) {
    const result = {};
    const build = className => {
        if (result[className]) return result[className];
        const parent = PROFESSION_PARENT[className];
        const inherited = baseSkills[parent] || build(parent);
        const firstSlot = inherited.length;
        return result[className] = [
            ...inherited.map(skill => ({...skill})),
            ...[...professionSkills[className], ...(awakenedSkills[className] || [])].map((skill, index) => ({slot: firstSlot + index, ...skill}))
        ];
    };
    for (const className of Object.keys(PROFESSION_PARENT)) build(className);
    return result;
}
