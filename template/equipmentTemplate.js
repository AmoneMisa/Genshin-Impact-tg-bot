// Lineage 2 (High Five) equipment. Grades are the Lineage 2 ones (no-grade, D, C, B, A, S, S80, S84): a grade
// is the level band an item is meant for (wearing it below the band is penalised, see isHasPenalty.js).
// Items are fixed named catalog entries (functions/game/equipment/catalog.js) built from `lineage`: real
// P.Atk / M.Atk, P.Def and M.Def of High Five items converted to game stats. There are no random rolls.
//   cost        base sell price in gold
//   crystals    crystals of this grade a destroyed / crystallised main weapon yields
//   scrollGold  gold price of one enchant scroll of this grade
// lineage.curve: weapon power is topWeaponPower * (real stat / real S84 stat) ^ curve. 1 is the real proportion
// (a no-grade sword is 6% of an S84 one); 0.75 lifts the low grades so the first weapons still matter.
export default {
    grades: [
        {name: 'noGrade', label: 'Без грейда', cost: 100, lvl: {from: 1, to: 19}, crystals: 0, scrollGold: 0},
        {name: 'D', label: 'D', cost: 1200, lvl: {from: 20, to: 39}, crystals: 20, scrollGold: 2000},
        {name: 'C', label: 'C', cost: 3400, lvl: {from: 40, to: 51}, crystals: 45, scrollGold: 6500},
        {name: 'B', label: 'B', cost: 7000, lvl: {from: 52, to: 60}, crystals: 90, scrollGold: 16000},
        {name: 'A', label: 'A', cost: 55000, lvl: {from: 61, to: 75}, crystals: 160, scrollGold: 42000},
        {name: 'S', label: 'S', cost: 136000, lvl: {from: 76, to: 79}, crystals: 300, scrollGold: 95000},
        {name: 'S80', label: 'S80', cost: 223000, lvl: {from: 80, to: 83}, crystals: 480, scrollGold: 180000},
        {name: 'S84', label: 'S84', cost: 1890000, lvl: {from: 84, to: 99}, crystals: 720, scrollGold: 420000}
    ],
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
    gradeRarity: {noGrade: 'common', D: 'unusual', C: 'special', B: 'unique', A: 'rare', S: 'royal', S80: 'magic', S84: 'goddess'},
    enchant: {
        max: 16,
        safe: 3,
        safeFullBody: 4,
        chance: 0.66,
        step: 0.035,
        stepAbove: 0.07,
        crystalShare: {weapon: 1, up: 0.8, fullBody: 1, down: 0.5, helmet: 0.35, gloves: 0.3, boots: 0.3, shield: 0.5, jewelry: 0.4},
        blessedCrystals: 12,
        plainCrystals: 3,
        blessedGoldMultiplier: 2
    },
    weaponAbility: {
        oneHandedSword: {label: 'Фокус', stat: 'criticalChance', values: [4, 6, 8]},
        twoHandedSword: {label: 'Сила крита', stat: 'criticalDamage', values: [1.06, 1.1, 1.15]},
        dagger: {label: 'Точность', stat: 'accuracy', values: [5, 8, 11]},
        mace: {label: 'Мудрость', stat: 'mpRestoreSpeed', values: [0.06, 0.1, 0.14]},
        bow: {label: 'Меткость', stat: 'criticalChance', values: [5, 7, 10]},
        crossbow: {label: 'Прицельность', stat: 'accuracy', values: [6, 9, 12]},
        blunt: {label: 'Живучесть', stat: 'hpRestoreSpeed', values: [0.1, 0.16, 0.22]},
        fists: {label: 'Быстрота', stat: 'speed', values: [3, 5, 8]}
    },
    itemType: [
        {
            name: 'weapon',
            translatedName: 'Оружие',
            kind: [
                {
                    classOwner: ['warrior'],
                    category: 'sword',
                    type: 'oneHandedSword',
                    typeTranslatedName: 'Меч',
                    translatedName: 'Меч',
                    slots: ['leftHand', 'rightHand'],
                    characteristics: {randomDamage: 0.1, accuracy: 20}
                },
                {
                    type: 'twoHandedSword',
                    classOwner: ['warrior'],
                    category: 'sword',
                    typeTranslatedName: 'Двуручный меч',
                    translatedName: 'Двуручный меч',
                    slots: ['leftHand', 'rightHand'],
                    characteristics: {randomDamage: 0.1, criticalDamage: 1.15}
                },
                {
                    type: 'dagger',
                    category: 'dagger',
                    typeTranslatedName: 'Кинжал',
                    classOwner: ['warrior', 'assassin', 'archer'],
                    translatedName: 'Кинжал',
                    slots: ['leftHand'],
                    characteristics: {randomDamage: 0.05, accuracy: 35, evasion: 20}
                },
                {
                    type: 'mace',
                    category: 'mace',
                    typeTranslatedName: 'Посох',
                    classOwner: ['mage', 'priest'],
                    translatedName: 'Посох',
                    slots: ['leftHand'],
                    characteristics: {randomDamage: 0.1, mpRestoreSpeed: 0.15, maxMpMul: 1.18}
                },
                {
                    type: 'bow',
                    category: 'bow',
                    typeTranslatedName: 'Лук',
                    classOwner: ['archer', 'warrior', 'assassin'],
                    translatedName: 'Лук',
                    slots: ['leftHand', 'rightHand'],
                    characteristics: {randomDamage: 0.05, maxCpMul: 1.05, criticalChance: 15}
                },
                {
                    category: 'bow',
                    type: 'crossbow',
                    typeTranslatedName: 'Арбалет',
                    classOwner: ['archer', 'warrior', 'assassin'],
                    translatedName: 'Арбалет',
                    slots: ['leftHand', 'rightHand'],
                    characteristics: {randomDamage: 0.1, criticalChance: 10, criticalDamage: 1.05}
                },
                {
                    category: 'blunt',
                    type: 'blunt',
                    typeTranslatedName: 'Блант',
                    classOwner: ['warrior', 'priest'],
                    translatedName: 'Блант',
                    slots: ['leftHand'],
                    penalty: null,
                    characteristics: {randomDamage: 0.2, criticalDamage: 1.25, cpRestoreSpeed: 0.08, hpRestoreSpeed: 0.1, maxHpMul: 1.07}
                },
                {
                    category: 'fists',
                    type: 'fists',
                    typeTranslatedName: 'Кастеты',
                    classOwner: ['warrior'],
                    translatedName: 'Кастеты',
                    slots: ['leftHand', 'rightHand'],
                    penalty: null,
                    characteristics: {randomDamage: 0.05, criticalChance: 12, cpRestoreSpeed: 0.1, hpRestoreSpeed: 0.08, maxCpMul: 1.05}
                }
            ]
        },
        {
            name: 'armor',
            translatedName: 'Снаряжение',
            kind: [
                {
                    type: 'heavy',
                    classOwner: ['warrior'],
                    typeTranslatedName: 'Тяжёлое',
                    translatedName: 'Шлем',
                    slots: ['helmet'],
                    category: 'helmet',
                    penalty: {},
                    characteristics: {mpRestoreSpeed: -0.0155, maxHpMul: 1.017, incomingDamageModifier: 1.005}
                },
                {
                    type: 'light',
                    classOwner: ['assassin', 'archer', 'priest', 'warrior'],
                    typeTranslatedName: 'Лёгкое',
                    translatedName: 'Шлем',
                    slots: ['helmet'],
                    category: 'helmet',
                    characteristics: {incomingDamageModifier: 1.0175, accuracy: 8}
                },
                {
                    type: 'robe',
                    classOwner: ['priest', 'mage'],
                    typeTranslatedName: 'Роба',
                    translatedName: 'Тиара',
                    slots: ['helmet'],
                    category: 'helmet',
                    characteristics: {maxMpMul: 1.03, mpRestoreSpeed: 0.045, maxHpMul: 1.016, incomingDamageModifier: 1.048}
                },
                {
                    type: 'heavy',
                    classOwner: ['warrior'],
                    typeTranslatedName: 'Тяжёлое',
                    translatedName: 'Перчатки',
                    slots: ['gloves'],
                    category: 'gloves',
                    characteristics: {maxHpMul: 1.024, incomingDamageModifier: 0.982, accuracy: -3, mpRestoreSpeed: -0.03}
                },
                {
                    type: 'light',
                    classOwner: ['assassin', 'archer', 'priest', 'warrior'],
                    typeTranslatedName: 'Лёгкое',
                    translatedName: 'Перчатки',
                    slots: ['gloves'],
                    category: 'gloves',
                    characteristics: {additionalDamageMul: 1.025, accuracy: 4, incomingDamageModifier: 1.0175}
                },
                {
                    type: 'robe',
                    classOwner: ['priest', 'mage'],
                    typeTranslatedName: 'Роба',
                    translatedName: 'Наручи',
                    slots: ['gloves'],
                    category: 'gloves',
                    characteristics: {maxMpMul: 1.04, mpRestoreSpeed: 0.065, maxCpMul: 1.024, incomingDamageModifier: 1.048}
                },
                {
                    type: 'heavy',
                    classOwner: ['warrior'],
                    typeTranslatedName: 'Тяжёлое',
                    translatedName: 'Поножи',
                    slots: ['down'],
                    category: 'greaves',
                    characteristics: {maxCpMul: 1.04, incomingDamageModifier: 1.022, evasion: -5, accuracy: -4}
                },
                {
                    type: 'heavy',
                    classOwner: ['warrior'],
                    typeTranslatedName: 'Тяжёлое',
                    translatedName: 'Ботинки',
                    slots: ['boots'],
                    category: 'boots',
                    characteristics: {maxMpMul: 1.027, incomingDamageModifier: 1.006, evasion: -5, accuracy: -3, hpRestoreSpeed: -0.03}
                },
                {
                    type: 'light',
                    classOwner: ['assassin', 'archer', 'priest', 'warrior'],
                    typeTranslatedName: 'Лёгкое',
                    translatedName: 'Сапоги',
                    slots: ['boots'],
                    category: 'boots',
                    characteristics: {evasion: 6, accuracy: 4, incomingDamageModifier: 1.0275}
                },
                {
                    type: 'robe',
                    classOwner: ['priest', 'mage'],
                    typeTranslatedName: 'Роба',
                    translatedName: 'Ножные браслеты',
                    slots: ['boots'],
                    category: 'boots',
                    characteristics: {incomingDamageModifier: 1.048}
                },
                {
                    type: 'heavy',
                    classOwner: ['warrior'],
                    typeTranslatedName: 'Тяжёлое',
                    translatedName: 'Верхняя часть доспеха',
                    slots: ['up'],
                    category: 'body',
                    characteristics: {maxHpMul: 1.0244, incomingDamageModifier: 0.978, evasion: -8, accuracy: -6}
                },
                {
                    type: 'light',
                    classOwner: ['assassin', 'archer', 'priest', 'warrior'],
                    typeTranslatedName: 'Лёгкое',
                    translatedName: 'Одеяние',
                    slots: ['up', 'down'],
                    category: 'fullBody',
                    characteristics: {evasion: 12, additionalDamageMul: 1.015, incomingDamageModifier: 1.0275, accuracy: 2}
                },
                {
                    type: 'robe',
                    classOwner: ['priest', 'mage'],
                    typeTranslatedName: 'Роба',
                    translatedName: 'Мантия',
                    slots: ['up', 'down'],
                    category: 'fullBody',
                    characteristics: {maxMpMul: 1.07, mpRestoreSpeed: 0.025, incomingDamageModifier: 1.048, maxHpMul: 1.036}
                }
            ]
        },
        {
            name: 'shield',
            translatedName: 'Щит',
            kind: [
                {
                    type: 'bigShield',
                    translatedName: 'Большой щит',
                    typeTranslatedName: 'Большой щит',
                    classOwner: ['priest', 'mage', 'warrior'],
                    slots: ['rightHand'],
                    characteristics: {block: 45, maxHpMul: 1.03, incomingDamageModifier: 0.95, evasion: -10, accuracy: -8}
                },
                {
                    type: 'smallShield',
                    classOwner: ['priest', 'mage', 'warrior', 'assassin'],
                    translatedName: 'Маленький щит',
                    typeTranslatedName: 'Маленький щит',
                    slots: ['rightHand'],
                    characteristics: {block: 15, maxCpMul: 1.06, cpRestoreSpeed: 0.05, evasion: -4, accuracy: -2}
                },
                {
                    category: 'sigill',
                    classOwner: ['priest', 'mage'],
                    typeTranslatedName: 'Сигил',
                    translatedName: 'Сигил',
                    type: 'sigill',
                    slots: ['rightHand'],
                    characteristics: {block: 7, maxMpMul: 1.08, mpRestoreSpeed: 0.09, evasion: -2, accuracy: -2}
                }
            ]
        },
        {
            name: 'jewelry',
            translatedName: 'Украшение',
            kind: [
                {
                    type: 'ring',
                    category: 'ring',
                    classOwner: ['warrior', 'assassin', 'archer', 'priest', 'mage'],
                    typeTranslatedName: 'Кольцо',
                    translatedName: 'Кольцо',
                    slots: ['leftRing'],
                    pairSlots: ['leftRing', 'rightRing'],
                    characteristics: {accuracy: 3, maxMpMul: 1.012}
                },
                {
                    type: 'earring',
                    category: 'earring',
                    classOwner: ['warrior', 'assassin', 'archer', 'priest', 'mage'],
                    typeTranslatedName: 'Серьга',
                    translatedName: 'Серьга',
                    slots: ['leftEar'],
                    pairSlots: ['leftEar', 'rightEar'],
                    characteristics: {evasion: 2, mpRestoreSpeed: 0.012}
                },
                {
                    type: 'necklace',
                    category: 'necklace',
                    classOwner: ['warrior', 'assassin', 'archer', 'priest', 'mage'],
                    typeTranslatedName: 'Ожерелье',
                    translatedName: 'Ожерелье',
                    slots: ['necklace'],
                    characteristics: {maxHpMul: 1.014}
                }
            ]
        }
    ],
    // Lineage 2 style crafting (functions/game/equipment/craftRecipes.js): every catalog item has a recipe.
    //   ironOre   ore a main weapon of each grade needs (other pieces take their share of it)
    //   count     how many units of a grade's material family a main weapon needs
    //   uses      what a kind of item is made of, as shares of those two numbers
    //   craftLevel the crafting skill level a grade's recipes need; exp: skill experience, needExp * level^2 per level
    craft: {
        ironOre: [20, 80, 200, 450, 900, 1800, 3200, 6000],
        count: [4, 6, 8, 10, 13, 17, 22, 28],
        uses: {
            weapon: {ironOre: 1, binder: 0.6},
            heavy: {ironOre: 1, binder: 0.4},
            light: {ironOre: 0.2, leather: 1},
            robe: {ironOre: 0.1, fiber: 1},
            shield: {ironOre: 1, binder: 0.3},
            jewelry: {ironOre: 0.3, gem: 1}
        },
        craftLevel: [1, 2, 3, 4, 5, 6, 7, 8],
        successRate: {noGrade: 1, default: 0.6, jewelry: 0.7},
        goldShare: 0.12,
        learnShare: 0.4,
        exp: {success: 20, fail: 8, perGrade: 15},
        needExp: 60
    },
    lineage: {
        chronicle: 'High Five',
        source: 'l2db.ru (weapons, sets, shields, jewellery)',
        weapons: {
            oneHandedSword: [
                {name: 'Long Sword', p: 24, m: 17},
                {name: 'Elven Long Sword', p: 92, m: 54},
                {name: 'Samurai Longsword', p: 156, m: 83},
                {name: 'Sword of Damascus', p: 194, m: 99},
                {name: 'Sirra\'s Blade', p: 251, m: 121},
                {name: 'Forgotten Blade', p: 281, m: 132},
                {name: 'Dynasty Sword', p: 333, m: 151},
                {name: 'Vesper Cutter', p: 396, m: 176}
            ],
            twoHandedSword: [
                {name: 'Zweihander', p: 38, m: 21},
                {name: 'Claymore', p: 112, m: 54},
                {name: 'Berserker Blade', p: 190, m: 83},
                {name: 'Guardian Sword', p: 236, m: 99},
                {name: 'Sword of Ipos', p: 305, m: 121},
                {name: 'Heaven\'s Divider', p: 342, m: 132},
                {name: 'Dynasty Blade', p: 405, m: 151},
                {name: 'Vesper Slasher', p: 482, m: 176}
            ],
            dagger: [
                {name: 'Sword Breaker', p: 27, m: 21},
                {name: 'Mithril Dagger', p: 80, m: 54},
                {name: 'Crystal Dagger', p: 136, m: 83},
                {name: 'Demon Dagger', p: 170, m: 99},
                {name: 'Naga Storm', p: 220, m: 121},
                {name: 'Angel Slayer', p: 246, m: 132},
                {name: 'Dynasty Knife', p: 291, m: 151},
                {name: 'Vesper Shaper', p: 346, m: 176}
            ],
            mace: [
                {name: 'Willow Staff', p: 10, m: 22, derived: true},
                {name: 'Ghost Staff', p: 90, m: 79},
                {name: 'Demon\'s Staff', p: 152, m: 122},
                {name: 'Staff of Evil Spirits', p: 189, m: 145},
                {name: 'Cabrio\'s Hand', p: 202, m: 161},
                {name: 'Arcana Mace', p: 225, m: 175},
                {name: 'Dynasty Mace', p: 267, m: 202},
                {name: 'Vesper Caster', p: 317, m: 234}
            ],
            bow: [
                {name: 'Composite Bow', p: 64, m: 21},
                {name: 'Strengthened Long Bow', p: 179, m: 51},
                {name: 'Eminence Bow', p: 323, m: 83},
                {name: 'Bow of Peril', p: 400, m: 99},
                {name: 'Soul Bow', p: 528, m: 125},
                {name: 'Draconic Bow', p: 581, m: 132},
                {name: 'Dynasty Bow', p: 654, m: 151},
                {name: 'Vesper Thrower', p: 724, m: 176}
            ],
            crossbow: [
                {name: 'Wooden Crossbow', p: 40, m: 25, derived: true},
                {name: 'Cranequin', p: 117, m: 54},
                {name: 'Sharpshooter', p: 198, m: 83},
                {name: 'Hell Hound', p: 245, m: 99},
                {name: 'Reaper', p: 294, m: 114},
                {name: 'Sarnga', p: 356, m: 132},
                {name: 'Dynasty Crossbow', p: 401, m: 151},
                {name: 'Vesper Sheutjeh', p: 444, m: 176}
            ],
            blunt: [
                {name: 'Club', p: 28, m: 17, derived: true},
                {name: 'Titan Hammer', p: 96, m: 47},
                {name: 'Yaksa Mace', p: 156, m: 83},
                {name: 'Ice Storm Hammer', p: 213, m: 91},
                {name: 'Doom Crusher', p: 282, m: 114},
                {name: 'Dragon Hunter Axe', p: 342, m: 132},
                {name: 'Dynasty Crusher', p: 405, m: 151},
                {name: 'Vesper Retributer', p: 482, m: 176}
            ],
            fists: [
                {name: 'Viper Fang', p: 38, m: 21},
                {name: 'Bich\'Hwa', p: 96, m: 47},
                {name: 'Fisted Blade', p: 169, m: 76},
                {name: 'Arthro Nail', p: 213, m: 91},
                {name: 'Dragon Grinder', p: 282, m: 114},
                {name: 'Claw of Ashton Family', p: 376, m: 119},
                {name: 'Dynasty Bagh-Nakh', p: 405, m: 151},
                {name: 'Vesper Fighter', p: 482, m: 176}
            ]
        },
        weaponStat: {oneHandedSword: 'p', twoHandedSword: 'p', dagger: 'p', mace: 'm', bow: 'p', crossbow: 'p', blunt: 'p', fists: 'p'},
        topWeaponPower: 86,
        curve: 0.75,
        armor: {
            heavy: [
                {set: 'Bronze', body: 48, greaves: 30, helmet: 20, gloves: 13, boots: 13, derived: true, bonus: {}},
                {
                    set: 'Brigandine',
                    body: 103,
                    greaves: 64,
                    helmet: 41,
                    gloves: 28,
                    boots: 28,
                    derived: ['gloves', 'boots'],
                    bonus: {defenceMul: 1.05, maxHpMul: 1.06}
                },
                {set: 'Chain', body: 120, greaves: 75, helmet: 47, gloves: 32, boots: 32, derived: ['gloves', 'boots'], bonus: {maxHpMul: 1.05}},
                {set: 'Avadon', body: 157, greaves: 98, helmet: 62, gloves: 41, boots: 41, bonus: {maxHpMul: 1.05, block: 4}},
                {set: 'Dark Crystal', body: 171, greaves: 107, helmet: 69, gloves: 46, boots: 46, bonus: {maxHpMul: 1.05, block: 4}},
                {set: 'Imperial Crusader', body: 205, greaves: 128, helmet: 83, gloves: 55, boots: 55, bonus: {defenceMul: 1.08, maxHpMul: 1.06}},
                {
                    set: 'Dynasty',
                    body: 226,
                    greaves: 141,
                    helmet: 92,
                    gloves: 61,
                    boots: 61,
                    derived: ['greaves', 'helmet', 'gloves', 'boots'],
                    bonus: {defenceMul: 1.05, attackMul: 1.05, maxHpMul: 1.06}
                },
                {
                    set: 'Vesper',
                    body: 250,
                    greaves: 156,
                    helmet: 101,
                    gloves: 68,
                    boots: 68,
                    derived: ['helmet', 'gloves', 'boots'],
                    bonus: {defenceMul: 1.0557, attackMul: 1.0557, maxHpMul: 1.06}
                }
            ],
            light: [
                {set: 'Wooden', fullBody: 76, helmet: 19, gloves: 13, boots: 13, derived: ['gloves', 'boots'], bonus: {defenceMul: 1.02}},
                {set: 'Manticore Skin', fullBody: 125, helmet: 41, gloves: 27, boots: 27, derived: ['helmet', 'gloves'], bonus: {maxMpMul: 1.05}},
                {
                    set: 'Drake Leather',
                    fullBody: 179,
                    helmet: 59,
                    gloves: 39,
                    boots: 39,
                    derived: ['helmet', 'gloves', 'boots'],
                    bonus: {defenceMul: 1.05}
                },
                {set: 'Avadon Leather', fullBody: 191, helmet: 62, gloves: 41, boots: 41, bonus: {defenceMul: 1.05}},
                {set: 'Tallum Leather', fullBody: 209, helmet: 69, gloves: 46, boots: 46, bonus: {maxMpMul: 1.06}},
                {set: 'Draconic Leather', fullBody: 249, helmet: 83, gloves: 55, boots: 55, bonus: {attackMul: 1.04, speed: 3, maxMpMul: 1.05}},
                {
                    set: 'Dynasty Leather',
                    fullBody: 275,
                    helmet: 92,
                    gloves: 61,
                    boots: 61,
                    derived: ['fullBody', 'helmet', 'gloves', 'boots'],
                    bonus: {attackMul: 1.045, speed: 4, maxMpMul: 1.05}
                },
                {
                    set: 'Vesper Leather',
                    fullBody: 303,
                    helmet: 101,
                    gloves: 68,
                    boots: 68,
                    derived: ['fullBody', 'helmet', 'gloves', 'boots'],
                    bonus: {attackMul: 1.0557, speed: 5, maxMpMul: 1.05}
                }
            ],
            robe: [
                {set: 'Devotion', fullBody: 49, helmet: 23, gloves: 13, boots: 13, derived: ['gloves', 'boots'], bonus: {speed: 2}},
                {set: 'Elven Mithril', fullBody: 84, helmet: 28, gloves: 27, boots: 22, derived: ['helmet', 'boots'], bonus: {speed: 2}},
                {
                    set: 'Karmian',
                    fullBody: 97,
                    helmet: 32,
                    gloves: 32,
                    boots: 26,
                    derived: ['helmet', 'boots'],
                    bonus: {defenceMul: 1.05, speed: 3}
                },
                {set: 'Avadon Magic', fullBody: 127, helmet: 62, gloves: 41, boots: 41, bonus: {defenceMul: 1.05, speed: 3}},
                {set: 'Majestic Magic', fullBody: 147, helmet: 73, gloves: 49, boots: 49, bonus: {maxMpMul: 1.06, speed: 3}},
                {set: 'Major Arcana', fullBody: 166, helmet: 83, gloves: 55, boots: 55, bonus: {attackMul: 1.08, speed: 4}},
                {
                    set: 'Dynasty Magic',
                    fullBody: 183,
                    helmet: 92,
                    gloves: 61,
                    boots: 61,
                    derived: ['fullBody', 'helmet', 'gloves', 'boots'],
                    bonus: {attackMul: 1.07, speed: 4}
                },
                {
                    set: 'Vesper Magic',
                    fullBody: 203,
                    helmet: 101,
                    gloves: 68,
                    boots: 68,
                    derived: ['fullBody', 'helmet', 'gloves', 'boots'],
                    bonus: {attackMul: 1.0557, maxMpMul: 1.05, speed: 5}
                }
            ]
        },
        shields: {
            big: [
                ['Bone Shield', 90],
                ['Square Shield', 154],
                ['Full Plate Shield', 203],
                ['Dark Dragon Shield', 230],
                ['Shield of Nightmare', 256],
                ['Imperial Crusader Shield', 290],
                ['Dynasty Shield', 321],
                ['Vesper Shield', 371]
            ],
            small: [
                ['Buckler', 72],
                ['Plate Shield', 123],
                ['Tower Shield', 152],
                ['Masterpiece Shield', 184],
                ['Shield of Nightmare II', 205],
                ['Imperial Guard Shield', 232],
                ['Dynasty Guard Shield', 257],
                ['Vesper Guard Shield', 297]
            ],
            sigil: [
                ['Apprentice Sigil', 4],
                ['Mithril Sigil', 6],
                ['Mystic Sigil', 8],
                ['Sage Sigil', 10],
                ['Majestic Sigil', 11],
                ['Arcana Sigil', 13],
                ['Dynasty Sigil', 15],
                ['Vesper Sigil', 17]
            ]
        },
        jewelry: {
            ring: [
                ['Blue Coral Ring', 14],
                ['Mithril Ring', 24],
                ['Blessed Ring', 32],
                ['Sage\'s Ring', 36],
                ['Majestic Ring', 42],
                ['Tateossian Ring', 48],
                ['Dynasty Ring', 60],
                ['Vesper Ring', 62]
            ],
            earring: [
                ['Coral Earring', 21],
                ['Omen Beast\'s Eye Earring', 36],
                ['Nassen\'s Earring', 48],
                ['Sage\'s Earring', 54],
                ['Majestic Earring', 63],
                ['Tateossian Earring', 71],
                ['Dynasty Earring', 79],
                ['Vesper Earring', 94]
            ],
            necklace: [
                ['Magic Necklace', 28],
                ['Elven Necklace', 45],
                ['Necklace of Binding', 64],
                ['Sage\'s Necklace', 72],
                ['Majestic Necklace', 85],
                ['Tateossian Necklace', 95],
                ['Dynasty Necklace', 106],
                ['Vesper Necklace', 125]
            ]
        },
        // Epic jewellery: dropped only by the epic raid bosses (template/bossTemplate.js). Real names, grades and
        // M.Def; the extra `bonus` stats are game balance, not the real Lineage 2 effects.
        epic: [
            {id: 'queenAnt', name: 'Ring of Queen Ant', boss: 'queenAnt', kind: 'ring', grade: 'B', mDef: 48, bonus: {maxHpMul: 1.03}},
            {id: 'core', name: 'Ring of Core', boss: 'core', kind: 'ring', grade: 'A', mDef: 48, bonus: {attackMul: 1.02, maxHpMul: 1.02}},
            {id: 'orfen', name: 'Earring of Orfen', boss: 'orfen', kind: 'earring', grade: 'A', mDef: 71, bonus: {speed: 3, mpRestoreSpeed: 0.05}},
            {id: 'zaken', name: "Zaken's Earring", boss: 'zaken', kind: 'earring', grade: 'S', mDef: 71, bonus: {accuracy: 4, criticalChance: 2}},
            {id: 'baium', name: 'Ring of Baium', boss: 'baium', kind: 'ring', grade: 'S', mDef: 48, bonus: {maxHpMul: 1.04, hpRestoreSpeed: 0.1}},
            {id: 'antharas', name: 'Earring of Antharas', boss: 'antharas', kind: 'earring', grade: 'S', mDef: 71, bonus: {maxHpMul: 1.03, defenceMul: 1.02}},
            {id: 'valakas', name: 'Necklace of Valakas', boss: 'valakas', kind: 'necklace', grade: 'S', mDef: 95, bonus: {attackMul: 1.04, maxHpMul: 1.03}},
            {id: 'frintezza', name: "Frintezza's Necklace", boss: 'frintezza', kind: 'necklace', grade: 'S', mDef: 95, bonus: {attackMul: 1.03, maxMpMul: 1.06, speed: 2}}
        ],
        bodyReference: 9
    }
};
