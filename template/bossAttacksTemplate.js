// Active attacks each boss casts on the raid while alive (on top of its
// passive skill from bossSkillsTemplate). `power` multiplies the boss's normal
// hit (see bossHit.js); `weight` is how often it is picked.
//
//   target   single - one fighter (usually the top damage dealer, or whoever taunts)
//            all    - every living fighter
//            multi  - `count` random fighters
//   ultimate  charged for one cast cycle (a warning shows in the log; stun the
//            boss to interrupt it), then fired - never picked as an ordinary cast
//   unlock    only available once the boss has passed that many phases
//
// Partners, heads and other minions look their attacks up by `attackKey`.
const bossAttacks = {
    kivaha: [
        { key: "lightning_strike", name: "Удар молнии", icon: "⚡", target: "single", power: 1.6, weight: 3, description: "Бьёт молнией самого опасного бойца." },
        { key: "thunder_shell", name: "Грозовой панцирь", icon: "🌩", target: "all", power: 0.7, weight: 2, description: "Разряд с панциря задевает всю группу." },
        { key: "chain_lightning", name: "Цепная молния", icon: "🔗", target: "multi", count: 2, power: 1.1, weight: 2, unlock: 1, description: "Молния перескакивает между двумя бойцами." },
        { key: "thunderclap", name: "Громовой раскат", icon: "💥", target: "all", power: 1.5, ultimate: true, description: "Оглушительный разряд по всем. Накапливается один ход." },
    ],
    avrora: [
        { key: "siren_kiss", name: "Поцелуй сирены", icon: "💋", target: "single", power: 1.5, weight: 3, description: "Зачарованный удар по одному бойцу." },
        { key: "tidal_wave", name: "Приливная волна", icon: "🌊", target: "all", power: 0.8, weight: 2, description: "Волна накрывает всех бойцов." },
        { key: "water_lances", name: "Водяные копья", icon: "🔱", target: "multi", count: 2, power: 1.1, weight: 2, unlock: 1, description: "Копья из воды пронзают двоих." },
        { key: "maelstrom", name: "Поглощающий водоворот", icon: "🌀", target: "all", power: 1.4, ultimate: true, description: "Водоворот затягивает всю группу." },
    ],
    fjorina: [
        { key: "flame_spear", name: "Огненное копьё", icon: "🔥", target: "single", power: 1.7, weight: 3, description: "Пронзает бойца раскалённым копьём." },
        { key: "venom_mist", name: "Ядовитый туман", icon: "☠", target: "all", power: 0.65, weight: 2, description: "Отравленный туман по всей группе." },
        { key: "serpent_lash", name: "Хвост-плеть", icon: "🐍", target: "multi", count: 2, power: 1.15, weight: 2, unlock: 1, description: "Хвост хлещет по двоим бойцам." },
        { key: "inferno", name: "Огненный шторм", icon: "🌋", target: "all", power: 1.5, ultimate: true, description: "Стена пламени накрывает всех." },
    ],
    radjahal: [
        { key: "ice_fist", name: "Ледяной кулак", icon: "🧊", target: "single", power: 1.5, weight: 3, description: "Сокрушительный удар по одному бойцу." },
        { key: "blizzard", name: "Буран", icon: "❄", target: "all", power: 0.75, weight: 2, description: "Ледяная буря по всей группе." },
        { key: "frost_stomp", name: "Ледяной топот", icon: "🦶", target: "multi", count: 2, power: 1.1, weight: 2, unlock: 1, description: "Топот раскалывает землю под двумя бойцами." },
        { key: "avalanche", name: "Лавина", icon: "🏔", target: "all", power: 1.5, ultimate: true, description: "Лавина сходит на всю группу." },
    ],
    carnevorusIsse: [
        { key: "strangling_vine", name: "Лоза-душитель", icon: "🌿", target: "single", power: 1.5, weight: 3, description: "Лоза обвивает и душит одного бойца." },
        { key: "twilight_flash", name: "Сумеречная вспышка", icon: "✴", target: "all", power: 0.8, weight: 2, description: "Вспышка света и тьмы по всей группе." },
        { key: "thorn_burst", name: "Шипы", icon: "🌵", target: "multi", count: 3, power: 0.9, weight: 2, unlock: 1, description: "Шипы летят в троих бойцов." },
        { key: "doom_bloom", name: "Цветение гибели", icon: "🌺", target: "all", power: 1.4, ultimate: true, description: "Бутон раскрывается смертоносным облаком." },
    ],
    zephyrion: [
        { key: "gale_claw", name: "Коготь бури", icon: "🦅", target: "single", power: 1.6, weight: 3, description: "Пикирует на самого опасного бойца." },
        { key: "cyclone", name: "Циклон", icon: "🌪", target: "all", power: 0.75, weight: 2, description: "Вихрь сбивает с ног всю группу." },
        { key: "wing_gust", name: "Взмах крыльев", icon: "🪽", target: "multi", count: 2, power: 1.15, weight: 2, unlock: 1, description: "Воздушные лезвия летят в двоих." },
        { key: "eye_of_storm", name: "Око бури", icon: "🌀", target: "all", power: 1.5, ultimate: true, description: "Шторм сосредотачивается над группой." },
    ],
    terrax: [
        { key: "boulder_slam", name: "Удар валуном", icon: "🪨", target: "single", power: 1.9, weight: 3, description: "Бьёт гранитным кулаком по одному бойцу." },
        { key: "tremor", name: "Землетрясение", icon: "💢", target: "all", power: 0.7, weight: 2, description: "Дрожь земли задевает всех." },
        { key: "shard_volley", name: "Град осколков", icon: "💎", target: "multi", count: 3, power: 0.95, weight: 2, unlock: 1, description: "Осколки летят в троих бойцов." },
        { key: "cave_in", name: "Обвал", icon: "⛰", target: "all", power: 1.8, ultimate: true, description: "Потолок рушится на всю группу." },
    ],
    veraxis: [
        { key: "soul_bolt", name: "Стрела душ", icon: "👁", target: "single", power: 1.6, weight: 3, description: "Вытягивает жизнь из одного бойца." },
        { key: "death_wave", name: "Волна смерти", icon: "☠", target: "all", power: 0.8, weight: 2, description: "Холод могилы окутывает группу." },
        { key: "bone_spears", name: "Костяные копья", icon: "🦴", target: "multi", count: 3, power: 1, weight: 2, unlock: 1, description: "Копья из костей бьют троих." },
        { key: "touch_of_death", name: "Прикосновение смерти", icon: "💀", target: "single", power: 3.2, ultimate: true, description: "Смертельный удар по лидеру урона. Заряжается один ход." },
    ],
    tiamara: [
        { key: "triple_bite", name: "Укус", icon: "🐲", target: "single", power: 1.7, weight: 3, description: "Челюсти смыкаются на одном бойце." },
        { key: "tail_sweep", name: "Взмах хвоста", icon: "🌀", target: "all", power: 0.7, weight: 2, description: "Хвост сметает всю группу." },
        { key: "poison_spit", name: "Ядовитый плевок", icon: "🧪", target: "multi", count: 2, power: 1.15, weight: 2, unlock: 1, description: "Плюёт ядом в двоих." },
        { key: "hydra_roar", name: "Рёв гидры", icon: "📣", target: "all", power: 1.6, ultimate: true, description: "Три глотки ревут разом." },
    ],
    ignar: [
        { key: "fire_fist", name: "Огненный кулак", icon: "👊", target: "single", power: 1.6, weight: 3, description: "Раскалённый кулак Игнара." },
        { key: "ember_rain", name: "Дождь углей", icon: "☄", target: "all", power: 0.7, weight: 2, description: "Угли падают на всю группу." },
        { key: "lava_geyser", name: "Лавовый гейзер", icon: "🌋", target: "multi", count: 2, power: 1.1, weight: 2, unlock: 1, description: "Лава бьёт из-под ног двоих." },
        { key: "flame_union", name: "Слияние пламени", icon: "🔥", target: "all", power: 1.6, ultimate: true, description: "Близнецы объединяют пламя. Накапливается один ход." },
    ],
    selene: [
        { key: "moonbeam", name: "Лунный луч", icon: "🌙", target: "single", power: 1.6, weight: 3, description: "Серебряный луч по одному бойцу." },
        { key: "silver_rain", name: "Серебряный дождь", icon: "✨", target: "all", power: 0.7, weight: 2, description: "Лунные иглы по всей группе." },
        { key: "crescent_blades", name: "Серпы луны", icon: "🌓", target: "multi", count: 3, power: 1, weight: 2, unlock: 1, description: "Серпы света разят троих." },
        { key: "eclipse", name: "Лунное затмение", icon: "🌘", target: "all", power: 1.6, ultimate: true, description: "Свет гаснет — удар по всей группе." },
    ],
    // --- partners, heads and other minions ---
    pira: [
        { key: "spark_dagger", name: "Искровой кинжал", icon: "🗡", target: "single", power: 1.3, weight: 3, description: "Быстрый удар по лидеру урона." },
        { key: "flame_dance", name: "Танец пламени", icon: "💃", target: "all", power: 0.55, weight: 2, description: "Кружится в огне, задевая всех." },
    ],
    umbra: [
        { key: "shadow_claw", name: "Теневой коготь", icon: "🌑", target: "single", power: 1.4, weight: 3, description: "Бьёт по самому раненому бойцу." },
        { key: "gloom", name: "Мрак", icon: "🌫", target: "all", power: 0.6, weight: 2, description: "Тьма окутывает группу." },
    ],
    head_fire: [
        { key: "fire_breath", name: "Огненное дыхание", icon: "🔥", target: "single", power: 1.2, weight: 1, description: "Пламя бьёт по одному бойцу." },
    ],
    head_venom: [
        { key: "venom_spit", name: "Ядовитый плевок", icon: "☠", target: "single", power: 1.2, weight: 1, description: "Яд разъедает одного бойца." },
    ],
};

