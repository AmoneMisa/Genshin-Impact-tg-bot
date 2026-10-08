// Raid bosses. Besides the classic `stats` (kept for levelling and the legacy
// bot) every boss now describes how it *fights*:
//
//   tier / weight      - difficulty rank (1-3) and how often it is picked
//   combat.hpMul       - health multiplier. Chosen so hpMul x defence is about the
//                        same inside a tier (test/boss-balance.test.js), otherwise
//                        a low-defence boss is simply a punching bag
//   combat.dangerPct   - one normal hit, as % of the target's max hp (before
//                        defence, attack power and boss level); the live damage model
//   combat.armored     - damage the boss ignores while its (non-required) minions live
//   combat.ultimateEvery - every N casts it charges its ultimate for one cycle
//   minions[]          - add definitions: hpPct of the boss's hp, power (damage x),
//                        required (boss cannot die while it lives - twins, heads),
//                        kind minion|partner|head, sp/drops for whoever kills it,
//                        onDeath {enrage, heal, say} for what the boss does when it falls
//   initial[]          - minion keys present from the first second
//   phases[]           - at: hp share to trigger below; summon / enrage (+damage) /
//                        heal (share of max hp) / say
//   drops              - per fighter: sp [min,max] and material rolls
//   lootMod            - gold / crystals / experience multipliers of the loot table
//   art                - which painting stands in until the boss has its own
//
// Edit the numbers here (or in Mongo, `game_templates.bosses`) to retune a fight.

const dropsFor = (name, tier, sp) => ({
    sp,
    items: [
        {item: "skill_scroll", chance: [0.45, 0.55, 0.65][tier - 1], min: 1, max: tier + 1},
        ...(tier >= 2 ? [{item: "ancient_seal", chance: tier === 2 ? 0.22 : 0.35, min: 1, max: tier - 1}] : []),
        {item: `essence_${name}`, chance: [0.07, 0.09, 0.12][tier - 1], min: 1, max: 1}
    ]
});

// ---- Epic raid bosses (Lineage 2) -------------------------------------------------------------
// Never picked by a normal summon (`epic` bosses are skipped by getRandomBoss.js): a chat challenges one
// of them on purpose, and after a kill it is gone for a respawn window like the real epic raids:
//   epic.respawnHours / windowHours  fixed wait after the kill plus a random tail (1x..2x window)
//   epic.minLevel                    the challenger's level
//   epic.jewelChance                 chance per kill that its epic jewellery drops (to a fighter, weighted by damage)
// Window lengths follow the retail-like values (Queen Ant / Core / Orfen about a day and a half, Zaken and
// Frintezza two days, Baium five, Antharas eight, Valakas eleven); Lineage 2 servers differ, tune them here.
const epicDrops = (name, sp) => ({
    sp,
    items: [
        {item: "skill_scroll", chance: 0.9, min: 3, max: 5},
        {item: "ancient_seal", chance: 0.7, min: 2, max: 4},
        {item: `essence_${name}`, chance: 0.4, min: 1, max: 2}
    ]
});

const unit = (key, name, icon, extra = {}) => ({
    key, name, icon, kind: "minion", hpPct: 0.05, power: 0.55, defMul: 0.7, sp: [5, 10], description: "", ...extra
});

const epicBoss = spec => ({
    name: spec.name,
    nameCall: spec.nameCall,
    title: spec.title,
    element: spec.element,
    tier: 3,
    weight: 0,
    epic: {respawnHours: spec.respawn[0], windowHours: spec.respawn[1], minLevel: spec.minLevel, jewelChance: spec.jewelChance},
    art: spec.art,
    description: spec.description,
    listOfDamage: [],
    availableSkills: ["reflect", "hp_regen", "life"],
    stats: {
        attack: spec.attack, defence: spec.defence, minDamage: spec.damage[0], maxDamage: spec.damage[1],
        criticalChance: spec.crit[0], criticalDamage: spec.crit[1], lvl: 1, currentSummons: 0, needSummons: 3
    },
    combat: {hpMul: spec.hpMul, dangerPct: spec.dangerPct, armored: spec.armored, ultimateEvery: spec.ultimateEvery},
    minions: spec.minions,
    initial: spec.initial || [],
    phases: spec.phases,
    drops: epicDrops(spec.name, spec.sp),
    lootMod: {gold: spec.loot[0], crystals: spec.loot[1], experience: spec.loot[2]},
    skill: {}
});

