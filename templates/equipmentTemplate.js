// Переделать шаблон на массив экипировки

module.exports = {
// Классы и соответствующие им цены и характеристики
    grades: [{
        name: 'noGrade',
        cost: 100,
        lvl: {from: 1, to: 20},
        characteristics: {min: 0, max: 2},
        quality: {min: 0, max: 5},
        persistence: {min: 1, max: 15}
    }, {
        name: 'D',
        cost: 1200,
        lvl: {from: 21, to: 39},
        characteristics: {min: 1, max: 2},
        quality: {min: 0, max: 10},
        persistence: {min: 15, max: 50}
    }, {
        name: 'C',
        cost: 3400,
        lvl: {from: 40, to: 54},
        characteristics: {min: 1, max: 3},
        quality: {min: 0, max: 100},
        persistence: {min: 15, max: 85}
    }, {
        name: 'B',
        cost: 7000,
        lvl: {from: 55, to: 60},
        characteristics: {min: 2, max: 3},
        quality: {min: 0, max: 100},
        persistence: {min: 35, max: 120}
    }, {
        name: 'A',
        cost: 55000,
        lvl: {from: 61, to: 69},
        characteristics: {min: 3, max: 4},
        quality: {min: 0, max: 100},
        persistence: {min: 45, max: 155}
    }, {
        name: 'S',
        cost: 136000,
        lvl: {from: 70, to: 79},
        characteristics: {min: 3, max: 5},
        quality: {min: 0, max: 100},
        persistence: {min: 55, max: 190}
    }, {
        name: 'SS',
        cost: 223000,
        lvl: {from: 80, to: 94},
        characteristics: {min: 4, max: 6},
        quality: {min: 0, max: 100},
        persistence: {min: 75, max: 225}
    }, {
        name: 'SSS',
        cost: 1890000,
        lvl: {from: 95, to: 100},
        characteristics: {min: 6, max: 8},
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
            penalty: null,
            characteristics: {
                power: 45,
                randomDamage: 0.1
            }
        }, {
            type: "twoHandedSword",
            classOwner: ["warrior"],
            category: "sword",
            typeTranslatedName: "Двуручный меч",
            translatedName: "Двуручный меч",
            slots: ["leftHand", "rightHand"],
            penalty: null,
            characteristics: {
                power: 45,
                randomDamage: 0.1
            }
        }, {
            type: "dagger",
            category: "dagger",
            typeTranslatedName: "Кинжал",
            classOwner: ["warrior", "assassin", "archer"],
            translatedName: "Кинжал",
            slots: ["leftHand"],
            penalty: null,
            characteristics: {
                power: 30,
                randomDamage: 0.05
            }
        }, {
            type: "mace",
            category: "mace",
            typeTranslatedName: "Посох",
            classOwner: ["mage", "priest"],
            translatedName: "Посох",
            slots: ["leftHand"],
            penalty: null,
            characteristics: {
                power: 50,
                randomDamage: 0.1
            }
        }, {
            type: "bow",
            category: "bow",
            typeTranslatedName: "Лук",
            classOwner: ["archer", "warrior", "assassin"],
            translatedName: "Лук",
            slots: ["leftHand", "rightHand"],
            penalty: null,
            characteristics: {
                power: 38,
                randomDamage: 0.05
            }
        }, {
            category: "bow",
            type: "crossbow",
            typeTranslatedName: "Арбалет",
            classOwner: ["archer", "warrior", "assassin"],
            translatedName: "Арбалет",
            slots: ["leftHand", "rightHand"],
            penalty: null,
            characteristics: {
                power: 54,
                randomDamage: 0.1
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
                randomDamage: 0.2
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
                randomDamage: 0.05
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
            penalty: {
                mpRestoreSpeed: 0.0155
            },
            characteristics: {
                defence: 3,
                maxHp: 0.017,
                reduceIncomingDamage: 0.005
            }
        }, {
            type: "medium",
            classOwner: ["assassin", "archer", "warrior"],
            typeTranslatedName: "Среднее",
            translatedName: "Шлем",
            slots: ["helmet"],
            category: "helmet",
            penalty: {
                evasion: 2,
                cpRestoreSpeed: 0.02
            },
            characteristics: {
                defence: 2.5,
                accuracy: 2,
                maxCp: 0.003
            }
        }, {
            type: "light",
            classOwner: ["assassin", "archer", "priest", "warrior"],
            typeTranslatedName: "Лёгкое",
            translatedName: "Шлем",
            slots: ["helmet"],
            category: "helmet",
            penalty: {
                reduceIncomingDamage: 0.0175
            },
            characteristics: {
                defence: 1.75,
                accuracy: 8
            }
        }, {
            type: "robe",
            classOwner: ["priest", "mage"],
            typeTranslatedName: "Роба",
            translatedName: "Тиара",
            slots: ["helmet"],
            category: "helmet",
            penalty: {
                reduceIncomingDamage: 0.048
            },
            characteristics: {
                defence: 1.55,
                maxMp: 0.03,
                mpRestoreSpeed: 0.045,
                maxHp: 0.016
            }
        }, {
            type: "heavy",
            classOwner: ["warrior"],
            typeTranslatedName: "Тяжёлое",
            translatedName: "Перчатки",
            slots: ["gloves"],
            category: "gloves",
            penalty: {
                accuracy: 3,
                mpRestoreSpeed: 0.03
            },
            characteristics: {
                defence: 6,
                maxHp: 0.024,
                reduceIncomingDamage: 0.018
            }
        }, {
            type: "medium",
            classOwner: ["assassin", "archer", "warrior"],
            typeTranslatedName: "Среднее",
            translatedName: "Перчатки",
            slots: ["gloves"],
            category: "gloves",
            penalty: {
                evasion: 2,
                cpRestoreSpeed: 0.02
            },
            characteristics: {
                defence: 4.75,
                accuracy: 3
            }
        }, {
            type: "light",
            classOwner: ["assassin", "archer", "priest", "warrior"],
            typeTranslatedName: "Лёгкое",
            translatedName: "Перчатки",
            slots: ["gloves"],
            category: "gloves",
            penalty: {
                reduceIncomingDamage: 0.0175
            },
            characteristics: {
                defence: 3.5,
                additionalDamage: 0.025,
                accuracy: 4
            }
        }, {
            type: "robe",
            classOwner: ["priest", "mage"],
            typeTranslatedName: "Роба",
            translatedName: "Наручи",
            slots: ["gloves"],
            category: "gloves",
            penalty: {
                reduceIncomingDamage: 0.048
            },
            characteristics: {
                defence: 2.25,
                maxMp: 0.04,
                mpRestoreSpeed: 0.065,
                maxCp: 0.024
            }
        }, {
            type: "heavy",
            classOwner: ["warrior"],
            typeTranslatedName: "Тяжёлое",
            translatedName: "Поножи",
            slots: ["down"],
            category: "greaves",
            penalty: {
                evasion: 5,
                accuracy: 4
            },
            characteristics: {
                defence: 7,
                maxCp: 0.04,
                reduceIncomingDamage: 0.022
            }
        }, {
            type: "medium",
            classOwner: ["assassin", "archer", "warrior"],
            typeTranslatedName: "Среднее",
            translatedName: "Поножи",
            slots: ["down"],
            category: "greaves",
            penalty: {
                hpRestoreSpeed: 0.02
            },
            characteristics: {
                defence: 5.55
            }
        }, {
            type: "light",
            classOwner: ["assassin", "archer", "priest", "warrior"],
            typeTranslatedName: "Лёгкое",
            translatedName: "Поножи",
            slots: ["down"],
            category: "greaves",
            penalty: {
                reduceIncomingDamage: 0.0275
            },
            characteristics: {
                defence: 3.85,
                evasion: 7,
                accuracy: 3
            }
        }, {
            type: "robe",
            classOwner: ["priest", "mage"],
            typeTranslatedName: "Роба",
            translatedName: "Обмотки",
            slots: ["down"],
            category: "greaves",
            penalty: {
                reduceIncomingDamage: 0.048
            },
            characteristics: {
                defence: 2.98,
                maxMp: 0.06,
                mpRestoreSpeed: 0.015,
                maxHp: 0.034
            }
        }, {
            type: "heavy",
            classOwner: ["warrior"],
            typeTranslatedName: "Тяжёлое",
            translatedName: "Ботинки",
            slots: ["boots"],
            category: "boots",
            penalty: {
                evasion: 5,
                accuracy: 3,
                hpRestoreSpeed: 0.03
            },
            characteristics: {
                defence: 5,
                maxMp: 0.027,
                reduceIncomingDamage: 0.006
            }
        }, {
            type: "medium",
            classOwner: ["assassin", "archer", "warrior"],
            typeTranslatedName: "Среднее",
            translatedName: "Ботинки",
            slots: ["boots"],
            category: "boots",
            penalty: {
                evasion: 1,
                mpRestoreSpeed: 0.03
            },
            characteristics: {
                defence: 3.5,
                accuracy: 6,
                additionalDamage: 0.025
            }
        }, {
            type: "light",
            classOwner: ["assassin", "archer", "priest", "warrior"],
            typeTranslatedName: "Лёгкое",
            translatedName: "Сапоги",
            slots: ["boots"],
            category: "boots",
            penalty: {
                reduceIncomingDamage: 0.0275
            },
            characteristics: {
                defence: 2.5,
                evasion: 6,
                accuracy: 4
            }
        }, {
            type: "robe",
            classOwner: ["priest", "mage"],
            typeTranslatedName: "Роба",
            translatedName: "Ножные браслеты",
            slots: ["boots"],
            category: "boots",
            penalty: {
                reduceIncomingDamage: 0.048
            },
            characteristics: {
                defence: 1.75
            }
        }, {
            type: "heavy",
            classOwner: ["warrior"],
            typeTranslatedName: "Тяжёлое",
            translatedName: "Верхняя часть доспеха",
            slots: ["up"],
            category: "body",
            penalty: {
                evasion: 8,
                accuracy: 6
            },
            characteristics: {
                defence: 9,
                maxHp: 0.0244,
                reduceIncomingDamage: 0.022
            }
        }, {
            type: "medium",
            classOwner: ["assassin", "archer", "warrior"],
            typeTranslatedName: "Среднее",
            translatedName: "Верхняя часть доспеха",
            slots: ["up"],
            category: "body",
            penalty: {
                evasion: 2,
                cpRestoreSpeed: 0.02
            },
            characteristics: {
                defence: 7.5,
                accuracy: 6,
                additionalDamage: 0.015
            }
        }, {
            type: "light",
            classOwner: ["assassin", "archer", "priest", "warrior"],
            typeTranslatedName: "Лёгкое",
            translatedName: "Верхняя часть доспеха",
            slots: ["up"],
            category: "body",
            penalty: {
                reduceIncomingDamage: 0.0275
            },
            characteristics: {
                defence: 5.5,
                evasion: 10,
                additionalDamage: 0.025,
                accuracy: 8
            }
        }, {
            type: "robe",
            classOwner: ["priest", "mage"],
            typeTranslatedName: "Роба",
            translatedName: "Верхняя часть доспеха",
            slots: ["up"],
            category: "body",
            penalty: {
                reduceIncomingDamage: 0.048
            },
            characteristics: {
                defence: 4.75,
                maxMp: 0.03,
                mpRestoreSpeed: 0.045,
                maxHp: 0.016
            }
        }, {
            type: "heavy",
            classOwner: ["warrior"],
            typeTranslatedName: "Тяжёлое",
            translatedName: "Целый доспех",
            slots: ["up", "down"],
            category: "fullBody",
            penalty: {
                evasion: 7,
                accuracy: 5,
                mpRestoreSpeed: 0.08
            },
            characteristics: {
                defence: 15,
                maxHp: 0.0544,
                reduceIncomingDamage: 0.042
            }
        }, {
            type: "medium",
            classOwner: ["assassin", "archer", "warrior"],
            typeTranslatedName: "Среднее",
            translatedName: "Целый доспех",
            slots: ["up", "down"],
            category: "fullBody",
            penalty: {
                evasion: 2,
                cpRestoreSpeed: 0.02
            },
            characteristics: {
                defence: 11.5,
                accuracy: 4,
                additionalDamage: 0.015
            }
        }, {
            type: "light",
            classOwner: ["assassin", "archer", "priest", "warrior"],
            typeTranslatedName: "Лёгкое",
            translatedName: "Одеяние",
            slots: ["up", "down"],
            category: "fullBody",
            penalty: {
                reduceIncomingDamage: 0.0275
            },
            characteristics: {
                defence: 9.7,
                evasion: 12,
                additionalDamage: 0.015,
                accuracy: 2
            }
        }, {
            type: "robe",
            classOwner: ["priest", "mage"],
            typeTranslatedName: "Роба",
            translatedName: "Мантия",
            slots: ["up", "down"],
            category: "fullBody",
            penalty: {
                reduceIncomingDamage: 0.048
            },
            characteristics: {
                defence: 8.95,
                maxMp: 0.07,
                mpRestoreSpeed: 0.025,
                maxHp: 0.036
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
            slots: ["leftHand"],
            penalty: {
                evasion: 10,
                accuracy: 8
            },
            characteristics: {
                block: 45,
                maxHp: 0.03,
                reduceIncomingDamage: 5
            }
        }, {
            type: "smallShield",
            classOwner: ["priest", "mage", "warrior", "assassin"],
            translatedName: "Маленький щит",
            typeTranslatedName: "Маленький щит",
            slots: ["leftHand"],
            penalty: {
                evasion: 4,
                accuracy: 2
            },
            characteristics: {
                block: 15,
                maxCp: 0.06,
                cpRestoreSpeed: 0.05
            }
        }, {
            category: "sigill",
            classOwner: ["priest", "mage"],
            typeTranslatedName: "Сигил",
            translatedName: "Сигил",
            type: "sigill",
            slots: ["leftHand"],
            penalty: {
                evasion: 2,
                accuracy: 2
            },
            characteristics: {
                block: 7,
                maxMp: 0.08,
                mpRestoreSpeed: 0.09
            }
        }]
    }
        // , {
        //     translatedName: "Плащ", name: "cloak", slots: ["cloak"]
        // }
    ]
};