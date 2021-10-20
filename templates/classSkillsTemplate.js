//1 power == 5% dmg. if power == 5, then damage will be 100% + 25%)
//cost values is in crystals
//cooltime is times attack to boss

module.exports = {
    warrior: [{
        slot: 1,
        name: "Взмах меча",
        description: "Быстрый удар мечом.",
        effect: "common_attack",
        cooltime: 0,
        isSelf: false,
        isDealDamage: true,
        isBuff: false,
        power: 3,
        needLvl: 1,
        cost: 0
    }, {
        slot: 2,
        name: "Ярость вампира",
        description: "Призыв магии крови: наносит 140% урона врагу, вампиря себе здоровье в количестве равное 5% от нанесённого урона.",
        effect: "vampire",
        cooltime: 2,
        isSelf: false,
        isDealDamage: true,
        isBuff: false,
        power: 8,
        needLvl: 9,
        cost: 25
    }, {
        slot: 3,
        name: "Вожделение паладина",
        description: "Ты собираешь всю волю в кулак и совершаешь мощный удар, который наносит 350% урона.",
        effect: "strong_attack",
        cooltime: 3,
        isSelf: false,
        isDealDamage: true,
        isBuff: false,
        power: 50,
        needLvl: 15,
        cost: 70
    }],
    mage: [{
        slot: 1,
        name: "Выстрел из посоха",
        description: "Выстрел из посоха нейтральной стихией.",
        effect: "common_attack",
        cooltime: 0,
        isSelf: false,
        isDealDamage: true,
        isBuff: false,
        power: 4,
        needLvl: 1,
        cost: 0
    }, {
        slot: 2,
        name: "Грозовая стужа",
        description: "Запуск огромного грозового вихря, сопровождающегося ледяными шипами. Наносит 500% урона.",
        effect: "magic_electro_ice_attack",
        cooltime: 4,
        isSelf: false,
        isDealDamage: true,
        isBuff: false,
        power: 100,
        needLvl: 10,
        cost: 50
    }, {
        slot: 3,
        name: "Лунная тень",
        description: "Создаёт щит на 45% от хп.",
        effect: "shield",
        cooltime: 5,
        isSelf: true,
        isDealDamage: false,
        isBuff: true,
        power: 0,
        needLvl: 15,
        cost: 120
    }],
    priest: [{
        slot: 1,
        name: "Удар скипетром",
        description: "Удар скипетром по болевым точкам врага.",
        effect: "common_attack",
        cooltime: 0,
        isSelf: false,
        isDealDamage: true,
        isBuff: false,
        power: 2,
        needLvl: 1,
        cost: 0
    }, {
        slot: 2,
        name: "Сияние утренней звезды",
        description: "Призыв святой энергии, которая исцеляет раны. Восстанавливает тебе 25% хп.",
        effect: "heal",
        cooltime: 2,
        isSelf: true,
        isDealDamage: false,
        isBuff: false,
        power: 0,
        needLvl: 8,
        cost: 30
    }, {
        slot: 3,
        name: "Казнь святых",
        description: "Меч из чистой энергии света поражает твоего врага, нанося ему 200% урона и создавая на тебе щит, который поглощает 75% урона от твоего хп",
        effect: "magic_holy",
        cooltime: 6,
        isSelf: false,
        isDealDamage: true,
        isBuff: true,
        power: 20,
        needLvl: 15,
        cost: 200
    }],
    archer: [{
        slot: 1,
        name: "Точный выстрел",
        description: "Выстрел из лука.",
        effect: "common_attack",
        cooltime: 0,
        isSelf: false,
        isDealDamage: true,
        isBuff: false,
        power: 5,
        needLvl: 1,
        cost: 0
    }, {
        slot: 2,
        name: "Прямо в яблочко",
        description: "Выстрел, который наносит 300% урона со 100% шансом крита.",
        effect: "strong_attack",
        cooltime: 4,
        isSelf: false,
        isDealDamage: true,
        isBuff: false,
        power: 40,
        needlvl: 12,
        cost: 350
    }, {
        slot: 3,
        name: "Уверенность в себе",
        description: "Увеличивает шанс критического удара на 50%. Действует 3 удара.",
        effect: "buff_critical-chance",
        cooltime: 6,
        isSelf: true,
        isDealDamage: false,
        isBuff: true,
        power: 0,
        needlvl: 15,
        cost: 80
    }]
};