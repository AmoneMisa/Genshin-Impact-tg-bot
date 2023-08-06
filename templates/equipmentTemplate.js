module.exports = {
// Классы и соответствующие им цены и характеристики
    grades: [{
        name: 'noGrade',
        cost: 100,
        lvl: {from: 1, to: 20},
        characteristics: {min: 0, max: 2},
        penalty: {min: 0, max: 2},
        quality: {min: 0, max: 5},
        persistence: {min: 1, max: 15}
    }, {
        name: 'D',
        cost: 1200,
        lvl: {from: 21, to: 39},
        characteristics: {min: 1, max: 2},
        penalty: {min: 0, max: 2},
        quality: {min: 0, max: 10},
        persistence: {min: 15, max: 50}
    }, {
        name: 'C',
        cost: 3400,
        lvl: {from: 40, to: 54},
        characteristics: {min: 1, max: 3},
        penalty: {min: 0, max: 2},
        quality: {min: 0, max: 100},
        persistence: {min: 15, max: 85}
    }, {
        name: 'B',
        cost: 7000,
        lvl: {from: 55, to: 60},
        characteristics: {min: 2, max: 3},
        penalty: {min: 0, max: 3},
        quality: {min: 0, max: 100},
        persistence: {min: 35, max: 120}
    }, {
        name: 'A',
        cost: 55000,
        lvl: {from: 61, to: 69},
        characteristics: {min: 3, max: 4},
        penalty: {min: 0, max: 3},
        quality: {min: 0, max: 100},
        persistence: {min: 45, max: 155}
    }, {
        name: 'S',
        cost: 136000,
        lvl: {from: 70, to: 79},
        characteristics: {min: 3, max: 5},
        penalty: {min: 0, max: 4},
        quality: {min: 0, max: 100},
        persistence: {min: 55, max: 190}
    }, {
        name: 'SS',
        cost: 223000,
        lvl: {from: 80, to: 94},
        characteristics: {min: 4, max: 6},
        penalty: {min: 0, max: 4},
        quality: {min: 0, max: 100},
        persistence: {min: 75, max: 225}
    }, {
        name: 'SSS',
        cost: 1890000,
        lvl: {from: 95, to: 100},
        characteristics: {min: 6, max: 8},
        penalty: {min: 0, max: 4},
        quality: {min: 0, max: 100},
        persistence: {min: 90, max: 300}
    }],
// Редкость и соответствующие ей цены в золоте, количество характеристик, необходимых для выставления качества
    rarity: [
        {name: 'break', translatedName: 'Сломано', cost: 50, count: 0},
        {name: 'common', translatedName: 'Обычное', cost: 160, count: 1},
        {name: 'unusual', translatedName: 'Необычное', cost: 600, count: 2},
        {name: 'special', translatedName: 'Особое', cost: 5000, count: 3},
        {name: 'unique', translatedName: 'Уникальное', cost: 8900, count: 4},
        {name: 'rare', translatedName: 'Редкое', cost: 25000, count: 5},
        {name: 'royal', translatedName: 'Королевское', cost: 197000, count: 6},
        {name: 'magic', translatedName: 'Магическое', cost: 435000, count: 7},
        {name: 'goddess', translatedName: 'Божественное', cost: 6500000, count: 8}
    ],
    // Предметы
    itemType: [{
        name: "weapon",
        translatedName: 'Оружие',
        // Типы оружия
        kind: [{
            classOwner: ["warrior"],
            category: "sword",
            type: "oneHandedSword",
            typeTranslatedName: "Меч",
            translatedName: "Меч",
            slots: ["leftHand", "rightHand"],
            characteristics: {
                power: 45,
                randomDamage: 0.1,
                accuracy: 20
            }
        }, {
            type: "twoHandedSword",
            classOwner: ["warrior"],
            category: "sword",
            typeTranslatedName: "Двуручный меч",
            translatedName: "Двуручный меч",
            slots: ["leftHand", "rightHand"],
            characteristics: {
                power: 45,
                randomDamage: 0.1,
                criticalDamage: 0.4
            }
        }, {
            type: "dagger",
            category: "dagger",
            typeTranslatedName: "Кинжал",
            classOwner: ["warrior", "assassin", "archer"],
            translatedName: "Кинжал",
            slots: ["leftHand"],
            characteristics: {
                power: 30,
                randomDamage: 0.05,
                accuracy: 35,
                evasion: 20
            }
        }, {
            type: "mace",
            category: "mace",
            typeTranslatedName: "Посох",
            classOwner: ["mage", "priest"],
            translatedName: "Посох",
            slots: ["leftHand"],
            characteristics: {
                power: 50,
                randomDamage: 0.1,
                mpRestoreSpeed: 0.15,
                maxMpMul: 1 + 0.18
            }
        }, {
            type: "bow",
            category: "bow",
            typeTranslatedName: "Лук",
            classOwner: ["archer", "warrior", "assassin"],
            translatedName: "Лук",
            slots: ["leftHand", "rightHand"],
            characteristics: {
                power: 38,
                randomDamage: 0.05,
                maxCpMul: 1 + 0.05,
                criticalChance: 15,
            }
        }, {
            category: "bow",
            type: "crossbow",
            typeTranslatedName: "Арбалет",
            classOwner: ["archer", "warrior", "assassin"],
            translatedName: "Арбалет",
            slots: ["leftHand", "rightHand"],
            characteristics: {
                power: 54,
                randomDamage: 0.1,
                criticalChance: 10,
                criticalDamage: 1 + 0.05,
            }
        }, {
            category: "blunt",
            type: "blunt",
            typeTranslatedName: "Блант",
            classOwner: ["warrior", "priest"],
            translatedName: "Блант",
            slots: ["leftHand"],
            penalty: null,
            characteristics: {
                power: 66,
                randomDamage: 0.2,
                criticalDamage: 1 + 0.5,
                cpRestoreSpeed: 0.08,
                hpRestoreSpeed: 0.1,
                maxHpMul: 1 + 0.07
            }
        }, {
            category: "fists",
            type: "fists",
            typeTranslatedName: "Кастеты",
            classOwner: ["warrior"],
            translatedName: "Кастеты",
            slots: ["leftHand", "rightHand"],
            penalty: null,
            characteristics: {
                power: 52,
                randomDamage: 0.05,
                criticalChance: 12,
                cpRestoreSpeed: 0.1,
                hpRestoreSpeed: 0.08,
                maxCpMul: 1 + 0.05
            }
        }]
    }, {
        name: "armor",
        translatedName: 'Снаряжение',
        // Вид снаряжения
        kind: [{
            type: "heavy",
            classOwner: ["warrior"],
            typeTranslatedName: "Тяжёлое",
            translatedName: "Шлем",
            slots: ["helmet"],
            category: "helmet",
            penalty: {},
            characteristics: {
                defence: 3,
                mpRestoreSpeed: -0.0155,
                maxHpMul: 1 + 0.017,
                incomingDamageModifier: 1 + 0.005
            }
        }, {
            type: "medium",
            classOwner: ["assassin", "archer", "warrior"],
            typeTranslatedName: "Среднее",
            translatedName: "Шлем",
            slots: ["helmet"],
            category: "helmet",
            characteristics: {
                defence: 2.5,
                accuracy: 2,
                maxCpMul: 1 + 0.003,
                evasion: -2,
                cpRestoreSpeed: -0.02
            }
        }, {
            type: "light",
            classOwner: ["assassin", "archer", "priest", "warrior"],
            typeTranslatedName: "Лёгкое",
            translatedName: "Шлем",
            slots: ["helmet"],
            category: "helmet",
            characteristics: {
                defence: 1.75,
                incomingDamageModifier: 1 + 0.0175,
                accuracy: 8
            }
        }, {
            type: "robe",
            classOwner: ["priest", "mage"],
            typeTranslatedName: "Роба",
            translatedName: "Тиара",
            slots: ["helmet"],
            category: "helmet",
            characteristics: {
                defence: 1.55,
                maxMpMul: 1 + 0.03,
                mpRestoreSpeed: 0.045,
                maxHpMul: 1 + 0.016,
                incomingDamageModifier: 1 + 0.048
            }
        }, {
            type: "heavy",
            classOwner: ["warrior"],
            typeTranslatedName: "Тяжёлое",
            translatedName: "Перчатки",
            slots: ["gloves"],
            category: "gloves",
            characteristics: {
                defence: 6,
                maxHpMul: 1 + 0.024,
                incomingDamageModifier: 1 - 0.018,
                accuracy: -3,
                mpRestoreSpeed: -0.03
            }
        }, {
            type: "medium",
            classOwner: ["assassin", "archer", "warrior"],
            typeTranslatedName: "Среднее",
            translatedName: "Перчатки",
            slots: ["gloves"],
            category: "gloves",
            characteristics: {
                defence: 4.75,
                accuracy: 3,
                evasion: -2,
                cpRestoreSpeed: -0.02
            }
        }, {
            type: "light",
            classOwner: ["assassin", "archer", "priest", "warrior"],
            typeTranslatedName: "Лёгкое",
            translatedName: "Перчатки",
            slots: ["gloves"],
            category: "gloves",
            characteristics: {
                defence: 3.5,
                additionalDamageMul: 0.025,
                accuracy: 4,
                incomingDamageModifier: 1 + 0.0175
            }
        }, {
            type: "robe",
            classOwner: ["priest", "mage"],
            typeTranslatedName: "Роба",
            translatedName: "Наручи",
            slots: ["gloves"],
            category: "gloves",
            characteristics: {
                defence: 2.25,
                maxMpMul: 0.04,
                mpRestoreSpeed: 0.065,
                maxCpMul: 0.024,
                incomingDamageModifier: 1 + 0.048
            }
        }, {
            type: "heavy",
            classOwner: ["warrior"],
            typeTranslatedName: "Тяжёлое",
            translatedName: "Поножи",
            slots: ["down"],
            category: "greaves",
            characteristics: {
                defence: 7,
                maxCpMul: 0.04,
                incomingDamageModifier: 1 + 0.022,
                evasion: -5,
                accuracy: -4
            }
        }, {
            type: "medium",
            classOwner: ["assassin", "archer", "warrior"],
            typeTranslatedName: "Среднее",
            translatedName: "Поножи",
            slots: ["down"],
            category: "greaves",
            characteristics: {
                defence: 5.55,
                hpRestoreSpeed: -0.02
            }
        }, {
            type: "light",
            classOwner: ["assassin", "archer", "priest", "warrior"],
            typeTranslatedName: "Лёгкое",
            translatedName: "Поножи",
            slots: ["down"],
            category: "greaves",
            characteristics: {
                defence: 3.85,
                evasion: 7,
                accuracy: 3,
                incomingDamageModifier: 1 + 0.0275
            }
        }, {
            type: "robe",
            classOwner: ["priest", "mage"],
            typeTranslatedName: "Роба",
            translatedName: "Обмотки",
            slots: ["down"],
            category: "greaves",
            characteristics: {
                defence: 2.98,
                maxMpMul: 1 + 0.06,
                mpRestoreSpeed: 0.015,
                maxHpMul: 1 + 0.034,
                incomingDamageModifier: 1 + 0.048
            }
        }, {
            type: "heavy",
            classOwner: ["warrior"],
            typeTranslatedName: "Тяжёлое",
            translatedName: "Ботинки",
            slots: ["boots"],
            category: "boots",
            characteristics: {
                defence: 5,
                maxMpMul: 0.027,
                incomingDamageModifier: 1 + 0.006,
                evasion: -5,
                accuracy: -3,
                hpRestoreSpeed: -0.03
            }
        }, {
            type: "medium",
            classOwner: ["assassin", "archer", "warrior"],
            typeTranslatedName: "Среднее",
            translatedName: "Ботинки",
            slots: ["boots"],
            category: "boots",
            characteristics: {
                defence: 3.5,
                accuracy: 6,
                additionalDamageMul: 1 + 0.025,
                evasion: -1,
                mpRestoreSpeed: -0.03
            }
        }, {
            type: "light",
            classOwner: ["assassin", "archer", "priest", "warrior"],
            typeTranslatedName: "Лёгкое",
            translatedName: "Сапоги",
            slots: ["boots"],
            category: "boots",
            characteristics: {
                defence: 2.5,
                evasion: 6,
                accuracy: 4,
                incomingDamageModifier: 1 + 0.0275
            }
        }, {
            type: "robe",
            classOwner: ["priest", "mage"],
            typeTranslatedName: "Роба",
            translatedName: "Ножные браслеты",
            slots: ["boots"],
            category: "boots",
            characteristics: {
                defence: 1.75,
                incomingDamageModifier: 1 + 0.048
            }
        }, {
            type: "heavy",
            classOwner: ["warrior"],
            typeTranslatedName: "Тяжёлое",
            translatedName: "Верхняя часть доспеха",
            slots: ["up"],
            category: "body",
            characteristics: {
                defence: 9,
                maxHpMul: 1 + 0.0244,
                incomingDamageModifier: 1 - 0.022,
                evasion: -8,
                accuracy: -6
            }
        }, {
            type: "medium",
            classOwner: ["assassin", "archer", "warrior"],
            typeTranslatedName: "Среднее",
            translatedName: "Верхняя часть доспеха",
            slots: ["up"],
            category: "body",
            characteristics: {
                defence: 7.5,
                accuracy: 6,
                additionalDamageMul: 1 + 0.015,
                evasion: -2,
                cpRestoreSpeed: -0.02
            }
        }, {
            type: "light",
            classOwner: ["assassin", "archer", "priest", "warrior"],
            typeTranslatedName: "Лёгкое",
            translatedName: "Верхняя часть доспеха",
            slots: ["up"],
            category: "body",
            characteristics: {
                defence: 5.5,
                evasion: 10,
                additionalDamageMul: 1 + 0.025,
                accuracy: 8,
                incomingDamageModifier: 1 + 0.0275
            }
        }, {
            type: "robe",
            classOwner: ["priest", "mage"],
            typeTranslatedName: "Роба",
            translatedName: "Верхняя часть доспеха",
            slots: ["up"],
            category: "body",
            penalty: {},
            characteristics: {
                defence: 4.75,
                maxMpMul: 1 + 0.03,
                mpRestoreSpeed: 0.045,
                incomingDamageModifier: 1 + 0.048,
                maxHpMul: 1 + 0.016
            }
        }, {
            type: "heavy",
            classOwner: ["warrior"],
            typeTranslatedName: "Тяжёлое",
            translatedName: "Целый доспех",
            slots: ["up", "down"],
            category: "fullBody",
            characteristics: {
                defence: 15,
                maxHpMul: 1 + 0.0544,
                incomingDamageModifier: 1 + 0.042,
                evasion: -7,
                accuracy: -5,
                mpRestoreSpeed: -0.08
            }
        }, {
            type: "medium",
            classOwner: ["assassin", "archer", "warrior"],
            typeTranslatedName: "Среднее",
            translatedName: "Целый доспех",
            slots: ["up", "down"],
            category: "fullBody",
            characteristics: {
                defence: 11.5,
                accuracy: 4,
                additionalDamageMul: 1 + 0.015,
                evasion: -2,
                cpRestoreSpeed: -0.02
            }
        }, {
            type: "light",
            classOwner: ["assassin", "archer", "priest", "warrior"],
            typeTranslatedName: "Лёгкое",
            translatedName: "Одеяние",
            slots: ["up", "down"],
            category: "fullBody",
            characteristics: {
                defence: 9.7,
                evasion: 12,
                additionalDamageMul: 1 + 0.015,
                incomingDamageModifier: 1 + 0.0275,
                accuracy: 2
            }
        }, {
            type: "robe",
            classOwner: ["priest", "mage"],
            typeTranslatedName: "Роба",
            translatedName: "Мантия",
            slots: ["up", "down"],
            category: "fullBody",
            characteristics: {
                defence: 8.95,
                maxMpMul: 1 + 0.07,
                mpRestoreSpeed: 0.025,
                incomingDamageModifier: 1 + 0.048,
                maxHpMul: 1 + 0.036
            }
        }]
    }, {
        name: "shield",
        translatedName: 'Щит',
        // Виды щитов
        kind: [{
            type: "bigShield",
            translatedName: "Большой щит",
            typeTranslatedName: "Большой щит",
            classOwner: ["priest", "mage", "warrior"],
            slots: ["rightHand"],
            characteristics: {
                block: 45,
                maxHpMul: 1 + 0.03,
                incomingDamageModifier: 0.05,
                evasion: -10,
                accuracy: -8
            }
        }, {
            type: "smallShield",
            classOwner: ["priest", "mage", "warrior", "assassin"],
            translatedName: "Маленький щит",
            typeTranslatedName: "Маленький щит",
            slots: ["rightHand"],
            characteristics: {
                block: 15,
                maxCpMul: 1 + 0.06,
                cpRestoreSpeed: 0.05,
                evasion: -4,
                accuracy: -2
            }
        }, {
            category: "sigill",
            classOwner: ["priest", "mage"],
            typeTranslatedName: "Сигил",
            translatedName: "Сигил",
            type: "sigill",
            slots: ["rightHand"],
            characteristics: {
                block: 7,
                maxMpMul: 1 + 0.08,
                mpRestoreSpeed: 0.09,
                evasion: -2,
                accuracy: -2
            }
        }]
    }
        // , {
        //     translatedName: "Плащ", name: "cloak", slots: ["cloak"]
        // }
    ]
};