const epicBosses = [
    epicBoss({
        name: "queenAnt", nameCall: "Королеву Муравьёв", title: "Матка гигантского муравейника", element: "earth", art: "terrax",
        description: "Огромная матка, вокруг которой ни на минуту не стихает копошение свиты. Бей быстро, пока гвардия не сомкнула ряды.",
        respawn: [36, 6], minLevel: 52, jewelChance: 0.6,
        attack: 24, defence: 22, damage: [400, 540], crit: [45, 1.9], hpMul: 2.8, dangerPct: 4.2, armored: 0.3, ultimateEvery: 5,
        minions: [unit("soldier_ant", "Муравей-солдат", "🐜", {description: "Рядовой воин муравейника."}), unit("royal_guard", "Королевский страж", "🛡️", {hpPct: 0.08, power: 0.8, sp: [6, 12], description: "Элитная охрана матки."})],
        initial: ["soldier_ant"],
        phases: [
            {at: 0.75, icon: "🐜", say: "Королева зовёт солдат — муравейник хлынул наружу!", summon: ["soldier_ant", "soldier_ant"]},
            {at: 0.45, icon: "🛡️", say: "Королевская гвардия смыкает щиты!", summon: ["royal_guard", "soldier_ant"]},
            {at: 0.2, icon: "💢", say: "Матка в бешенстве защищает кладку!", summon: ["royal_guard"], enrage: 0.3}
        ],
        sp: [30, 55], loot: [1.2, 1.2, 3.2]
    }),
    epicBoss({
        name: "core", nameCall: "Кора", title: "Хозяин пещер раскалённых недр", element: "fire", art: "fjorina",
        description: "Каменный исполин из огненных недр. Его удары сотрясают пещеру, а вспышки жара обжигают всю группу.",
        respawn: [36, 6], minLevel: 61, jewelChance: 0.6,
        attack: 26, defence: 24, damage: [420, 570], crit: [45, 1.9], hpMul: 3.2, dangerPct: 4.4, armored: 0.3, ultimateEvery: 5,
        minions: [unit("magma_imp", "Магмовый бес", "🔥", {description: "Сгусток жара, рождённый недрами."}), unit("cave_guard", "Страж пещеры", "🪨", {hpPct: 0.08, power: 0.8, sp: [6, 12], description: "Каменный воин Кора."})],
        phases: [
            {at: 0.7, icon: "🔥", say: "Из трещин вырываются магмовые бесы!", summon: ["magma_imp", "magma_imp"]},
            {at: 0.4, icon: "🪨", say: "Кор будит стражей пещеры!", summon: ["cave_guard", "magma_imp"]},
            {at: 0.15, icon: "🌋", say: "Недра рвутся наружу — Кор не знает пощады!", enrage: 0.35}
        ],
        sp: [34, 60], loot: [1.25, 1.25, 3.4]
    }),
    epicBoss({
        name: "orfen", nameCall: "Орфен", title: "Ведьма ветров и тьмы", element: "wind", art: "avrora",
        description: "Крылатая ведьма, что играет с добычей: то кружит над полем боя, то обрушивается на самого опасного бойца.",
        respawn: [36, 12], minLevel: 61, jewelChance: 0.6,
        attack: 26, defence: 22, damage: [430, 580], crit: [50, 1.95], hpMul: 3.0, dangerPct: 4.6, armored: 0.25, ultimateEvery: 4,
        minions: [unit("harpy", "Гарпия", "🦅", {power: 0.6, description: "Крылатая слуга ведьмы."}), unit("shadow_servant", "Теневая прислужница", "👤", {hpPct: 0.07, power: 0.8, sp: [6, 12], description: "Тень Орфен, бьёт без жалости."})],
        phases: [
            {at: 0.75, icon: "🦅", say: "Орфен взмывает в воздух и зовёт гарпий!", summon: ["harpy", "harpy"]},
            {at: 0.5, icon: "👤", say: "Тени отделяются от земли!", summon: ["shadow_servant", "harpy"]},
            {at: 0.25, icon: "🌪", say: "Ведьма срывается в бешеный вихрь!", enrage: 0.3, summon: ["shadow_servant"]}
        ],
        sp: [36, 62], loot: [1.25, 1.3, 3.4]
    }),
    epicBoss({
        name: "zaken", nameCall: "Закена", title: "Призрачный пират", element: "dark", art: "fjorina",
        description: "Капитан проклятого корабля. Он исчезает во тьме и бьёт из теней, а его команда не знает усталости.",
        respawn: [48, 12], minLevel: 76, jewelChance: 0.5,
        attack: 30, defence: 26, damage: [470, 640], crit: [55, 2.0], hpMul: 4.2, dangerPct: 4.9, armored: 0.35, ultimateEvery: 5,
        minions: [unit("ghost_pirate", "Призрачный пират", "🏴‍☠️", {hpPct: 0.06, power: 0.7, description: "Матрос с проклятого корабля."}), unit("zaken_captain", "Капитан стражи", "⚔️", {hpPct: 0.09, power: 0.95, sp: [8, 14], description: "Правая рука Закена."})],
        phases: [
            {at: 0.8, icon: "🏴‍☠️", say: "Закен зовёт команду на палубу!", summon: ["ghost_pirate", "ghost_pirate"]},
            {at: 0.5, icon: "🌑", say: "Корабль тонет во тьме — капитаны выходят из теней!", summon: ["zaken_captain", "ghost_pirate"]},
            {at: 0.2, icon: "☠️", say: "Закен срывает проклятье со всех!", summon: ["zaken_captain"], enrage: 0.4}
        ],
        sp: [45, 75], loot: [1.4, 1.4, 4]
    }),
    epicBoss({
        name: "baium", nameCall: "Баюма", title: "Спящий демон кристального склепа", element: "earth", art: "carnevorusIsse",
        description: "Демон, которого будят, чтобы он больше не спал. Его ангелы-стражи защищают тело, пока Баюм наносит удары из кристального трона.",
        respawn: [120, 8], minLevel: 76, jewelChance: 0.5,
        attack: 32, defence: 28, damage: [490, 670], crit: [55, 2.0], hpMul: 5.0, dangerPct: 5.2, armored: 0.4, ultimateEvery: 4,
        minions: [unit("angel_statue", "Ангел-страж", "👼", {hpPct: 0.08, power: 0.8, sp: [7, 13], description: "Каменный ангел у трона."}), unit("crystal_spawn", "Кристальный выводок", "💎", {hpPct: 0.05, power: 0.6, description: "Осколки пробуждённого склепа."})],
        phases: [
            {at: 0.75, icon: "👼", say: "Баюм просыпается — оживают ангелы-стражи!", summon: ["angel_statue", "angel_statue"]},
            {at: 0.5, icon: "💎", say: "Кристаллы склепа раскалываются, выпуская выводок!", summon: ["crystal_spawn", "crystal_spawn", "angel_statue"]},
            {at: 0.2, icon: "😈", say: "Баюм ревёт: сон окончен навсегда!", enrage: 0.45}
        ],
        sp: [55, 90], loot: [1.5, 1.5, 4.4]
    }),
    epicBoss({
        name: "frintezza", nameCall: "Фринтеззу", title: "Тёмный маэстро заброшенного замка", element: "dark", art: "avrora",
        description: "Лич-кукловод, что дирижирует боем. Пока играет его музыка, свита не знает пощады; заглуши мелодию, и она ослабнет.",
        respawn: [48, 12], minLevel: 80, jewelChance: 0.5,
        attack: 34, defence: 28, damage: [510, 690], crit: [55, 2.05], hpMul: 5.0, dangerPct: 5.2, armored: 0.4, ultimateEvery: 4,
        minions: [unit("undead_musician", "Мёртвый музыкант", "🎻", {hpPct: 0.06, power: 0.7, description: "Играет мелодию маэстро."}), unit("dark_choir", "Тёмный хор", "👻", {hpPct: 0.08, power: 0.9, sp: [8, 14], description: "Призраки, поющие по воле Фринтеззы."})],
        phases: [
            {at: 0.8, icon: "🎻", say: "Звучит первая мелодия — оживают музыканты!", summon: ["undead_musician", "undead_musician"]},
            {at: 0.5, icon: "👻", say: "Хор тёмных душ вступает в песню!", summon: ["dark_choir", "undead_musician"]},
            {at: 0.2, icon: "🎼", say: "Финальный аккорд: замок сотрясается!", summon: ["dark_choir", "dark_choir"], enrage: 0.45}
        ],
        sp: [60, 95], loot: [1.5, 1.5, 4.5]
    }),
    epicBoss({
        name: "antharas", nameCall: "Антараса", title: "Земной дракон", element: "earth", art: "kivaha",
        description: "Старейший из драконов земли. Его хвост крушит ряды, а дыхание накрывает всю группу — не расходуй силы зря.",
        respawn: [192, 24], minLevel: 78, jewelChance: 0.5,
        attack: 38, defence: 32, damage: [540, 740], crit: [60, 2.1], hpMul: 6.4, dangerPct: 5.6, armored: 0.4, ultimateEvery: 4,
        minions: [unit("behemoth_dragon", "Дракон-бегемот", "🐲", {hpPct: 0.09, power: 0.9, sp: [9, 16], description: "Детёныш земного дракона."}), unit("bomber", "Подрывник", "💣", {hpPct: 0.05, power: 1, defMul: 0.5, sp: [6, 11], description: "Рвётся рядом с бойцами."})],
        phases: [
            {at: 0.8, icon: "🐲", say: "Антарас зовёт драконов-бегемотов!", summon: ["behemoth_dragon", "behemoth_dragon"]},
            {at: 0.55, icon: "💣", say: "Пещеру заполняют подрывники!", summon: ["bomber", "bomber", "behemoth_dragon"]},
            {at: 0.25, icon: "🌋", say: "Антарас рвёт землю — это его последняя ярость!", summon: ["bomber", "bomber"], enrage: 0.5}
        ],
        sp: [70, 110], loot: [1.6, 1.6, 5]
    }),
    epicBoss({
        name: "valakas", nameCall: "Валакаса", title: "Огненный дракон вулкана", element: "fire", art: "fjorina",
        description: "Древний дракон огня и лавы. Его вздох плавит доспехи, а ярость нарастает с каждым ранением.",
        respawn: [264, 24], minLevel: 80, jewelChance: 0.5,
        attack: 40, defence: 34, damage: [560, 780], crit: [60, 2.15], hpMul: 7.2, dangerPct: 6, armored: 0.45, ultimateEvery: 4,
        minions: [unit("lava_drake", "Лавовый дракончик", "🐉", {hpPct: 0.08, power: 0.9, sp: [10, 18], description: "Дитя вулкана."}), unit("fire_elemental", "Огненный элементаль", "🔥", {hpPct: 0.05, power: 0.7, description: "Живой огонь из жерла."})],
        phases: [
            {at: 0.8, icon: "🐉", say: "Валакас дышит — лава рождает драконят!", summon: ["lava_drake", "lava_drake"]},
            {at: 0.55, icon: "🔥", say: "Жерло вулкана извергает элементалей!", summon: ["fire_elemental", "fire_elemental", "lava_drake"]},
            {at: 0.3, icon: "🌋", say: "Вулкан просыпается целиком!", summon: ["lava_drake"], enrage: 0.4},
            {at: 0.1, icon: "☄️", say: "Валакас сжигает всё вокруг — последний натиск!", enrage: 0.5}
        ],
        sp: [80, 120], loot: [1.7, 1.7, 5.4]
    })
];

