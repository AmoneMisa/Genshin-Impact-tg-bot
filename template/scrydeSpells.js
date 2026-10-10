// The special skills of the Scryde Classic x5 server (https://ru.scryde.game/wiki/articles/description/scryde-classic-x5)
// with their spell table: the Buffer (Alt+B) table of buffs by character level, the songs and dances at half power, Mana
// Refresh, the Symphonies of the bards and the class balance skills. The buffs are the real High Five effects (l2Effects.js),
// `id` is the real skill id; `scale` is the share of the real power the server gives.
//
// Rules of the Buffer (as on the server): only in a peaceful place and out of combat, from level 20, a buff opens at about
// the level its class learns it; no resists, reflects or most skills of the 3rd profession - except Chant of Victory.
export const BUFFER_MIN_LEVEL = 20;
/** How long a buffer buff lasts, seconds (the real skills run twenty minutes). */
export const BUFFER_SECONDS = 20 * 60;

const buff = (key, name, id, level, text, extra = {}) => ({key, name, id, level, text, group: 'Обычные баффы', scale: 1, ...extra});
const music = (key, name, id, level, text, extra = {}) => ({key, name, id, level, text, group: 'Песни и танцы', scale: 0.5, ...extra});

export const SPELL_TABLE = Object.freeze([
    buff('wind-walk', 'Wind Walk', 1204, 20, 'Скорость +33'),
    buff('shield', 'Shield', 1040, 20, 'Физ. защита +15%'),
    buff('magic-barrier', 'Magic Barrier', 1036, 20, 'Маг. защита +30%'),
    buff('mental-shield', 'Mental Shield', 1035, 20, 'Сопротивление удержанию, страху, ментальным атакам +20'),
    buff('regeneration', 'Regeneration', 1044, 20, 'Скорость восстановления HP +20%'),
    buff('blessed-body', 'Bless the Body', 1045, 20, 'Макс. HP +35%'),
    buff('blessed-soul', 'Bless the Soul', 1048, 20, 'Макс. MP +35%'),
    buff('haste', 'Haste', 1086, 20, 'Скорость атаки +33%'),
    buff('focus', 'Focus', 1077, 20, 'Шанс крит. атаки +20%'),
    buff('vampiric-rage', 'Vampiric Rage', 1268, 20, 'Поглощение 9% HP от нанесённого урона'),
    buff('acumen', 'Acumen', 1085, 20, 'Скорость магии +30%'),
    buff('concentration', 'Concentration', 1078, 20, 'Шанс прерывания каста -18'),
    buff('empower', 'Empower', 1059, 25, 'Маг. атака +55%'),
    buff('death-whisper', 'Death Whisper', 1242, 40, 'Сила крит. удара +25%'),
    buff('might', 'Might', 1068, 40, 'Физ. атака +15%'),
    buff('guidance', 'Guidance', 1240, 40, 'Точность +2'),
    buff('berserker-spirit', 'Berserker Spirit', 1062, 40, '-5% физ. защиты, -10% маг. защиты, -2 уклонение, +5% физ. атаки, +10% маг. атаки, +5% скорости атаки и магии, +5 скорость'),
    buff('clarity', 'Clarity', 1397, 58, 'Расход MP: физ. умения -10%, маг. умения -4%, песни и танцы -10%'),
    buff('wild-magic', 'Wild Magic', 1303, 66, 'Шанс маг. крита +1'),
    // the only skill of the 3rd profession in the table: costs 40 Spirit Ore, lasts an hour
    buff('chant-of-victory', 'Chant of Victory', 1363, 78, 'Макс. HP +10%, шанс маг. крита +1, мощность крита +10%, физ. атака +5%, физ. защита +10%, скорость атаки +10%, маг. атака +10%, маг. защита +10%, скорость магии +10%, устойчивость к негативным эффектам +5%, точность +2, скорость -20%',
        {seconds: 60 * 60, items: {l2_3031: 40}}),
    music('song-of-hunter', 'Song of Hunter', 269, 40, 'Шанс крит. атаки +75%'),
    music('song-of-wind', 'Song of Wind', 268, 48, 'Скорость +10'),
    music('song-of-warding', 'Song of Warding', 267, 48, 'Маг. защита +15%'),
    music('dance-of-the-mystic', 'Dance of the Mystic', 273, 52, 'Маг. атака +10%'),
    music('dance-of-concentration', 'Dance of Concentration', 276, 52, 'Скорость магии +15%, шанс прерывания каста -40'),
    music('dance-of-the-warrior', 'Dance of the Warrior', 271, 55, 'Физ. атака +6%'),
    music('dance-of-fury', 'Dance of Fury', 275, 58, 'Скорость атаки +8%'),
    music('song-of-earth', 'Song of Earth', 264, 58, 'Физ. защита +12%'),
    music('song-of-vitality', 'Song of Vitality', 304, 66, 'Макс. HP +15%'),
].map(entry => Object.freeze(entry)));

