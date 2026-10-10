// The real Lineage 2 (High Five) classes as the game's classes: a start class (a race's Fighter / Mystic, the Kamael
// soldiers), then the 1st (level 20), 2nd (level 40) and 3rd (level 76) profession of the real tree.
//
//   key      the name stored in a character (English name, camelCase)
//   ru       the name shown to the player
//   family   the combat line the class fights in: it picks the equipment owner, the base skill kit, the buff
//            list and the passives (warrior = tanks, berserk = melee strikers, rogue = daggers, archer = bows,
//            mage = damage casters, priest = healers and buffers)
//   like     the profession of the old tree whose stat shape (focus, crit, evasion ...) the class takes
//            (template/classTree.js ARCHETYPES), the numbers are then solved to the power of the tier
//   parent   the real parent class id
//   level    0 start class, 1 / 2 / 3 the profession
//
// The ids are the real High Five class ids (classList.xml).
const c = (key, ru, family, like, parent, level) => ({key, ru, family, like, parent, level});

export const START_CLASSES = Object.freeze([0, 10, 18, 25, 31, 38, 44, 49, 53, 123, 124]);

export const L2_CLASS_META = Object.freeze({
    // --- Human ---
    0: c('humanFighter', 'Боец-человек', 'warrior', null, null, 0),
    1: c('warriorProf', 'Воин', 'berserk', 'slayer', 0, 1),
    2: c('gladiator', 'Гладиатор', 'berserk', 'slayer', 1, 2),
    3: c('warlord', 'Полководец', 'berserk', 'ironclad', 1, 2),
    88: c('duelist', 'Дуэлянт', 'berserk', 'slayer', 2, 3),
    89: c('dreadnought', 'Дредноут', 'berserk', 'ironclad', 3, 3),
    4: c('humanKnight', 'Рыцарь-человек', 'warrior', 'crusader', 0, 1),
    5: c('paladin', 'Паладин', 'warrior', 'warden', 4, 2),
    6: c('darkAvenger', 'Рыцарь Тьмы', 'warrior', 'crusader', 4, 2),
    90: c('phoenixKnight', 'Рыцарь Феникса', 'warrior', 'warden', 5, 3),
    91: c('hellKnight', 'Рыцарь Ада', 'warrior', 'crusader', 6, 3),
    7: c('rogueProf', 'Разбойник', 'rogue', 'assassin', 0, 1),
    8: c('treasureHunter', 'Охотник за сокровищами', 'rogue', 'assassin', 7, 2),
    93: c('adventurer', 'Авантюрист', 'rogue', 'assassin', 8, 3),
    9: c('hawkeye', 'Ястребиный Глаз', 'archer', 'ranger', 7, 2),
    92: c('sagittarius', 'Стрелок', 'archer', 'ranger', 9, 3),
    10: c('humanMystic', 'Мистик-человек', 'mage', null, null, 0),
    11: c('humanWizard', 'Волшебник', 'mage', 'elementalist', 10, 1),
    12: c('sorcerer', 'Колдун', 'mage', 'elementalist', 11, 2),
    94: c('archmage', 'Верховный маг', 'mage', 'elementalist', 12, 3),
    13: c('necromancer', 'Некромант', 'mage', 'warlock', 11, 2),
    95: c('soultaker', 'Хранитель душ', 'mage', 'warlock', 13, 3),
    14: c('warlock', 'Чернокнижник', 'mage', 'warlock', 11, 2),
    96: c('arcanaLord', 'Повелитель арканы', 'mage', 'warlock', 14, 3),
    15: c('cleric', 'Клирик', 'priest', 'cleric', 10, 1),
    16: c('bishop', 'Епископ', 'priest', 'cleric', 15, 2),
    97: c('cardinal', 'Кардинал', 'priest', 'cleric', 16, 3),
    17: c('prophet', 'Пророк', 'priest', 'cleric', 15, 2),
    98: c('hierophant', 'Иерофант', 'priest', 'cleric', 17, 3),
    // --- Elf ---
    18: c('elvenFighter', 'Боец-эльф', 'warrior', null, null, 0),
    19: c('elvenKnight', 'Рыцарь-эльф', 'warrior', 'crusader', 18, 1),
    20: c('templeKnight', 'Храмовник', 'warrior', 'warden', 19, 2),
    99: c('evasTemplar', 'Страж Евы', 'warrior', 'warden', 20, 3),
    21: c('swordSinger', 'Певец Меча', 'warrior', 'crusader', 19, 2),
    100: c('swordMuse', 'Муза Меча', 'warrior', 'crusader', 21, 3),
    22: c('elvenScout', 'Разведчик', 'rogue', 'trickster', 18, 1),
    23: c('plainsWalker', 'Странник Равнин', 'rogue', 'trickster', 22, 2),
    101: c('windRider', 'Всадник Ветра', 'rogue', 'trickster', 23, 3),
    24: c('silverRanger', 'Серебряный Рейнджер', 'archer', 'sniper', 22, 2),
    102: c('moonlightSentinel', 'Страж Лунного Света', 'archer', 'sniper', 24, 3),
    25: c('elvenMystic', 'Мистик-эльф', 'mage', null, null, 0),
    26: c('elvenWizard', 'Волшебник-эльф', 'mage', 'elementalist', 25, 1),
    27: c('spellsinger', 'Заклинатель', 'mage', 'elementalist', 26, 2),
    103: c('mysticMuse', 'Муза Мистики', 'mage', 'elementalist', 27, 3),
    28: c('elementalSummoner', 'Призыватель Стихий', 'mage', 'warlock', 26, 2),
    104: c('elementalMaster', 'Мастер Стихий', 'mage', 'warlock', 28, 3),
    29: c('elvenOracle', 'Оракул-эльф', 'priest', 'cleric', 25, 1),
    30: c('elvenElder', 'Старейшина-эльф', 'priest', 'cleric', 29, 2),
    105: c('evasSaint', 'Святой Евы', 'priest', 'cleric', 30, 3),
    // --- Dark elf ---
    31: c('darkFighter', 'Боец тёмных эльфов', 'warrior', null, null, 0),
    32: c('palusKnight', 'Рыцарь Палуса', 'warrior', 'crusader', 31, 1),
    33: c('shillienKnight', 'Рыцарь Шилен', 'warrior', 'crusader', 32, 2),
    106: c('shillienTemplar', 'Храмовник Шилен', 'warrior', 'warden', 33, 3),
    34: c('bladedancer', 'Танцор Клинков', 'rogue', 'trickster', 32, 2),
    107: c('spectralDancer', 'Призрачный Танцор', 'rogue', 'trickster', 34, 3),
    35: c('assassin', 'Убийца', 'rogue', 'assassin', 31, 1),
    36: c('abyssWalker', 'Ходящий по Бездне', 'rogue', 'assassin', 35, 2),
    108: c('ghostHunter', 'Охотник за призраками', 'rogue', 'assassin', 36, 3),
    37: c('phantomRanger', 'Призрачный Рейнджер', 'archer', 'sniper', 35, 2),
    109: c('ghostSentinel', 'Страж Призраков', 'archer', 'sniper', 37, 3),
    38: c('darkMystic', 'Мистик тёмных эльфов', 'mage', null, null, 0),
    39: c('darkWizard', 'Тёмный волшебник', 'mage', 'elementalist', 38, 1),
    40: c('spellhowler', 'Заклинатель Ветров', 'mage', 'elementalist', 39, 2),
    110: c('stormScreamer', 'Крик Бури', 'mage', 'elementalist', 40, 3),
    41: c('phantomSummoner', 'Призрачный Призыватель', 'mage', 'warlock', 39, 2),
    111: c('spectralMaster', 'Призрачный Мастер', 'mage', 'warlock', 41, 3),
    42: c('shillienOracle', 'Оракул Шилен', 'priest', 'cleric', 38, 1),
    43: c('shillienElder', 'Старейшина Шилен', 'priest', 'cleric', 42, 2),
    112: c('shillienSaint', 'Святой Шилен', 'priest', 'cleric', 43, 3),
    // --- Orc ---
    44: c('orcFighter', 'Боец-орк', 'berserk', null, null, 0),
    45: c('orcRaider', 'Налётчик', 'berserk', 'slayer', 44, 1),
    46: c('destroyer', 'Разрушитель', 'berserk', 'slayer', 45, 2),
    113: c('titan', 'Титан', 'berserk', 'slayer', 46, 3),
    47: c('monk', 'Монах', 'berserk', 'ironclad', 44, 1),
    48: c('tyrant', 'Тиран', 'berserk', 'slayer', 47, 2),
    114: c('grandKhavatari', 'Гранд Хаватари', 'berserk', 'slayer', 48, 3),
    49: c('orcMystic', 'Мистик-орк', 'mage', null, null, 0),
    50: c('orcShaman', 'Шаман', 'priest', 'inquisitor', 49, 1),
    51: c('overlord', 'Повелитель', 'priest', 'inquisitor', 50, 2),
    115: c('dominator', 'Доминатор', 'priest', 'inquisitor', 51, 3),
    52: c('warcryer', 'Боевой Клич', 'priest', 'cleric', 50, 2),
    116: c('doomCryer', 'Предвестник Гибели', 'priest', 'cleric', 52, 3),
    // --- Dwarf ---
    53: c('dwarvenFighter', 'Боец-гном', 'warrior', null, null, 0),
    54: c('scavenger', 'Мусорщик', 'rogue', 'trickster', 53, 1),
    55: c('bountyHunter', 'Охотник за головами', 'rogue', 'assassin', 54, 2),
    117: c('fortuneSeeker', 'Искатель Удачи', 'rogue', 'assassin', 55, 3),
    56: c('artisan', 'Ремесленник', 'warrior', 'crusader', 53, 1),
    57: c('warsmith', 'Кузнец', 'warrior', 'warden', 56, 2),
    118: c('maestro', 'Маэстро', 'warrior', 'warden', 57, 3),
    // --- Kamael ---
    123: c('maleSoldier', 'Солдат-камаэль', 'berserk', null, null, 0),
    124: c('femaleSoldier', 'Солдат-камаэль (жен.)', 'archer', null, null, 0),
    125: c('trooper', 'Штурмовик', 'berserk', 'slayer', 123, 1),
    126: c('warder', 'Страж', 'archer', 'ranger', 124, 1),
    127: c('berserker', 'Берсерк', 'berserk', 'slayer', 125, 2),
    131: c('doombringer', 'Вестник Рока', 'berserk', 'slayer', 127, 3),
    128: c('maleSoulBreaker', 'Разрушитель Душ', 'mage', 'warlock', 125, 2),
    132: c('maleSoulHound', 'Гончая Душ', 'mage', 'warlock', 128, 3),
    129: c('femaleSoulBreaker', 'Разрушительница Душ', 'mage', 'warlock', 126, 2),
    133: c('femaleSoulHound', 'Гончая Душ (жен.)', 'mage', 'warlock', 129, 3),
    130: c('arbalester', 'Арбалетчик', 'archer', 'sniper', 126, 2),
    134: c('kamaelTrickster', 'Ловкач', 'archer', 'sniper', 130, 3),
    135: c('inspector', 'Инспектор', 'priest', 'inquisitor', 126, 2),
    136: c('judicator', 'Судья', 'priest', 'inquisitor', 135, 3)
});

/** The race of a class: the race of the start class of its line. */
const START_RACE = {0: 'human', 10: 'human', 18: 'elf', 25: 'elf', 31: 'darkElf', 38: 'darkElf', 44: 'orc', 49: 'orc', 53: 'dwarf', 123: 'kamael', 124: 'kamael'};
export const RACE_TITLES = Object.freeze({human: 'Человек', elf: 'Эльф', darkElf: 'Тёмный эльф', orc: 'Орк', dwarf: 'Гном', kamael: 'Камаэль'});
export function raceOf(classId) {
    let id = classId;
    while (L2_CLASS_META[id] && L2_CLASS_META[id].parent !== null) id = L2_CLASS_META[id].parent;
    return START_RACE[id] || null;
}

export const classIdOf = key => Number(Object.keys(L2_CLASS_META).find(id => L2_CLASS_META[id].key === key) ?? NaN);
export const classKeys = Object.freeze(Object.values(L2_CLASS_META).map(meta => meta.key));
