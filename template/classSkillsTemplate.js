//1 power == 5% dmg. if power == 5, then damage will be 100% + 25%
//cost values is in crystals
//cooldown - attack CD in seconds;
//
// Base classes (tier 1) own slots 0-2. Each promoted class keeps its parent's skills
// (same slots, so enchant levels survive a promotion) and learns two more: slots 3-4
// at the 2nd profession, slots 5-6 at the 3rd. Extra skill fields (all optional):
//   hits            - number of separate hits (each rolls crit on its own)
//   critChanceBonus - extra crit chance (percentage points) for this skill only
//   executeBelow / executeBonus - +bonus damage while the target is under that hp share
//   vampirePower    - share of dealt damage returned as hp
//   costHpPct       - hp cost as a share of max hp (on top of the flat costHp)
//   buffs           - [{kind: damage|critChance|critDamage|guard|taunt|evade|haste, amount (%), charges | seconds}]
//   debuff          - {kind: armorBreak|weaken|stun, amount (%), seconds}   (on the boss)
//   restoreMp       - share of max mp returned
//   enchantItem     - {key, perLevel}: material the high enchant levels demand (see skillEnchant.js)
//   tier            - class tier that teaches it (1 base, 2, 3)

import {assembleProfessionSkills} from './professionSkills.js';

