//1 power == 5% dmg. if power == 5, then damage will be 100% + 25%)
//cost values is in crystals
//cooltime is times attack to boss

module.exports = {
    warrior: [{
        slot: 0,
        name: "Взмах меча",
        description: "Быстрый удар мечом.",
        effect: "common_attack",
        cooltime: 0,
        isSelf: false,
        isDealDamage: true,
        needLvl: 1,
        cost: 0,
        crystalCost: 0
    }, {
        slot: 1,
        name: "Ярость вампира",
        description: "Призыв магии крови: наносит 140% урона врагу, вампиря себе здоровье в количестве равное 5% от нанесённого урона.",
        effect: "vampire",
        vampirePower: 0.05,
        damageModificator: 1.4,
        cooltime: 2 * 60 * 60 * 1000,
        isSelf: false,
        isDealDamage: true,
        needLvl: 9,
        crystalCost: 25,
        cost: 800
    }, {
        slot: 2,
        name: "Вожделение паладина",
        description: "Ты собираешь всю волю в кулак и совершаешь мощный удар, который наносит 350% урона.",
        effect: "strong_attack",
        damageModificator: 3.5,
        cooltime: 3 * 60 * 60 * 1000,
        isSelf: false,
        isDealDamage: true,
        needLvl: 15,
        crystalCost: 70,
        cost: 2000
    }],
    mage: [{
        slot: 0,
        name: "Выстрел из посоха",
        description: "Выстрел из посоха нейтральной стихией.",
        effect: "common_attack",
        cooltime: 0,
        isSelf: false,
        isDealDamage: true,
        needLvl: 1,
        crystalCost: 0,
        cost: 0
    }, {
        slot: 1,
        name: "Грозовая стужа",
        description: "Запуск огромного грозового вихря, сопровождающегося ледяными шипами. Наносит 500% урона.",
        effect: "magic_attack",
        damageModificator: 5,
        cooltime: 4 * 60 * 60 * 1000,
        isSelf: false,
        isDealDamage: true,
        needLvl: 10,
        crystalCost: 50,
        cost: 5000
    }, {
        slot: 2,
        name: "Лунная тень",
        description: "Создаёт щит на 45% от хп.",
        effect: "shield",
        shieldPower: 0.45,
        cooltime: 5 * 60 * 60 * 1000,
        isSelf: true,
        isDealDamage: false,
        isBuff: true,
        needLvl: 15,
        crystalCost: 120,
        cost: 3750
    }],
    priest: [{
        slot: 0,
        name: "Удар скипетром",
        description: "Удар скипетром по болевым точкам врага.",
        effect: "common_attack",
        cooltime: 0,
        isSelf: false,
        isDealDamage: true,
        needLvl: 1,
        crystalCost: 0,
        cost: 0
    }, {
        slot: 1,
        name: "Сияние утренней звезды",
        description: "Призыв святой энергии, которая исцеляет раны. Восстанавливает тебе 25% хп.",
        effect: "heal",
        healPower: 0.25,
        cooltime: 2 * 60 * 60 * 1000,
        isSelf: true,
        isDealDamage: false,
        needLvl: 8,
        crystalCost: 30,
        cost: 1800
    }, {
        slot: 2,
        name: "Казнь святых",
        description: "Меч из чистой энергии света поражает твоего врага, нанося ему 200% урона",
        effect: "magic_attack",
        damageModificator: 2,
        cooltime: 6 * 60 * 60 * 1000,
        isSelf: false,
        isDealDamage: true,
        needLvl: 15,
        crystalCost: 60,
        cost: 3000
    }],
    archer: [{
        slot: 0,
        name: "Точный выстрел",
        description: "Выстрел из лука.",
        effect: "common_attack",
        cooltime: 0,
        isSelf: false,
        isDealDamage: true,
        needLvl: 1,
        crystalCost: 0,
        cost: 0
    }, {
        slot: 1,
        name: "Прямо в яблочко",
        description: "Выстрел, который наносит 300% урона.",
        effect: "strong_attack",
        damageModificator: 3,
        cooltime: 2 * 60 * 60 * 1000,
        isSelf: false,
        isDealDamage: true,
        needlvl: 12,
        crystalCost: 80,
        cost: 4500
    }, {
        slot: 2,
        name: "Элементальная стрела",
        description: "Мощный выстрел трёх стрел трёх разных стихий. Наносит 1000% урона.",
        effect: "magic_attack",
        damageModificator: 10,
        cooltime: 12 * 60 * 60 * 1000,
        isSelf: false,
        isDealDamage: true,
        needlvl: 15,
        crystalCost: 80,
        cost: 6600
    }]
};