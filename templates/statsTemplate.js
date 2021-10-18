module.exports = {
    warrior: {
        attack: 2, deffence: 4, criticalChance: 10, criticalDamage: 0, skills: [
            {
                slot: 1,
                name: "Взмах меча",
                effect: "common_attack",
                cooltime: 0,
                isSelf: false,
                isDealDamage: true,
                isBuff: false,
                power: 3
            },
            {
                slot: 2,
                name: "Ярость вампира",
                effect: "vampire",
                cooltime: 2,
                isSelf: false,
                isDealDamage: true,
                isBuff: false,
                power: 5
            },
            {
                slot: 3,
                name: "Вожделение паладина",
                effect: "strong_attack",
                cooltime: 3,
                isSelf: false,
                isDealDamage: true,
                isBuff: false,
                power: 1
            }
        ]
    },
    mage: {
        attack: 4, deffence: 1, criticalChance: 20, criticalDamage: 0, skills: [
            {
                slot: 1,
                name: "Выстрел из посоха",
                effect: "common_attack",
                cooltime: 0,
                isSelf: false,
                isDealDamage: true,
                isBuff: false,
                power: 4
            },
            {
                slot: 2,
                name: "Грозовая стужа",
                effect: "magic_electro_ice_attack",
                cooltime: 4,
                isSelf: false,
                isDealDamage: true,
                isBuff: false,
                power: 8
            },
            {
                slot: 3,
                name: "Лунная тень",
                effect: "shield",
                cooltime: 5,
                isSelf: true,
                isDealDamage: false,
                isBuff: true,
                power: 1
            }
        ]
    },
    priest: {attack: 1, deffence: 5, criticalChance: 5, criticalDamage: 50, skills: [
            {
                slot: 1,
                name: "Удар скипетром",
                effect: "common_attack",
                cooltime: 0,
                isSelf: false,
                isDealDamage: true,
                isBuff: false,
                power: 2
            },
            {
                slot: 2,
                name: "Сияние утренней звезды",
                description: "Призыв святой энергии, которая исцеляет раны. Восстанавливает тебе 200 хп.",
                effect: "heal",
                cooltime: 2,
                isSelf: true,
                isDealDamage: false,
                isBuff: false,
                power: 1
            },
            {
                slot: 3,
                name: "Казнь святых",
                description: "Меч из чистой энергии света поражает твоего врага, нанося ему 200% урона и создавая на тебе щит, который поглощает 500 урона",
                effect: "magic_holy",
                cooltime: 6,
                isSelf: false,
                isDealDamage: true,
                isBuff: true,
                power: 8
            }
        ]},
    archer: {attack: 5, deffence: 1, criticalChance: 25, criticalDamage: 0, skills: [
            {
                slot: 1,
                name: "Точный выстрел",
                description: "Выстрел из лука.",
                effect: "common_attack",
                cooltime: 0,
                isSelf: false,
                isDealDamage: true,
                isBuff: false,
                power: 5
            },
            {
                slot: 2,
                name: "Прямо в яблочко",
                description: "Выстрел, который наносит 300% урона со 100% шансом крита.",
                effect: "strong_attack",
                cooltime: 4,
                isSelf: false,
                isDealDamage: true,
                isBuff: false,
                power: 8,
                needlvl: 7,
            },
            {
                slot: 3,
                name: "Уверенность в себе",
                description: "Увеличивает шанс критического удара на 50%. Действует 3 удара.",
                effect: "buff_critical-chance",
                cooltime: 6,
                isSelf: true,
                isDealDamage: false,
                isBuff: true,
                power: 1,
                needlvl: 10
            }
        ]}
};