// Epic raid bosses: a heavy single hit, a group hit, a multi-target hit that unlocks after the first phase,
// and a charged ultimate - each stronger than a normal boss's (see bossTemplate.js epic bosses).
const epicAttackSet = ([single, all, multi, ultimate]) => [
    { key: single[0], name: single[1], icon: single[2], target: "single", power: 1.8, weight: 3, description: single[3] },
    { key: all[0], name: all[1], icon: all[2], target: "all", power: 0.8, weight: 2, description: all[3] },
    { key: multi[0], name: multi[1], icon: multi[2], target: "multi", count: 3, power: 1.15, weight: 2, unlock: 1, description: multi[3] },
    { key: ultimate[0], name: ultimate[1], icon: ultimate[2], target: ultimate[4] || "all", power: ultimate[5] || 1.9, ultimate: true, description: ultimate[3] },
];

Object.assign(bossAttacks, {
    queenAnt: epicAttackSet([
        ["acid_sting", "Кислотное жало", "🦂", "Прожигает одного бойца едкой кислотой."],
        ["swarm_call", "Зов роя", "🐜", "Рой накрывает всю группу."],
        ["mandible_snap", "Хватка жвал", "🦷", "Жвалы смыкаются на троих бойцах."],
        ["royal_bile", "Королевская желчь", "☣", "Едкий поток по всей группе. Заряжается один ход."],
    ]),
    core: epicAttackSet([
        ["magma_fist", "Магмовый кулак", "🔥", "Раскалённый кулак по одному бойцу."],
        ["quake", "Подземный толчок", "💢", "Пещера дрожит под всей группой."],
        ["ember_shards", "Град углей", "☄", "Раскалённые угли бьют троих."],
        ["cave_collapse", "Обвал свода", "🪨", "Свод рушится на всю группу. Заряжается один ход."],
    ]),
    orfen: epicAttackSet([
        ["witch_talon", "Коготь ведьмы", "🦅", "Пикирует на самого опасного бойца."],
        ["gale_screech", "Визг бури", "🌪", "Ветер сбивает с ног всю группу."],
        ["feather_blades", "Перья-лезвия", "🪶", "Перья летят в троих бойцов."],
        ["black_wind", "Чёрный ветер", "🌑", "Тьма и вихрь по всей группе. Заряжается один ход."],
    ]),
    zaken: epicAttackSet([
        ["shadow_cutlass", "Теневая сабля", "🗡", "Бьёт из тьмы по лидеру урона."],
        ["ghost_broadside", "Призрачный залп", "💥", "Залп проклятого корабля по всей группе."],
        ["phantom_slash", "Призрачные клинки", "⚔", "Клинки рубят троих бойцов."],
        ["curse_of_the_deep", "Проклятие глубин", "☠", "Смертельный удар по лидеру урона. Заряжается один ход.", "single", 3.6],
    ]),
    baium: epicAttackSet([
        ["demon_claw", "Коготь демона", "😈", "Сокрушает одного бойца."],
        ["thunder_pulse", "Грозовой пульс", "⚡", "Разряд по всей группе."],
        ["crystal_lance", "Кристальные копья", "💎", "Копья пронзают троих."],
        ["awakening_roar", "Рёв пробуждения", "📣", "Рёв бьёт всю группу. Заряжается один ход."],
    ]),
    frintezza: epicAttackSet([
        ["bow_strike", "Удар смычком", "🎻", "Бьёт по одному бойцу."],
        ["dirge", "Скорбный напев", "🎼", "Мелодия ранит всю группу."],
        ["haunting_chords", "Призрачные аккорды", "👻", "Три цели получают удар аккордов."],
        ["final_movement", "Финальная часть", "🎶", "Оглушающая кульминация по всей группе. Заряжается один ход."],
    ]),
    antharas: epicAttackSet([
        ["tail_sweep", "Удар хвостом", "🐲", "Хвост сметает одного бойца."],
        ["earth_breath", "Дыхание земли", "🌋", "Дыхание накрывает всю группу."],
        ["rock_barrage", "Каменный шквал", "🪨", "Камни бьют троих."],
        ["dragon_roar", "Рёв дракона", "📣", "Оглушающий рёв по группе. Заряжается один ход."],
    ]),
    valakas: epicAttackSet([
        ["lava_claw", "Лавовый коготь", "🐉", "Раскалённый коготь по одному бойцу."],
        ["fire_breath_all", "Дыхание огня", "🔥", "Пламя по всей группе."],
        ["meteor_shards", "Метеоритные осколки", "☄", "Осколки бьют троих."],
        ["volcano_eruption", "Извержение вулкана", "🌋", "Извержение накрывает всю группу. Заряжается один ход.", "all", 2.2],
    ]),
});

const fallback = [
    { key: "crush", name: "Сокрушение", icon: "💥", target: "single", power: 1.4, weight: 3, description: "Мощный удар по одному бойцу." },
    { key: "roar", name: "Рёв", icon: "📣", target: "all", power: 0.7, weight: 2, description: "Оглушающий рёв по всей группе." },
];

const minionFallback = [
    { key: "minion_strike", name: "Удар", icon: "💢", target: "single", power: 1, weight: 1, description: "Простой удар свиты." },
];

export function getBossAttacks(bossName) {
    return bossAttacks[bossName] || fallback;
}

export function getMinionAttacks(attackKey) {
    return bossAttacks[attackKey] || minionFallback;
}

export default bossAttacks;