const baseSkills = {
    noClass: [{
        slot: 0,
        name: "Тык палкой",
        description: "Тыкнуть палкой в босса.",
        effect: "common_attack",
        damageModifier: 1,
        cooldown: 0,
        isSelf: false,
        isDealDamage: true,
        isHeal: false,
        isShield: false,
        isBuff: false,
        needLvl: 0,
        costHp: 0,
        cost: 0,
        cooldownReceive: 0
    }],
    warrior: [{
        slot: 0,
        name: "Взмах меча",
        description: "Быстрый удар мечом.",
        effect: "common_attack",
        cooldown: 0,
        isSelf: false,
        isDealDamage: true,
        isHeal: false,
        isShield: false,
        isBuff: false,
        needLvl: 1,
        cost: 2,
        costHp: 0
    }, {
        slot: 1,
        name: "Ярость вампира",
        description: "Призыв магии крови: наносит 173% урона врагу, вампиря себе здоровье в количестве равное 5% от нанесённого урона.",
        effect: "vampire",
        vampirePower: 0.05,
        damageModifier: 1.73,
        cooldown: 29,
        isSelf: false,
        isDealDamage: true,
        isHeal: false,
        isShield: false,
        isBuff: false,
        needLvl: 9,
        costHp: 0,
        cost: 36
    }, {
        slot: 2,
        name: "Вожделение паладина",
        description: "Ты собираешь всю волю в кулак и совершаешь мощный удар, который наносит 424% урона.",
        effect: "strong_attack",
        damageModifier: 4.24,
        cooldown: 46,
        isSelf: false,
        isDealDamage: true,
        isHeal: false,
        isShield: false,
        isBuff: false,
        needLvl: 15,
        costHp: 0,
        cost: 80
    }],
    mage: [{
        slot: 0,
        name: "Выстрел из посоха",
        description: "Выстрел из посоха нейтральной стихией.",
        effect: "common_attack",
        cooldown: 0,
        isSelf: false,
        isDealDamage: true,
        isHeal: false,
        isShield: false,
        isBuff: false,
        needLvl: 1,
        costHp: 0,
        cost: 5
    }, {
        slot: 1,
        name: "Грозовая стужа",
        description: "Запуск огромного грозового вихря, сопровождающегося ледяными шипами. Наносит 500% урона.",
        effect: "magic_attack",
        damageModifier: 5,
        cooldown: 15,
        isSelf: false,
        isDealDamage: true,
        isHeal: false,
        isShield: false,
        isBuff: false,
        needLvl: 10,
        costHp: 0,
        cost: 43
    }, {
        slot: 2,
        name: "Лунная тень",
        description: "Создаёт щит на 45% от хп.",
        effect: "shield",
        shieldPower: 0.45,
        cooldown: 120,
        isSelf: true,
        isDealDamage: false,
        isHeal: false,
        isShield: true,
        isBuff: false,
        needLvl: 15,
        costHp: 0,
        cost: 67
    }],
    priest: [{
        slot: 0,
        name: "Удар скипетром",
        description: "Удар скипетром по болевым точкам врага.",
        effect: "common_attack",
        cooldown: 0,
        isSelf: false,
        isDealDamage: true,
        isHeal: false,
        isShield: false,
        isBuff: false,
        needLvl: 1,
        costHp: 0,
        cost: 3
    }, {
        slot: 1,
        name: "Сияние утренней звезды",
        description: "Призыв святой энергии, которая исцеляет раны. Восстанавливает тебе 25% хп.",
        effect: "heal",
        healPower: 0.25,
        cooldown: 15,
        isSelf: true,
        isDealDamage: false,
        isHeal: true,
        isShield: false,
        isBuff: false,
        needLvl: 8,
        costHp: 0,
        cost: 68
    }, {
        slot: 2,
        name: "Казнь святых",
        description: "Меч из чистой энергии света поражает твоего врага, нанося ему 240% урона",
        effect: "magic_attack",
        damageModifier: 2.4,
        cooldown: 45,
        isSelf: false,
        isDealDamage: true,
        isHeal: false,
        isShield: false,
        isBuff: false,
        needLvl: 15,
        costHp: 600,
        cost: 0
    }],
    archer: [{
        slot: 0,
        name: "Точный выстрел",
        description: "Выстрел из лука.",
        effect: "common_attack",
        cooldown: 0,
        isSelf: false,
        isDealDamage: true,
        isHeal: false,
        isShield: false,
        isBuff: false,
        needLvl: 1,
        costHp: 0,
        cost: 1
    }, {
        slot: 1,
        name: "Прямо в яблочко",
        description: "Выстрел, который наносит 231% урона.",
        effect: "strong_attack",
        damageModifier: 2.31,
        cooldown: 15,
        isSelf: false,
        isDealDamage: true,
        isHeal: false,
        isShield: false,
        isBuff: false,
        needLvl: 12,
        costHp: 0,
        cost: 55
    }, {
        slot: 2,
        name: "Элементальная стрела",
        description: "Мощный выстрел трёх стрел трёх разных стихий. Наносит 700% урона.",
        effect: "magic_attack",
        damageModifier: 7,
        cooldown: 180,
        isSelf: false,
        isDealDamage: true,
        isHeal: false,
        isShield: false,
        isBuff: false,
        needLvl: 15,
        costHp: 0,
        cost: 102
    
    }],
    rogue: [{
        slot: 0,
        name: "Удар кинжалом",
        description: "Быстрый укол кинжалом.",
        effect: "common_attack",
        cooldown: 0,
        isSelf: false,
        isDealDamage: true,
        isHeal: false,
        isShield: false,
        isBuff: false,
        needLvl: 1,
        costHp: 0,
        cost: 1
    }, {
        slot: 1,
        name: "Подлый укол",
        description: "Удар в уязвимое место: 220% урона и +20% к шансу крита.",
        effect: "strong_attack",
        damageModifier: 2.2,
        critChanceBonus: 20,
        cooldown: 9,
        isSelf: false,
        isDealDamage: true,
        isHeal: false,
        isShield: false,
        isBuff: false,
        needLvl: 10,
        costHp: 0,
        cost: 40
    }, {
        slot: 2,
        name: "Танец клинков",
        description: "Четыре стремительных удара подряд, каждый по 104% урона и каждый может стать критическим.",
        effect: "multi_hit",
        hits: 4,
        damageModifier: 1.04,
        cooldown: 26,
        isSelf: false,
        isDealDamage: true,
        isHeal: false,
        isShield: false,
        isBuff: false,
        needLvl: 15,
        costHp: 0,
        cost: 85
    }],
    berserk: [{
        slot: 0,
        name: "Удар секирой",
        description: "Тяжёлый удар боевой секирой.",
        effect: "common_attack",
        cooldown: 0,
        isSelf: false,
        isDealDamage: true,
        isHeal: false,
        isShield: false,
        isBuff: false,
        needLvl: 1,
        costHp: 0,
        cost: 2
    }, {
        slot: 1,
        name: "Кровавая ярость",
        description: "Платишь 2% своего здоровья и наносишь 236% урона, возвращая 12% нанесённого урона здоровьем.",
        effect: "vampire",
        vampirePower: 0.12,
        damageModifier: 2.36,
        costHpPct: 0.02,
        cooldown: 23,
        isSelf: false,
        isDealDamage: true,
        isHeal: false,
        isShield: false,
        isBuff: false,
        needLvl: 9,
        costHp: 0,
        cost: 0
    }, {
        slot: 2,
        name: "Дробящий удар",
        description: "Платишь 3% здоровья ради сокрушительного удара на 361% урона.",
        effect: "strong_attack",
        damageModifier: 3.61,
        costHpPct: 0.03,
        cooldown: 42,
        isSelf: false,
        isDealDamage: true,
        isHeal: false,
        isShield: false,
        isBuff: false,
        needLvl: 15,
        costHp: 0,
        cost: 0
    }]
};

export default {...baseSkills, ...assembleProfessionSkills(baseSkills)};