/** Mana Refresh: an hour of faster mana regeneration, +5 / +10 / +15 / +20 by the level of the buff. */
export const MANA_REFRESH = Object.freeze({
    key: 'mana-refresh', name: 'Mana Refresh', group: 'Особые', seconds: 60 * 60,
    levels: Object.freeze([{level: 20, bonus: 5}, {level: 40, bonus: 10}, {level: 60, bonus: 15}, {level: 80, bonus: 20}]),
    text: 'Восстановление маны +{0} на час, входящая и исходящая Mana Recharge -90%',
});

/**
 * Symphonies: two songs / dances in one skill of the bards (Sword Singer, Bladedancer and their 3rd professions). They run at
 * full power for five minutes, replace the songs and dances of the buffer and cannot be used at the Olympiad.
 * `levels` lists the character levels of the skill levels; every skill level adds its songs.
 */
export const SYMPHONY_SECONDS = 5 * 60;
export const SYMPHONIES = Object.freeze([
    {key: 'critical-symphony', name: 'Critical Symphony', levels: [40], parts: [[269], [274]], text: 'Song of Hunter + Dance of Fire'},
    {key: 'concentration-symphony', name: 'Concentration Symphony', levels: [43, 52], parts: [[267, 276], [267, 276, 273]], text: 'Song of Warding + Dance of Concentration (+ Dance of the Mystic)'},
    {key: 'wind-symphony', name: 'Wind Symphony', levels: [46], parts: [[268, 272]], text: 'Song of Wind + Dance of Inspiration'},
    {key: 'warrior-symphony', name: 'Warrior Symphony', levels: [55], parts: [[264, 271]], text: 'Song of Earth + Dance of the Warrior'},
    {key: 'fury-symphony', name: 'Fury Symphony', levels: [49, 58], parts: [[266], [266, 275]], text: 'Song of Water + Dance of Fury'},
    {key: 'vitality-symphony', name: 'Vitality Symphony', levels: [66], parts: [[304, 310]], text: 'Song of Vitality + Dance of the Vampire'},
    {key: 'meditation-symphony', name: 'Meditation Symphony', levels: [77], parts: [[363, 349]], text: 'Song of Meditation + Song of Renewal'},
    {key: 'siren-symphony', name: 'Siren Symphony', levels: [78], parts: [[364, 365]], text: 'Song of Champion + Dance of Siren'},
].map(entry => Object.freeze(entry)));

/** Classes of the bard line (the symphonies) and what each Elder / Prophet line gets (Mass Buff). */
export const BARD_CLASSES = Object.freeze(['swordSinger', 'swordMuse', 'bladedancer', 'spectralDancer']);
export const MASS_BUFF_CLASSES = Object.freeze(['prophet', 'hierophant', 'elvenElder', 'evasSaint', 'shillienElder', 'shillienSaint']);

/**
 * Class balance skills of the server that the kits get (see template/professionSkills.js `scryde`): engine skills
 * (classSkillsTemplate.js fields). `classes` are the classes (and their 3rd professions) that learn them.
 */
