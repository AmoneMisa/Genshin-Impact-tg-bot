module.exports = {
// Классы и соответствующие им цены и характеристики
    grades: [{
        name: 'noGrade',
        cost: 100,
        lvl: {from: 1, to: 20},
        characteristics: {min: 0, max: 2},
        quality: {min: 0, max: 0},
        persistence: {min: 1, max: 15}
    }, {
        name: 'D',
        cost: 1200,
        lvl: {from: 21, to: 39},
        characteristics: {min: 1, max: 2},
        quality: {min: 0, max: 0},
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
        {name: 'Сломано', cost: 50, count: 0},
        {name: 'Обычное', cost: 160, count: 1},
        {name: 'Необычное', cost: 600, count: 2},
        {name: 'Особое', cost: 5000, count: 3},
        {name: 'Уникальное', cost: 8900, count: 4},
        {name: 'Редкое', cost: 25000, count: 5},
        {name: 'Королевское', cost: 197000, count: 6},
        {name: 'Магическое', cost: 435000, count: 7},
        {name: 'Божественное', cost: 6500000, count: 8}
    ],
    // Предметы
    itemType: [{
        name: "weapon",
        translatedName: 'Оружие',
        // Типы оружия
        types: [{
            translatedName: "Одноручный меч", name: "oneHandedSword", types: ["sword", "oneHanded"], hand: 1
        }, {
            translatedName: "Двуручный меч", name: "twoHandedSword", types: ["sword", "twoHanded"], hand: 2
        }, {
            translatedName: "Кинжал", name: "dagger", types: ["dagger", "oneHanded"], hand: 1
        }, {
            translatedName: "Посох", name: "mace", types: ["mace", "oneHanded"], hand: 1
        }, {
            translatedName: "Блант", name: "blunt", types: ["blunt", "oneHanded"], hand: 1
        }, {
            translatedName: "Лук", name: "bow", types: ["bow", "twoHanded"], hand: 2
        }, {
            translatedName: "Арбалет", name: "crossbow", types: ["crossbow", "twoHanded"], hand: 2
        }, {
            translatedName: "Кастеты", name: "knuckles", types: ["knuckles", "twoHanded"], hand: 2
        }],
        kind: [{
            sword: {
                translatedName: "Меч",
                penalty: null,
                characteristics: {
                    power: 45,
                    randomDamage: 0.1
                }
            }, dagger: {
                translatedName: "Кинжал",
                penalty: null,
                characteristics: {
                    power: 30,
                    randomDamage: 0.05
                }
            }, mace: {
                translatedName: "Посох",
                penalty: null,
                characteristics: {
                    power: 50,
                    randomDamage: 0.1
                }
            }, bow: {
                translatedName: "Лук",
                penalty: null,
                characteristics: {
                    power: 38,
                    randomDamage: 0.05
                }
            }, crossbow: {
                translatedName: "Арбалет",
                penalty: null,
                characteristics: {
                    power: 54,
                    randomDamage: 0.1
                }
            }, blunt: {
                translatedName: "Блант",
                penalty: null,
                characteristics: {
                    power: 66,
                    randomDamage: 0.2
                }
            }, fists: {
                translatedName: "Кастеты",
                penalty: null,
                characteristics: {
                    power: 52,
                    randomDamage: 0.05
                }
            }
        }]
    }, {
        name: "equipment",
        translatedName: 'Снаряжение',
        // Тип снаряжения
        types: [{
            translatedName: "Шлем", name: "helmet", slots: ["helmet"]
        }, {
            translatedName: "Перчатки", name: "gloves", slots: ["gloves"]
        }, {
            translatedName: "Поножи", name: "greaves", slots: ["down"]
        }, {
            translatedName: "Ботинки", name: "boots", slots: ["boots"]
        }, {
            translatedName: "Плащ", name: "cloak", slots: ["cloak"]
        }, {
            translatedName: "Верхняя часть доспеха", name: "body", slots: ["up"]
        }, {
            translatedName: "Целый доспех", name: "full-body", slots: ["up", "down"]
        }],
        // Вид снаряжения
        kind: [{
            name: "heavy",
            translatedName: "Тяжёлое",
            penalty: {
                evasion: 5,
                accuracy: 3,
                mpRestoreSpeed: 0.03
            },
            characteristics: {
                defence: 5,
                maxHp: 0.037,
                reduceIncomingDamage: 0.018
            }
        }, {
            name: "medium",
            translatedName: "Среднее",
            penalty: {
                evasion: 2,
                cpRestoreSpeed: 0.02
            },
            characteristics: {
                defence: 3.5,
                accuracy: 6,
                additionalDamage: 0.015
            }
        }, {
            name: "light",
            translatedName: "Лёгкое",
            penalty: {
                reduceIncomingDamage: 0.0275
            },
            characteristics: {
                defence: 2.5,
                evasion: 10,
                additionalDamage: 0.025,
                accuracy: 8
            }
        }, {
            name: "robe",
            translatedName: "Роба",
            penalty: {
                reduceIncomingDamage: 0.048
            },
            characteristics: {
                defence: 1.75,
                maxMp: 0.03,
                mpRestoreSpeed: 0.045,
                name: "maxHp", value: 0.016
            }
        }]
    }, {
        name: "shield",
        translatedName: 'Щит',
        // Виды щитов
        kind: [{
            name: "Большой щит",
            translatedName: "big-shield",
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
            name: "small-shield",
            translatedName: "Маленький щит",
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
            name: "sigill",
            translatedName: "Сигил",
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
    }]
};