export default [{
    name: "kivaha",
    nameCall: "Киваху",
    title: "Громовая черепаха",
    element: "lightning",
    tier: 1,
    weight: 1,
    art: "kivaha",
    description: "Огромная черепаха-монстр, которая управляет стихией молнии.",
    listOfDamage: [],
    availableSkills: ["reflect"],
    stats: {
        attack: 10,
        defence: 15,
        minDamage: 250,
        maxDamage: 320,
        criticalChance: 35,
        criticalDamage: 1.25,
        lvl: 1,
        currentSummons: 0,
        needSummons: 3
    },
    combat: {hpMul: 0.87, dangerPct: 3, armored: 0, ultimateEvery: 6},
    minions: [{
        key: "spark", name: "Грозовая искра", icon: "⚡", kind: "minion", hpPct: 0.07, power: 0.45, defMul: 0.6, sp: [2, 4],
        description: "Шаровая молния, вылетевшая из панциря."
    }],
    initial: [],
    phases: [
        {at: 0.66, icon: "⚡", say: "Киваху вызывает грозовых духов!", summon: ["spark", "spark"]},
        {at: 0.25, icon: "🔥", say: "Панцирь Киваху раскалился докрасна!", enrage: 0.2}
    ],
    drops: dropsFor("kivaha", 1, [8, 15]),
    lootMod: {gold: 1.03, crystals: 1.04, experience: 1.1},
    skill: {}
}, {
    name: "avrora",
    nameCall: "Аврору",
    title: "Падшая фея воды",
    element: "water",
    tier: 1,
    weight: 1,
    art: "avrora",
    description: "Невероятно красивая Фея воды, которую захватила порча. Она может как соблазнить, так и безжалостно убить любого на своём пути.",
    listOfDamage: [],
    availableSkills: ["reflect", "life"],
    stats: {
        attack: 20,
        defence: 4,
        minDamage: 350,
        maxDamage: 420,
        criticalChance: 55,
        criticalDamage: 1.55,
        lvl: 1,
        currentSummons: 0,
        needSummons: 4
    },
    combat: {hpMul: 3.25, dangerPct: 3.1, armored: 0.25, ultimateEvery: 6},
    minions: [{
        key: "droplet", name: "Капля порчи", icon: "💧", kind: "minion", hpPct: 0.06, power: 0.5, defMul: 0.8, sp: [2, 4],
        description: "Сгусток чёрной воды. Пока они живы, Аврора защищена."
    }],
    initial: ["droplet", "droplet"],
    phases: [
        {at: 0.5, icon: "🌊", say: "Порча берёт верх над Авророй!", enrage: 0.2, summon: ["droplet"]}
    ],
    drops: dropsFor("avrora", 1, [8, 15]),
    lootMod: {gold: 1.035, crystals: 1.07, experience: 1.5},
    skill: {}
}, {
    name: "fjorina",
    nameCall: "Фйорину",
    title: "Огненная нага",
    element: "fire",
    tier: 1,
    weight: 1,
    art: "fjorina",
    description: "Полу-девушка, полу-змея, которая управляет стихией огня и яда. В руке длинное копьё с огненным алмазным наконечником",
    listOfDamage: [],
    availableSkills: ["reflect", "rage"],
    stats: {
        attack: 16,
        defence: 10,
        minDamage: 280,
        maxDamage: 330,
        criticalChance: 75,
        criticalDamage: 1.95,
        lvl: 1,
        currentSummons: 0,
        needSummons: 2
    },
    combat: {hpMul: 1.3, dangerPct: 3.2, armored: 0, ultimateEvery: 5},
    minions: [{
        key: "serpent", name: "Огненная змейка", icon: "🐍", kind: "minion", hpPct: 0.06, power: 0.5, defMul: 0.7, sp: [2, 4],
        description: "Выползает из пламени и жалит группу."
    }],
    initial: [],
    phases: [
        {at: 0.75, icon: "🐍", say: "Огненные змейки выползают из пламени!", summon: ["serpent", "serpent"]},
        {at: 0.4, icon: "🔥", say: "Ярость Фйорины! Копьё пылает ярче.", enrage: 0.25}
    ],
    drops: dropsFor("fjorina", 1, [8, 15]),
    lootMod: {gold: 1.021, crystals: 1.03, experience: 1.67},
    skill: {}
}, {
    name: "radjahal",
    nameCall: "Раджахала",
    title: "Ледяной орангутан",
    element: "ice",
    tier: 1,
    weight: 1,
    art: "radjahal",
    description: "Опасный и злобный орангутанг, который управляет стихией льда",
    listOfDamage: [],
    availableSkills: ["reflect", "hp_regen"],
    stats: {
        attack: 12,
        defence: 12,
        minDamage: 250,
        maxDamage: 280,
        criticalChance: 45,
        criticalDamage: 1.45,
        lvl: 1,
        currentSummons: 0,
        needSummons: 3
    },
    combat: {hpMul: 1.08, dangerPct: 3, armored: 0.3, ultimateEvery: 6},
    minions: [{
        key: "frost_ape", name: "Ледяной детёныш", icon: "🦍", kind: "minion", hpPct: 0.07, power: 0.5, defMul: 0.9, sp: [2, 4],
        description: "Свита вожака. Пока они рядом, Раджахала почти неуязвим."
    }],
    initial: ["frost_ape", "frost_ape"],
    phases: [
        {at: 0.5, icon: "❄️", say: "Раджахал бьёт себя в грудь — лёд вокруг трескается!", enrage: 0.2}
    ],
    drops: dropsFor("radjahal", 1, [8, 15]),
    lootMod: {gold: 1.0155, crystals: 1.1, experience: 1.3},
    skill: {}
}, {
    name: "carnevorusIsse",
    nameCall: "Карневорус Иссе",
    title: "Цветок света и тьмы",
    element: "light",
    tier: 1,
    weight: 1,
    art: "carnevorusIsse",
    description: "Огромный цветок, похожий на хризантему, наделенный элементами света и тьмы, что придает ему особое свечение, особенно опасное, имеет длинную виноградную лозу, которая обвивает неосторожных путников.",
    listOfDamage: [],
    availableSkills: ["reflect", "resistance", "hp_regen"],
    stats: {
        attack: 8,
        defence: 25,
        minDamage: 350,
        maxDamage: 620,
        criticalChance: 15,
        criticalDamage: 2.25,
        lvl: 1,
        currentSummons: 0,
        needSummons: 3
    },
    combat: {hpMul: 0.52, dangerPct: 3, armored: 0, ultimateEvery: 6},
    minions: [{
        key: "sprout", name: "Хищный побег", icon: "🌱", kind: "minion", hpPct: 0.05, power: 0.45, defMul: 0.6, sp: [2, 4],
        description: "Побег с жадным бутоном."
    }],
    initial: [],
    phases: [
        {at: 0.7, icon: "🌱", say: "Из земли рвутся хищные побеги!", summon: ["sprout", "sprout", "sprout"]},
        {at: 0.35, icon: "🌸", say: "Цветок раскрывается, залечивая раны.", summon: ["sprout", "sprout"], heal: 0.05}
    ],
    drops: dropsFor("carnevorusIsse", 1, [8, 15]),
    lootMod: {gold: 1.044, crystals: 1.06, experience: 2},
    skill: {}
}, {
    name: "zephyrion",
    nameCall: "Зефириона",
    title: "Штормовой дракон",
    element: "wind",
    tier: 2,
    weight: 0.85,
    art: "avrora",
    description: "Древний дракон бурь. Он держится в воздухе, и каждый взмах крыльев поднимает вихри, которые не щадят никого.",
    listOfDamage: [],
    availableSkills: ["reflect", "hp_regen"],
    stats: {
        attack: 18,
        defence: 14,
        minDamage: 300,
        maxDamage: 380,
        criticalChance: 50,
        criticalDamage: 1.6,
        lvl: 1,
        currentSummons: 0,
        needSummons: 3
    },
    combat: {hpMul: 1.4, dangerPct: 3.4, armored: 0, ultimateEvery: 5},
    minions: [{
        key: "gale", name: "Штормовой вихрь", icon: "🌀", kind: "minion", hpPct: 0.06, power: 0.55, defMul: 0.7, sp: [3, 6],
        description: "Живой смерч, режущий воздухом."
    }],
    initial: [],
    phases: [
        {at: 0.7, icon: "🌀", say: "Зефирион раскручивает бурю — вокруг рождаются вихри!", summon: ["gale", "gale"]},
        {at: 0.4, icon: "🌪️", say: "Небо темнеет. Зефирион бьёт крыльями всё чаще.", summon: ["gale", "gale"], enrage: 0.15},
        {at: 0.2, icon: "⚡", say: "Око бури раскрылось!", enrage: 0.25}
    ],
    drops: dropsFor("zephyrion", 2, [15, 28]),
    lootMod: {gold: 1.05, crystals: 1.08, experience: 2.2},
    skill: {}
}, {
    name: "terrax",
    nameCall: "Терракса",
    title: "Гранитный голем",
    element: "earth",
    tier: 2,
    weight: 0.85,
    art: "carnevorusIsse",
    description: "Голем из древнего гранита, оживлённый забытой магией. Каменные осколки вокруг него принимают на себя половину ударов.",
    listOfDamage: [],
    availableSkills: ["reflect", "resistance"],
    stats: {
        attack: 14,
        defence: 38,
        minDamage: 320,
        maxDamage: 450,
        criticalChance: 20,
        criticalDamage: 1.8,
        lvl: 1,
        currentSummons: 0,
        needSummons: 3
    },
    combat: {hpMul: 0.51, dangerPct: 3.5, armored: 0.5, ultimateEvery: 6},
    minions: [{
        key: "shard", name: "Каменный осколок", icon: "🪨", kind: "minion", hpPct: 0.05, power: 0.5, defMul: 0.5, sp: [3, 6],
        description: "Парящий обломок скалы. Пока они целы, Терракс получает вдвое меньше урона."
    }],
    initial: ["shard", "shard", "shard"],
    phases: [
        {at: 0.5, icon: "🪨", say: "Скала трескается — из трещин вылетают новые осколки!", summon: ["shard", "shard"]},
        {at: 0.2, icon: "💢", say: "Терракс крошится, но бьёт вдвое яростнее!", enrage: 0.3}
    ],
    drops: dropsFor("terrax", 2, [15, 28]),
    lootMod: {gold: 1.055, crystals: 1.07, experience: 2.1},
    skill: {}
}, {
    name: "veraxis",
    nameCall: "Вераксиса",
    title: "Повелитель усыпальницы",
    element: "dark",
    tier: 3,
    weight: 0.6,
    art: "fjorina",
    description: "Лич, не нашедший покоя. Он поднимает павших слуг волнами, а его прикосновение несёт смерть тому, кто наносит больше всех урона.",
    listOfDamage: [],
    availableSkills: ["reflect", "hp_regen", "life"],
    stats: {
        attack: 22,
        defence: 20,
        minDamage: 380,
        maxDamage: 520,
        criticalChance: 45,
        criticalDamage: 1.9,
        lvl: 1,
        currentSummons: 0,
        needSummons: 2
    },
    combat: {hpMul: 1.43, dangerPct: 3.8, armored: 0.35, ultimateEvery: 5},
    minions: [{
        key: "skeleton", name: "Скелет-страж", icon: "💀", kind: "minion", hpPct: 0.05, power: 0.55, defMul: 0.7, sp: [4, 8],
        description: "Павший воин, поднятый волей лича."
    }, {
        key: "wraith", name: "Призрак усыпальницы", icon: "👻", kind: "minion", hpPct: 0.07, power: 0.75, defMul: 0.6, sp: [5, 9],
        description: "Дух, бьющий сильнее скелетов."
    }],
    initial: [],
    phases: [
        {at: 0.8, icon: "💀", say: "Вераксис поднимает первую волну мертвецов!", summon: ["skeleton", "skeleton"]},
        {at: 0.5, icon: "👻", say: "Из саркофагов вырываются призраки!", summon: ["skeleton", "skeleton", "wraith"]},
        {at: 0.2, icon: "☠️", say: "Вераксис отдаёт остатки сил — смерть близка!", summon: ["wraith", "wraith"], enrage: 0.3}
    ],
    drops: dropsFor("veraxis", 3, [25, 45]),
    lootMod: {gold: 1.07, crystals: 1.1, experience: 2.8},
    skill: {}
}, {
    name: "tiamara",
    nameCall: "Тиамару",
    title: "Трёхглавая гидра",
    element: "poison",
    tier: 3,
    weight: 0.6,
    art: "kivaha",
    description: "Гидра из болот, у которой две боковые головы живут своей жизнью. Пока обе дышат, тело невозможно добить.",
    listOfDamage: [],
    availableSkills: ["reflect", "hp_regen", "rage"],
    stats: {
        attack: 20,
        defence: 22,
        minDamage: 360,
        maxDamage: 490,
        criticalChance: 40,
        criticalDamage: 1.8,
        lvl: 1,
        currentSummons: 0,
        needSummons: 2
    },
    combat: {hpMul: 1.3, dangerPct: 3.7, armored: 0, ultimateEvery: 5},
    minions: [{
        key: "head_fire", name: "Огненная голова", icon: "🔥", kind: "head", required: true, hpPct: 0.22, power: 0.9, defMul: 0.8, sp: [8, 14],
        attackKey: "head_fire", description: "Левая голова дышит пламенем. Пока она жива, Тиамару не убить."
    }, {
        key: "head_venom", name: "Ядовитая голова", icon: "☠️", kind: "head", required: true, hpPct: 0.22, power: 0.9, defMul: 0.8, sp: [8, 14],
        attackKey: "head_venom", description: "Правая голова плюётся ядом. Пока она жива, Тиамару не убить."
    }, {
        key: "hatchling", name: "Змеёныш", icon: "🐍", kind: "minion", hpPct: 0.04, power: 0.5, defMul: 0.6, sp: [3, 6],
        description: "Детёныш гидры."
    }],
    initial: ["head_fire", "head_venom"],
    phases: [
        {at: 0.6, icon: "🐍", say: "Тиамара кладёт яйца — вылупляются змеёныши!", summon: ["hatchling", "hatchling"]},
        {at: 0.3, icon: "💢", say: "Гидра в ярости: обрубки голов дёргаются!", enrage: 0.25}
    ],
    drops: dropsFor("tiamara", 3, [25, 45]),
    lootMod: {gold: 1.065, crystals: 1.1, experience: 2.7},
    skill: {}
}, {
    name: "ignar",
    nameCall: "Игнара и Пиру",
    title: "Огненные близнецы",
    element: "fire",
    tier: 2,
    weight: 0.85,
    pair: true,
    art: "fjorina",
    description: "Брат и сестра, рождённые в лаве. Игнар бьёт кулаками, Пира танцует с клинками. Пока жива сестра, брата нельзя добить; а когда она падает, он приходит в ярость.",
    listOfDamage: [],
    availableSkills: ["reflect", "rage"],
    stats: {
        attack: 17,
        defence: 18,
        minDamage: 320,
        maxDamage: 400,
        criticalChance: 55,
        criticalDamage: 1.7,
        lvl: 1,
        currentSummons: 0,
        needSummons: 3
    },
    combat: {hpMul: 1.08, dangerPct: 3.4, armored: 0, ultimateEvery: 5},
    minions: [{
        key: "pira", name: "Пира", icon: "🔆", kind: "partner", required: true, hpPct: 0.8, power: 1, defMul: 0.9, sp: [10, 18],
        attackKey: "pira", description: "Сестра Игнара. Быстра и безжалостна.",
        drops: [{item: "essence_pira", chance: 0.3, min: 1, max: 1}],
        onDeath: {enrage: 0.35, say: "Игнар ревёт от горя — пламя вокруг него вспыхивает!"}
    }, {
        key: "ember", name: "Тлеющий уголёк", icon: "🔸", kind: "minion", hpPct: 0.04, power: 0.45, defMul: 0.6, sp: [2, 4],
        description: "Искра, вылетевшая из очага близнецов."
    }],
    initial: ["pira"],
    phases: [
        {at: 0.5, icon: "🔥", say: "Близнецы сливают пламя воедино!", summon: ["ember", "ember"], enrage: 0.1}
    ],
    drops: dropsFor("ignar", 2, [16, 30]),
    lootMod: {gold: 1.05, crystals: 1.08, experience: 2.2},
    skill: {}
}, {
    name: "selene",
    nameCall: "Селену и Умбру",
    title: "Сёстры лунного затмения",
    element: "light",
    tier: 3,
    weight: 0.6,
    pair: true,
    art: "avrora",
    description: "Две сестры — свет и тень одной луны. Селена не падёт, пока жива Умбра, а гибель сестры наполняет её лунной яростью и исцеляет.",
    listOfDamage: [],
    availableSkills: ["reflect", "life"],
    stats: {
        attack: 21,
        defence: 20,
        minDamage: 370,
        maxDamage: 480,
        criticalChance: 50,
        criticalDamage: 1.85,
        lvl: 1,
        currentSummons: 0,
        needSummons: 2
    },
    combat: {hpMul: 1.43, dangerPct: 3.7, armored: 0, ultimateEvery: 5},
    minions: [{
        key: "umbra", name: "Умбра", icon: "🌑", kind: "partner", required: true, hpPct: 0.85, power: 1, defMul: 0.9, sp: [14, 24],
        attackKey: "umbra", description: "Сестра-тень. Крадётся и бьёт по самым раненым.",
        drops: [{item: "essence_umbra", chance: 0.3, min: 1, max: 1}],
        onDeath: {enrage: 0.4, heal: 0.1, say: "Селена воет от горя: лунный свет вспыхивает и затягивает её раны!"}
    }, {
        key: "moon_wisp", name: "Лунный огонёк", icon: "✨", kind: "minion", hpPct: 0.04, power: 0.5, defMul: 0.6, sp: [3, 6],
        description: "Дух затмения."
    }],
    initial: ["umbra"],
    phases: [
        {at: 0.4, icon: "🌘", say: "Начинается лунное затмение!", summon: ["moon_wisp", "moon_wisp"], enrage: 0.15}
    ],
    drops: dropsFor("selene", 3, [26, 46]),
    lootMod: {gold: 1.07, crystals: 1.1, experience: 2.9},
    skill: {}
}, ...epicBosses];