export const CLASS_SKILLS = Object.freeze([
    {
        name: 'Deadly Smash', description: 'Мощная атака по врагам вокруг: +2192 урона, физ. и маг. защита цели -17% на 9 с.',
        classes: ['swordSinger', 'swordMuse', 'bladedancer', 'spectralDancer'], needLvl: 40,
        skill: {effect: 'strong_attack', isDealDamage: true, damageModifier: 4.2, cooldown: 30, cost: 150, debuff: {kind: 'armorBreak', amount: 17, seconds: 9}},
    },
    {
        name: 'Song of Spirit', description: 'Урон в PvE +10%, скорость атаки и магии +8%, скорость +8; получаемый в PvE урон -10%, откат умений -5%. С 83 уровня, не работает на Олимпиаде.',
        classes: ['swordMuse', 'spectralDancer'], needLvl: 83,
        skill: {effect: 'buff', isBuff: true, isSelf: true, cooldown: 90, cost: 200, buffs: [{kind: 'guard', amount: 10, seconds: 60}, {kind: 'haste', amount: 8, seconds: 60}]},
    },
    {
        // reworked: power 108, can be cast on any target, given to the Hierophant and Shillien Saint as well
        name: 'Might of Heaven', description: 'Кара богов: урон святой магией врагам (сила 108). Не работает на персонажей.',
        classes: ['bishop', 'cardinal', 'elvenElder', 'evasSaint', 'shillienElder', 'shillienSaint', 'prophet', 'hierophant'], needLvl: 40,
        skill: {effect: 'magic_attack', isDealDamage: true, damageModifier: 6.5, cooldown: 28, cost: 180},
    },
    {
        name: 'Witchcraft', description: 'Безэлементный урон (сила 108): 40% нанесённого урона возвращается здоровьем. Не работает на персонажей.',
        classes: ['mysticMuse', 'archmage'], needLvl: 76,
        skill: {effect: 'vampire', isDealDamage: true, damageModifier: 6.5, vampirePower: 0.4, cooldown: 30, cost: 200},
    },
    {
        name: 'King Fury', description: 'Умение питомца: урон и защита в PvE +35%, скорость атаки +30%, скорость +10, поглощение 8% урона HP на 1 час. Не работает на Олимпиаде.',
        classes: ['arcanaLord'], needLvl: 76,
        skill: {effect: 'buff', isBuff: true, isSelf: true, cooldown: 600, cost: 150, buffs: [{kind: 'damage', amount: 35, charges: 200}, {kind: 'guard', amount: 35, seconds: 3600}, {kind: 'haste', amount: 30, seconds: 3600}]},
    },
    {
        name: 'Magnus Fury', description: 'Умение питомца: урон в PvE +100%, защита в PvE +50% на 1 час, скорость магии +30%, откат умений -30%. Не работает на Олимпиаде.',
        classes: ['elementalMaster'], needLvl: 76,
        skill: {effect: 'buff', isBuff: true, isSelf: true, cooldown: 600, cost: 180, buffs: [{kind: 'damage', amount: 100, charges: 200}, {kind: 'guard', amount: 50, seconds: 3600}, {kind: 'haste', amount: 30, seconds: 3600}]},
    },
    {
        name: 'Mental Weakness', description: 'При Aggression на врага с шансом 75% снижает его маг. защиту на 13% на 10 с.',
        classes: ['evasTemplar'], needLvl: 76,
        skill: {effect: 'debuff', isSelf: false, cooldown: 20, cost: 60, debuff: {kind: 'armorBreak', amount: 13, seconds: 10}},
    },
    {
        name: 'Touch of Eva', description: 'Урон и защита в PvE +25%. Не работает вместе с Spirit of Shilen и Flame Icon.',
        classes: ['evasTemplar'], needLvl: 76,
        skill: {effect: 'buff', isBuff: true, isSelf: true, cooldown: 120, cost: 90, buffs: [{kind: 'damage', amount: 25, charges: 60}, {kind: 'guard', amount: 25, seconds: 600}]},
    },
    {
        name: 'Appetite Destruction', description: 'С 52 уровня: физ. атака +25%, шанс крита +25% и мощность крита +25% у отряда на 15 с.',
        classes: ['inspector', 'judicator'], needLvl: 52,
        skill: {effect: 'buff', isBuff: true, isSelf: true, cooldown: 60, cost: 120, buffs: [{kind: 'damage', amount: 25, charges: 4}, {kind: 'critChance', amount: 25, charges: 4}]},
    },
    {
        name: 'Vampiric Rage', description: 'Умение теперь доступно Пророку: поглощение 9% HP от нанесённого урона.',
        classes: ['prophet', 'hierophant'], needLvl: 20,
        skill: {effect: 'buff', isBuff: true, isSelf: true, cooldown: 45, cost: 90, buffs: [{kind: 'damage', amount: 15, charges: 4}]},
    },
]);

/**
 * Passive skills the server gave to classes (class balance update). `stats` are real stat nodes like those of the passives of
 * the class trees (passiveSkills.js converts them); `when` is the weapon the bonus needs. They are learned for skill points.
 */
export const CLASS_PASSIVES = Object.freeze([
    {
        id: 'scryde-magic-two-handed-mastery', name: 'Magic Two-Handed Weapon Mastery', needLevel: 76, sp: 4,
        classes: ['hierophant', 'evasSaint', 'shillienSaint', 'cardinal'],
        stats: [{tag: 'mul', stat: 'mAtk', value: [1.15], when: ['BLUNT']}, {tag: 'mul', stat: 'mDef', value: [1.15], when: ['BLUNT']}],
    },
    {
        id: 'scryde-bow-mastery', name: 'Bow Mastery', needLevel: 76, sp: 4, classes: ['doomCryer'],
        stats: [{tag: 'mul', stat: 'pAtk', value: [1.15], when: ['BOW']}],
    },
    {
        id: 'scryde-archers-will', name: "Archer's Will", needLevel: 76, sp: 2, classes: ['doomCryer'],
        stats: [{tag: 'add', stat: 'accCombat', value: [4], when: ['BOW']}],
    },
]);
