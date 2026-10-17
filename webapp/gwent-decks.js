// Gwent decks for the mini-game. Names, rows, strengths and abilities follow the Russian card
// list of The Witcher 3 Gwent (duskworld.ru table, pasted by the user). Card names are the list's
// Russian names. Matched Witcher 3 artwork is indexed in gwent-art.js, with pinned provenance.
// Leaders and deck composition are selected in gwent-builder.js; choices during play are interactive.

/** Row keys used by the engine. The order is the order on the board. */
/** The most copies of one card a deck may hold. */
export const MAX_COPIES = 3;
export const ROWS = Object.freeze(['close', 'ranged', 'siege']);
export const ROW_LABELS = Object.freeze({ close: 'Ближний бой', ranged: 'Дальний бой', siege: 'Осада' });

const ROW_CODE = { c: ['close'], r: ['ranged'], s: ['siege'], cr: ['close', 'ranged'] };

/**
 * One unit as [card, copies]. `flags` is a space-separated list: H hero, M morale, S spy, D medic,
 * R commander's horn, b:<name> tight bond group, m:<name> muster group (a "twin" uses its own name),
 * t:<token> transforms into the token when a mardroeme is played in its row.
 */
function unit(id, name, rowCode, strength, flags = '', copies = 1) {
  const tokens = flags.split(' ').filter(Boolean);
  const value = prefix => tokens.find(token => token.startsWith(prefix))?.slice(prefix.length);
  const card = { id, name, type: 'unit', rows: [...ROW_CODE[rowCode]], strength };
  if (card.rows.length > 1) card.agile = true;
  if (tokens.includes('H')) card.hero = true;
  if (tokens.includes('M')) card.morale = true;
  if (tokens.includes('S')) card.spy = true;
  if (tokens.includes('D')) card.medic = true;
  if (tokens.includes('R')) card.horn = true;
  if (tokens.includes('X')) card.swap = true;
  if (value('b:')) card.bond = value('b:');
  if (value('m:')) card.muster = value('m:');
  if (value('t:')) card.transformsTo = value('t:');
  return [card, copies];
}

/** Adds an ability to a [card, copies] tuple. */
const ability = ([card, copies], extra) => [{ ...card, ...extra }, copies];

const special = (id, name, kind, extra = {}) => ({ id, name, type: 'special', special: kind, strength: 0, ...extra });

/** Cards that are summoned, never drawn: the result of a transformation or of a destruction trigger. */
export const TOKENS = Object.freeze({
  heimdall: unit('heimdall', 'Хеймдалль', 'c', 11, 'H')[0],
  'cow-army': unit('cow-army', 'Скотские Вооруженные Силы', 'c', 8)[0],
  vildkaarl: unit('vildkaarl', 'Обратившийся вильдкаарл', 'c', 14, 'M')[0],
  'young-vildkaarl': unit('young-vildkaarl', 'Обратившийся молодой вильдкаарл', 'r', 8, 'b:young-vildkaarl')[0],
  squirrel: unit('squirrel', 'Белка-диверсант', 'c', 3)[0],
  wisp: unit('wisp', 'Призрачный огонёк', 'c', 3)[0],
});

/**
 * Special cards every deck shares. Copies follow the card counts of the Witcher 3 deck builder as they
 * are kept in the open-source recreation asundr/gwent-classic (decoy, horn, scorch and every weather card: 3).
 */
export const SHARED_SPECIALS = Object.freeze([
  [special('decoy', 'Чучело', 'decoy'), 3],
  [special('commanders-horn', 'Командирский рог', 'horn'), 3],
  [special('scorch', 'Казнь', 'scorch'), 3],
  [special('biting-frost', 'Мороз', 'weather', { weather: 'close' }), 3],
  [special('impenetrable-fog', 'Мгла', 'weather', { weather: 'ranged' }), 3],
  [special('torrential-rain', 'Ливень', 'weather', { weather: 'siege' }), 3],
  [special('clear-weather', 'Ясное небо', 'weather', { weather: 'clear' }), 3],
]);

/** Neutral cards: usable in every deck. */
export const NEUTRAL = Object.freeze([
  unit('avallach', 'Таинственный эльф', 'c', 0, 'H S'),
  unit('yennefer', 'Йеннифер из Венгерберга', 'r', 7, 'H D'),
  unit('triss', 'Трисс Меригольд', 'c', 7, 'H'),
  unit('geralt', 'Геральт из Ривии', 'c', 15, 'H'),
  unit('cirilla', 'Цирилла', 'c', 15, 'H'),
  unit('dandelion', 'Лютик', 'c', 2, 'R'),
  unit('zoltan', 'Золтан Хивай', 'c', 5),
  unit('emiel', 'Эмиель Регис', 'c', 5),
  unit('vesemir', 'Весемир', 'c', 6),
  unit('olgierd', 'Ольгред фон Эверек', 'cr', 6, 'M'),
  unit('gaunter-darkness', 'Гюнтер о’Дим: Тьма', 'r', 4, 'm:gaunter-darkness', 3),
  unit('gaunter', 'Гюнтер о’Дим', 's', 2, 'm:gaunter'),
  ability(unit('cow', 'Корова', 'r', 0), { onDestroy: { type: 'summon', token: 'cow-army' } }),
  ability(unit('villentretemerth', 'Виллентретемерт', 'c', 7), { onPlay: { type: 'scorchRow', target: 'close', cond: 'close', threshold: 10 } }),
]);

/** `tieWins`: the faction wins a drawn round (Nilfgaard, per the playground.ru guide). */
const NEW_FACTION_IDS = ['wild-hunt', 'witchers', 'toussaint', 'velen', 'redania', 'sorceresses'];
function deck(id, title, factionUnits, { leaders = [], extra = [], tieWins = false } = {}) {
  // A deck never holds more than three copies of one card, whatever the collection has.
  // The faction's own special cards come before the shared ones, so a starting deck takes them first.
  const cards = [...NEUTRAL, ...factionUnits, ...extra, ...SHARED_SPECIALS].map(([card, copies]) => [card, Math.min(copies, MAX_COPIES)]);
  return Object.freeze({ id, title, tieWins, ruleset: NEW_FACTION_IDS.includes(id) ? 'extended' : 'classic', leaders: Object.freeze(leaders), cards: Object.freeze(cards) });
}

/** A leader: `effect` is one of the effect types in gwent-engine.js. `passive-*` effects work all match. */
const leader = (id, name, effect) => Object.freeze({ id, name, effect: Object.freeze(effect) });

export const SKELLIGE_DECK = deck('skellige', 'Скеллиге', [
  unit('drummond', 'Воительница клана Друммонд', 'c', 4, 'b:drummond', 3),
  unit('craite', 'Воин клана ан Крайт', 'c', 6, 'b:craite', 3),
  unit('donar', 'Донар ан Хиндар', 'c', 4),
  unit('blacksmith', 'Кузнец клана Тордаррох', 'c', 4),
  unit('svanrige', 'Сванриге', 'c', 4),
  unit('heymaey-skald', 'Скальд клана Хеймэй', 'c', 4),
  unit('udalryk', 'Удальрик', 'c', 4),
  unit('lugos-mad', 'Лугос Безумный', 'c', 6),
  unit('lugos-blue', 'Лугос Синий', 'c', 6),
  unit('hjalmar', 'Хьялмар', 'r', 10, 'H'),
  unit('birna', 'Бирна Бран', 'c', 2, 'D'),
  unit('holger-blackhand', 'Хольгер Чернорукий', 's', 4),
  unit('draig-bon-dhu', 'Драйк Бон-Дху', 's', 2, 'R'),
  unit('war-longship', 'Военный драккар', 's', 6, 'b:longship', 3),
  unit('light-longship', 'Легкий драккар', 'r', 4, 'm:longship', 3),
  unit('brokvar-archer', 'Лучник клана Броквар', 'r', 6, '', 2),
  unit('olaf', 'Олаф', 'cr', 12, 'M'),
  unit('berserker', 'Берсерк', 'c', 4, 't:vildkaarl', 1),
  unit('young-berserker', 'Молодой берсерк', 'r', 2, 't:young-vildkaarl', 3),
  ability(unit('myshovur', 'Мышовур', 'r', 8, 'H'), { onPlay: { type: 'mardroeme' } }),
  ability(unit('keris', 'Керис', 'c', 10, 'H'), { onPlay: { type: 'musterHand', group: 'drummond' } }),
  ability(unit('kambi', 'Камби', 'c', 0), { onDestroy: { type: 'summon', token: 'heimdall' } }),
  ability(unit('pirate', 'Пират клана Димун', 'r', 6), { onPlay: { type: 'scorchAll' } }),
], {
  leaders: [leader('king-bran', 'Король Бран', { type: 'passive-bran' }), leader('crach', 'Крах ан Крайт', { type: 'shuffleGraveyards' })],
  extra: [[special('mardroeme', 'Мардрём', 'mardroeme'), 3], [special('storm-skellige', 'Шторм со Скеллиге', 'weather', { weather: ['ranged', 'siege'] }), 3]],
});

export const NORTHERN_REALMS_DECK = deck('northern-realms', 'Северные Королевства', [
  unit('poor-infantry', 'Гребаная пехтура', 'c', 1, 'b:poor-infantry', 4),
  unit('redanian-foot', 'Реданский пехотинец', 'c', 1, '', 2),
  unit('yarpen', 'Ярпен Зигрин', 'c', 2),
  unit('blue-stripes', 'Боец Синих Полосок', 'c', 4, 'b:blue-stripes', 3),
  unit('dijkstra', 'Сигизмунд Дийкстра', 'c', 4, 'S'),
  unit('stennis', 'Принц Стеннис', 'c', 5, 'S'),
  unit('ves', 'Бьянка', 'c', 5),
  unit('siegfried', 'Зигфрид из Денесле', 'c', 5),
  unit('esterad', 'Эстерад Тиссен', 'c', 10, 'H'),
  unit('john-natalis', 'Ян Наталис', 'c', 10, 'H'),
  unit('vernon', 'Вернон Роше', 'c', 10, 'H'),
  unit('sabrina', 'Сабрина Глевиссиг', 'r', 4),
  unit('sheldon', 'Шелдон Скаггс', 'r', 4),
  unit('keira', 'Кейра Мец', 'r', 5),
  unit('sile', 'Шеала де Тансервилль', 'r', 5),
  unit('dethmold', 'Детмольд', 'r', 6),
  unit('crinfrid', 'Рубайлы из Кринфрида', 'r', 5, 'b:crinfrid', 3),
  unit('philippa', 'Филиппа Эйльхарт', 'r', 10, 'H'),
  unit('kaedweni-expert', 'Каэдвенский осадный мастер', 's', 1, 'M', 3),
  unit('thaler', 'Талер', 's', 1, 'S'),
  unit('dun-banner-medic', 'Лекарь Бурой Хоругви', 's', 5, 'D'),
  unit('ballista', 'Баллиста', 's', 6, '', 2),
  unit('siege-tower', 'Осадная башня', 's', 6),
  unit('trebuchet', 'Требушет', 's', 6, '', 2),
  unit('catapult', 'Катапульта', 's', 8, 'b:catapult', 2),
], {
  leaders: [
    leader('foltest-temeria', 'Фольтест: Король Темерии', { type: 'weather', weather: 'ranged' }),
    leader('foltest-lord', 'Фольтест: Предводитель Севера', { type: 'weather', weather: 'clear' }),
    leader('foltest-siegemaster', 'Фольтест: Завоеватель', { type: 'double', row: 'siege' }),
    leader('foltest-steel', 'Фольтест: Железный Владыка', { type: 'scorchRow', target: 'siege', cond: 'siege', threshold: 10 }),
    leader('foltest-medell', 'Фольтест: Сын Меделла', { type: 'scorchRow', target: 'ranged', cond: 'ranged', threshold: 10 }),
  ],
});

export const NILFGAARD_DECK = deck('nilfgaard', 'Нильфгаард', [
  unit('tibor', 'Тибор Эггебрахт', 'r', 10, 'H'),
  unit('letho', 'Лето из Гулеты', 'c', 10, 'H'),
  unit('morvran', 'Морвран Воорхис', 's', 10, 'H'),
  unit('menno', 'Менно Коегоорн', 'c', 10, 'H D'),
  unit('black-archer', 'Лучник Бурой Хоругви', 'r', 10, '', 2),
  unit('heavy-scorpion', 'Бол. огненный скорпион', 's', 10),
  unit('zerrikanian-scorpion', 'Огненный скорпион', 's', 5),
  unit('combat-engineer', 'Сапер', 's', 6),
  unit('siege-support', 'Осадная поддержка', 's', 0, 'D'),
  unit('rotten-mangonel', 'Сгнившая петрария', 's', 3),
  unit('archer-support', 'Лучная поддержка', 'r', 1, 'D', 2),
  unit('albrich', 'Альбрих', 'r', 2),
  unit('sweers', 'Свирс', 'r', 2),
  unit('puttkammer', 'Путткаммер', 'r', 3),
  unit('vanhemar', 'Вангемар', 'r', 4),
  unit('cynthia', 'Цинтия', 'r', 4),
  unit('renuald', 'Ренуальд аэп Масген', 'r', 5),
  unit('assire', 'Ассире вар Анагыд', 'r', 6),
  unit('fringilla', 'Фрингилья Виго', 'r', 6),
  unit('vreemde', 'Вреемде', 'c', 2),
  unit('nausicaa', 'Кавалерия «Наузикаа»', 'c', 2, 'b:nausicaa', 3),
  unit('impera', 'Бригада «Импера»', 'c', 3, 'b:impera', 4),
  unit('morteisen', 'Мортейзен', 'c', 3),
  unit('vattier', 'Ваттье де Ридо', 'c', 4, 'S'),
  unit('rainfarn', 'Раинфарн', 'c', 4),
  unit('young-emissary', 'Молодой посланник', 'c', 5, 'b:emissary', 2),
  unit('cahir', 'Кагыр Маур аэп Кеаллах', 'c', 6),
  unit('shilard', 'Шилярд Фиц-Остерлен', 'c', 7, 'S'),
  unit('stefan', 'Стефан Скеллен', 'c', 9, 'S'),
], {
  leaders: [
    leader('emhyr-rain', 'Эмгыр вар Эмрейс: Йож из Эрленвальда', { type: 'weather', weather: 'siege' }),
    leader('emhyr-emperor', 'Эмгыр вар Эмрейс: Император Нильфгаарда', { type: 'reveal' }),
    leader('emhyr-flame', 'Эмгыр вар Эмрейс: Белое Пламя', { type: 'cancelEnemyLeader' }),
    leader('emhyr-relentless', 'Эмгыр вар Эмрейс: Властелин Юга', { type: 'takeEnemyGraveyard' }),
    leader('emhyr-conqueror', 'Эмгыр вар Эмрейс: Завоеватель севера', { type: 'reviveAny' }),
  ],
  tieWins: true,
});

export const MONSTERS_DECK = deck('monsters', 'Чудовища', [
  unit('ghoul', 'Гуль', 'c', 1, 'm:ghoul', 3),
  unit('nekker', 'Накер', 'c', 2, 'm:nekker', 3),
  unit('wyvern', 'Виверна', 'r', 2),
  unit('cockatrice', 'Василиск', 'r', 2),
  unit('gargoyle', 'Гаргулья', 'r', 2),
  unit('endrega', 'Эндриага', 'r', 2),
  unit('harpy', 'Гарпия', 'cr', 2),
  unit('celaeno-harpy', 'Гарпия келено', 'cr', 2),
  unit('foglet', 'Туманник', 'c', 2),
  unit('botchling', 'Игоша', 'c', 4),
  unit('bruxa', 'Вампиры: брукса', 'c', 4, 'm:bruxa', 1),
  unit('garkain', 'Вампиры: гаркаин', 'c', 4, 'm:garkain', 1),
  unit('fleder', 'Вампиры: фледер', 'c', 4, 'm:fleder', 1),
  unit('ekimmara', 'Вампиры: экимма', 'c', 4, 'm:ekimmara', 1),
  unit('katakan', 'Вампиры: катакан', 'c', 5, 'm:katakan', 1),
  unit('arachas', 'Главоглаз', 'c', 4, 'm:arachas', 3),
  unit('arachas-behemoth', 'Огромный главоглаз', 's', 6, 'm:arachas-behemoth'),
  unit('forktail', 'Вилохвост', 'c', 5),
  unit('werewolf', 'Волколак', 'c', 5),
  unit('griffin', 'Грифон', 'c', 5),
  unit('plague-maiden', 'Моровая дева', 'c', 5),
  unit('frightener', 'Пугач', 'c', 5),
  unit('ice-giant', 'Ледяной Великан', 's', 5),
  unit('grave-hag', 'Кладбищенская баба', 'r', 5),
  unit('fiend', 'Бес', 'c', 6),
  unit('crone-brewess', 'Ведьма: Кухарка', 'c', 6, 'm:crone-brewess', 1),
  unit('crone-weavess', 'Ведьма: Пряха', 'c', 6, 'm:crone-weavess', 1),
  unit('crone-whispess', 'Ведьма: Шептуха', 'c', 6, 'm:crone-whispess', 1),
  unit('earth-elemental', 'Элементаль земли', 's', 6),
  unit('fire-elemental', 'Элементаль огня', 's', 6),
  unit('kayran', 'Кейран', 'cr', 8, 'H M'),
  unit('draug', 'Драуг', 'c', 10, 'H'),
  unit('imlerith', 'Имлерих', 'c', 10, 'H'),
  unit('leshen', 'Леший', 'r', 10, 'H'),
  ability(unit('toad', 'Принц-жаба', 'r', 7), { onPlay: { type: 'scorchRow', target: 'ranged', cond: 'close', threshold: 10 } }),
], {
  leaders: [
    leader('eredin-commander', 'Эредин Бреакк Глас: Командир Дикой Охоты', { type: 'weatherBest' }),
    leader('eredin-king', 'Эредин Бреакк Глас: Король Aen Elle', { type: 'double', row: 'close' }),
    leader('eredin-bringer', 'Эредин Бреакк Глас: Убийца Оберона', { type: 'discardDraw' }),
    leader('eredin-destroyer', 'Эредин Бреакк Глас: Владыка Тир на Лиа', { type: 'returnFromGraveyard' }),
  ],
});

export const SCOIATAEL_DECK = deck('scoiatael', 'Скоя’таэли', [
  unit('havekar-healer', 'Лекарь-гавенкар', 'r', 0, 'D', 3),
  unit('riordain', 'Риордаин', 'r', 1),
  unit('toruviel', 'Торувьель', 'r', 2),
  unit('elven-skirmisher', 'Эльфийский застрельщик', 'r', 2, 'm:elven', 3),
  unit('dwarf-skirmisher', 'Краснолюд-застрельщик', 'c', 3, 'm:dwarf', 3),
  unit('ciaran', 'Киаран аэп Эасниллен', 'cr', 3),
  unit('vrihedd-cadet', 'Кадет «Врихедда»', 'r', 4),
  unit('dol-archer', 'Лучник из Дол Балатанны', 'r', 4),
  unit('hav-support', 'Поддержка гавенкаров', 'c', 5, 'm:hav-support', 3),
  unit('mahakaman', 'Махакамские добровольцы', 'c', 5, '', 5),
  unit('vrihedd-brigade', 'Бригада «Врихедд»', 'cr', 5, '', 2),
  unit('dennis', 'Деннис Кранмер', 'c', 6),
  unit('filavandrel', 'Филавандрель', 'cr', 6),
  unit('yaevinn', 'Яэвинн', 'cr', 6),
  unit('barclay', 'Барклай Эльс', 'cr', 6),
  unit('dol-scout', 'Следопыт из Дол Блатанны', 'cr', 6, '', 3),
  unit('ida', 'Ида Эмеан', 'r', 6),
  unit('milva', 'Мильва', 'r', 10, 'M'),
  unit('isengrim', 'Изенгрим Фаоильтиарна', 'c', 10, 'H M'),
  unit('iorveth', 'Иорвет', 'r', 10, 'H'),
  unit('saesenthessis', 'Саэсентессис', 'r', 10, 'H'),
  unit('eithne', 'Эйтне', 'r', 10, 'H'),
  ability(unit('schirru', 'Ширру', 's', 8), { onPlay: { type: 'scorchRow', target: 'siege', cond: 'close', threshold: 10 } }),
], {
  leaders: [
    leader('francesca-frost', 'Францеска Финдабаир: Истинная эльфийка', { type: 'weather', weather: 'close' }),
    leader('francesca-daisy', 'Францеска Финдабаир: Маргаритка из Долин', { type: 'passive-extra-draw' }),
    leader('francesca-beautiful', 'Францеска Финдабаир: Прекраснейшая', { type: 'double', row: 'ranged' }),
    leader('francesca-queen', 'Францеска Финдабаир: Королева Дол Блатанны', { type: 'scorchRow', target: 'close', cond: 'close', threshold: 10 }),
    leader('francesca-aen-seidhe', 'Францеска Финдабаир: Надежда Aen Seidhe', { type: 'moveAgile' }),
  ],
});

// ---- Extended rules: five factions made for this game from the world of The Witcher 3 ----------------------
// They are not part of the original game. Their cards use the original abilities plus swap (a unit that sends one
// of your units back to hand), ambush (a hidden trap in an enemy row) and the leader that moves any units.
const AMBUSH = special('ambush', 'Засада', 'ambush');
/** Element cards: weather that covers two rows at once. Every extended deck may take them. */
const ELEMENTS = [
  [special('el-fire', 'Стихия огня', 'weather', { weather: ['close', 'ranged'] }), 1],
  [special('el-earth', 'Стихия земли', 'weather', { weather: ['close', 'siege'] }), 1],
  [special('el-water', 'Стихия воды', 'weather', { weather: ['ranged', 'siege'] }), 1],
];
/** A spell: a special card the Sorceresses can bring back from the graveyard. */
const spell = (id, name, kind, copies, extra = {}) => [special(id, name, kind, { spell: true, ...extra }), copies];

export const WILD_HUNT_DECK = deck('wild-hunt', 'Дикая Охота', [
  unit('wh-spectre', 'Призрак Охоты', 'c', 2, 'm:wh-spectre', 3),
  unit('wh-red-rider', 'Красный всадник', 'c', 5, 'b:wh-rider', 3),
  unit('wh-ice-warrior', 'Ледяной воин', 'c', 4, '', 2),
  unit('wh-banner', 'Знаменосец Охоты', 'c', 2, 'M'),
  unit('wh-scout', 'Лазутчик Охоты', 'c', 3, 'S'),
  unit('wh-aen-elle-archer', 'Лучник Aen Elle', 'r', 4, '', 2),
  unit('wh-portal-mage', 'Чародей порталов', 'r', 5, 'X', 2),
  unit('wh-navigator', 'Навигатор', 'r', 3, 'D'),
  ability(unit('wh-winter-witch', 'Зимняя ведунья', 'r', 6), { onPlay: { type: 'scorchRow', target: 'ranged', cond: 'ranged', threshold: 10 } }),
  unit('wh-frost-hound', 'Ледяная гончая', 'cr', 4, 'm:wh-hound', 3),
  unit('wh-ghost-ship', 'Корабль-призрак', 's', 6, 'b:wh-ship', 2),
  unit('wh-ice-catapult', 'Ледяная катапульта', 's', 8),
  unit('wh-caranthir', 'Карантир', 'r', 10, 'H'),
  unit('wh-eredin-guard', 'Страж Эредина', 'c', 10, 'H'),
], {
  extra: [...ELEMENTS],
  leaders: [
    leader('wh-leader-lord', 'Эредин: Владыка Охоты', { type: 'double', row: 'close' }),
    leader('wh-leader-portals', 'Эредин: Хранитель порталов', { type: 'moveAny' }),
    leader('wh-leader-winter', 'Эредин: Зимний король', { type: 'weather', weather: 'close' }),
    leader('wh-leader-traitor', 'Эредин: Коварный', { type: 'takeEnemyGraveyard' }),
  ],
});

export const WITCHERS_DECK = deck('witchers', 'Ведьмаки', [
  unit('wi-wolf-novice', 'Ученик школы Волка', 'c', 4, 'b:wi-wolf', 3),
  unit('wi-bear-brute', 'Громила школы Медведя', 'c', 6, '', 2),
  unit('wi-cat-assassin', 'Убийца школы Кота', 'cr', 5, '', 2),
  ability(unit('wi-monster-hunter', 'Охотник на чудовищ', 'c', 6), { onPlay: { type: 'scorchRow', target: 'close', cond: 'close', threshold: 10 } }),
  unit('wi-griffin-sage', 'Знаток школы Грифона', 'r', 5, 'D'),
  unit('wi-viper-crossbow', 'Арбалетчик школы Змеи', 'r', 5, '', 2),
  unit('wi-alchemist', 'Алхимик', 'r', 4, 'M'),
  unit('wi-signs', 'Знаки ведьмака', 'r', 3, 'X', 2),
  unit('wi-keep-guard', 'Страж Каэр Морхена', 's', 6, '', 2),
  unit('wi-siege-engineer', 'Мастер осадных машин', 's', 4, 'b:wi-engineer', 2),
  unit('wi-lambert', 'Ламберт', 'c', 10, 'H'),
  unit('wi-eskel', 'Эскель', 'c', 10, 'H'),
  unit('wi-coen', 'Койон', 'r', 10, 'H'),
], {
  extra: [
    // Signs
    [special('wi-igni', 'Знак Игни', 'fireball'), 2],
    [special('wi-aard', 'Знак Аард', 'curse', { amount: 2 }), 2],
    [special('wi-yrden', 'Знак Ирден', 'ambush', { trapToken: 'wisp' }), 1],
    [special('wi-quen', 'Знак Квен', 'blessing', { amount: 2 }), 2],
    // Potions
    [special('wi-swallow', 'Зелье «Ласточка»', 'recall'), 1],
    [special('wi-thunderbolt', 'Зелье «Гром»', 'blessing', { amount: 3 }), 1],
    [special('wi-cat', 'Зелье «Кошка»', 'teleport'), 1],
    [special('wi-oriole', 'Зелье «Иволга»', 'weather', { weather: 'clear' }), 1],
    ...ELEMENTS,
  ],
  leaders: [
    leader('wi-leader-teacher', 'Весемир: Наставник школ', { type: 'reviveAny' }),
    leader('wi-leader-hunter', 'Весемир: Охотник на чудовищ', { type: 'scorchRow', target: 'ranged', cond: 'ranged', threshold: 10 }),
    leader('wi-leader-keeper', 'Весемир: Хранитель Каэр Морхена', { type: 'weather', weather: 'clear' }),
    leader('wi-leader-wolf', 'Весемир: Старый Волк', { type: 'weatherBest' }),
  ],
});

export const TOUSSAINT_DECK = deck('toussaint', 'Туссент', [
  unit('to-knight-errant', 'Странствующий рыцарь', 'c', 5, 'b:to-knight', 3),
  unit('to-ducal-guard', 'Герцогская гвардия', 'c', 5, 'M', 2),
  unit('to-vintner', 'Винодел', 'c', 3, '', 2),
  unit('to-courtier', 'Придворный шпион', 'c', 3, 'S', 2),
  unit('to-crossbowman', 'Арбалетчик Туссента', 'r', 6, '', 2),
  unit('to-herald', 'Глашатай', 'r', 2, 'R'),
  unit('to-physician', 'Придворный лекарь', 'r', 3, 'D'),
  unit('to-lady', 'Прекрасная дама', 'r', 8),
  unit('to-war-horse', 'Боевой конь', 'cr', 5, '', 2),
  unit('to-ballista', 'Баллиста Туссента', 's', 7, '', 2),
  unit('to-trebuchet', 'Требушет Туссента', 's', 8),
  unit('to-palmerin', 'Пальмерин де Лаунфорд', 'c', 10, 'H'),
  unit('to-anna', 'Анна Генриетта', 'r', 10, 'H'),
  unit('to-syanna', 'Сианна', 'r', 10, 'H'),
], {
  extra: [...ELEMENTS],
  leaders: [
    leader('to-leader-duchess', 'Анна Генриетта: Герцогиня', { type: 'double', row: 'ranged' }),
    leader('to-leader-feast', 'Анна Генриетта: Хозяйка пиров', { type: 'takeEnemyGraveyard' }),
    leader('to-leader-knights', 'Анна Генриетта: Покровительница рыцарей', { type: 'weatherBest' }),
    leader('to-leader-defender', 'Анна Генриетта: Защитница Туссента', { type: 'scorchRow', target: 'close', cond: 'close', threshold: 10 }),
  ],
});

export const SORCERESSES_DECK = deck('sorceresses', 'Чародейки', [
  unit('so-apprentice', 'Ученица Аретузы', 'r', 2, 'm:so-apprentice', 3),
  unit('so-adept', 'Адептка Ложи', 'r', 4, 'b:so-adept', 3),
  unit('so-healer', 'Целительница', 'r', 3, 'D'),
  unit('so-seer', 'Провидица', 'r', 4, 'S'),
  unit('so-war-mage', 'Боевой маг', 'r', 5, '', 2),
  unit('so-illusionist', 'Иллюзионистка', 'c', 3, 'X', 2),
  unit('so-knight', 'Рыцарь Ложи', 'c', 6, '', 2),
  unit('so-guard', 'Страж Ложи', 'c', 5, '', 2),
  unit('so-golem', 'Голем', 's', 6, '', 2),
  unit('so-elemental', 'Вызванный элементаль', 's', 5, 'M'),
  unit('so-portal-keeper', 'Хранительница порталов', 'cr', 4, '', 2),
  unit('so-margarita', 'Маргарита Лаукс-Антиль', 'r', 10, 'H'),
  unit('so-sheala', 'Шеала де Тансарвиль', 'r', 10, 'H'),
  unit('so-tissaia', 'Тиссая де Врис', 'c', 10, 'H'),
], {
  extra: [
    spell('so-fireball', 'Огненный шар', 'fireball', 2),
    spell('so-teleport', 'Телепортация', 'teleport', 2),
    spell('so-heal', 'Исцеление', 'recall', 2),
    spell('so-blessing', 'Благословение магии', 'blessing', 2),
    spell('so-curse', 'Проклятие', 'curse', 2),
    ...ELEMENTS,
  ],
  leaders: [
    leader('so-leader-head', 'Филиппа Эйльхарт: Глава Ложи', { type: 'double', row: 'ranged' }),
    leader('so-leader-spells', 'Филиппа Эйльхарт: Хозяйка заклинаний', { type: 'returnFromGraveyard' }),
    leader('so-leader-elements', 'Филиппа Эйльхарт: Повелительница стихий', { type: 'weather', weather: ['close', 'ranged'] }),
    leader('so-leader-illusion', 'Филиппа Эйльхарт: Мастер иллюзий', { type: 'cancelEnemyLeader' }),
  ],
});

export const VELEN_DECK = deck('velen', 'Велен', [
  unit('ve-drowner', 'Утопец', 'c', 2, 'm:ve-drowner', 3),
  unit('ve-bog-witch', 'Болотная ведьма', 'c', 5, 'b:ve-witch', 3),
  unit('ve-militia', 'Ополчение Велена', 'c', 4, 'b:ve-militia', 3),
  unit('ve-bandit', 'Разбойник', 'c', 5, '', 2),
  unit('ve-water-hag', 'Водяная баба', 'r', 5, '', 2),
  unit('ve-herbalist', 'Знахарка', 'r', 6, 'D'),
  unit('ve-deserter', 'Дезертир', 'r', 3, 'S'),
  unit('ve-forest-spirit', 'Лесной дух', 'c', 7, 'X'),
  unit('ve-ghost', 'Призрак замка', 's', 3, 'M'),
  unit('ve-trophy-catapult', 'Трофейная катапульта', 's', 8, '', 2),
  unit('ve-baron', 'Кровавый Барон', 'c', 10, 'H'),
  unit('ve-mistress', 'Хозяйка болот', 'r', 10, 'H'),
], {
  extra: [[AMBUSH, 2], ...ELEMENTS],
  leaders: [
    leader('ve-leader-fog', 'Туман Велена', { type: 'weather', weather: 'ranged' }),
    leader('ve-leader-swamp', 'Трясина', { type: 'weather', weather: ['close', 'ranged'] }),
    leader('ve-leader-silence', 'Тишина болот', { type: 'cancelEnemyLeader' }),
    leader('ve-leader-baron', 'Кровавый Барон: Хозяин Хмырёвки', { type: 'double', row: 'close' }),
  ],
});

export const REDANIA_DECK = deck('redania', 'Редания', [
  unit('re-royal-guard', 'Королевская гвардия', 'c', 5, 'b:re-guard', 3),
  unit('re-informant', 'Осведомитель', 'c', 2, 'S'),
  unit('re-agent', 'Агент короны', 'c', 5),
  unit('re-saboteur', 'Диверсант', 'c', 3, 'X', 2),
  unit('re-captain', 'Капитан гвардии', 'c', 6),
  unit('re-crossbowman', 'Редарский арбалетчик', 'r', 5, '', 2),
  unit('re-court-mage', 'Придворный маг', 'r', 4, 'D'),
  unit('re-sapper', 'Сапёр', 's', 5, '', 2),
  unit('re-siege-master', 'Осадный мастер', 's', 7, '', 2),
  unit('re-radovid', 'Радовид Свирепый', 'c', 10, 'H'),
  unit('re-grand-master', 'Великий магистр ордена', 'c', 10, 'H'),
  unit('re-counselor', 'Тайный советник', 'r', 10, 'H'),
], {
  extra: [[AMBUSH, 3], ...ELEMENTS],
  leaders: [
    leader('re-leader-hunter', 'Радовид: Охотник на магов', { type: 'cancelEnemyLeader' }),
    leader('re-leader-spymaster', 'Радовид: Хозяин шпионов', { type: 'discardDraw' }),
    leader('re-leader-king', 'Радовид: Король Редании', { type: 'double', row: 'siege' }),
    leader('re-leader-inquisitor', 'Радовид: Великий инквизитор', { type: 'scorchRow', target: 'siege', cond: 'siege', threshold: 10 }),
  ],
});

// ---- Extended rules: the five original factions with new skills and tuned cards -----------------------------
// `modify` changes cards by id (any card field, or `copies`; 0 copies removes the card), `add` brings new unit
// cards, `extra` special cards, `leaders` further leaders. The original decks themselves are never changed.
function variant(base, { modify = {}, add = [], extra = [], leaders = [] } = {}) {
  const changed = base.cards.map(([card, copies]) => {
    const change = modify[card.id];
    if (!change) return [card, copies];
    const { copies: count, ...fields } = change;
    return [{ ...card, ...fields }, count ?? copies];
  }).filter(([, copies]) => copies > 0);
  const cards = [...changed, ...add, ...extra].map(([card, copies]) => [card, Math.min(copies, MAX_COPIES)]);
  return Object.freeze({ ...base, ruleset: 'extended', leaders: Object.freeze([...base.leaders, ...leaders]), cards: Object.freeze(cards) });
}

const SKELLIGE_EXTENDED = variant(SKELLIGE_DECK, {
  modify: {
    birna: { strength: 3 }, 'heymaey-skald': { morale: true }, 'young-berserker': { strength: 3 },
    'light-longship': { strength: 5 }, 'draig-bon-dhu': { strength: 3 },
  },
  add: [
    unit('sk-axeman', 'Секироносец клана Туирсех', 'c', 4, 'b:sk-axe', 3),
    unit('sk-sea-wolf', 'Морской волк', 'cr', 5),
    unit('sk-shipwright', 'Корабельный мастер', 's', 4, 'D'),
    unit('sk-captain', 'Капитан драккара', 'r', 6, 'X'),
  ],
  extra: [[AMBUSH, 1], ...ELEMENTS],
  leaders: [
    leader('sk-leader-jarl', 'Крах ан Крайт: Ярл островов', { type: 'reviveAny' }),
    leader('sk-leader-fury', 'Король Бран: Свирепый король', { type: 'double', row: 'close' }),
  ],
});
const NORTHERN_EXTENDED = variant(NORTHERN_REALMS_DECK, {
  add: [unit('nr-scout', 'Лазутчик Темерии', 'c', 3, 'X')],
  extra: [[AMBUSH, 1], ...ELEMENTS],
});
const NILFGAARD_EXTENDED = variant(NILFGAARD_DECK, {
  add: [unit('nf-double-agent', 'Двойной агент', 'c', 4, 'X')],
  extra: [[AMBUSH, 1], ...ELEMENTS],
});
const MONSTERS_EXTENDED = variant(MONSTERS_DECK, {
  modify: { 'ice-giant': { strength: 6 } },
  add: [unit('mo-stalker', 'Лесной хищник', 'c', 6, 'X')],
  extra: [[AMBUSH, 2], ...ELEMENTS],
});
const SCOIATAEL_EXTENDED = variant(SCOIATAEL_DECK, {
  modify: { 'vrihedd-cadet': { strength: 5, swap: true } },
  add: [unit('sc-ranger', 'Лесной стрелок', 'r', 6, 'X')],
  extra: [[AMBUSH, 2], ...ELEMENTS],
});

/** The decks of the extended rules: tuned versions of the original factions and the five new ones. */
export const EXTENDED_DECKS = Object.freeze({
  skellige: SKELLIGE_EXTENDED, 'northern-realms': NORTHERN_EXTENDED, nilfgaard: NILFGAARD_EXTENDED,
  monsters: MONSTERS_EXTENDED, scoiatael: SCOIATAEL_EXTENDED,
  'wild-hunt': WILD_HUNT_DECK, witchers: WITCHERS_DECK, toussaint: TOUSSAINT_DECK, velen: VELEN_DECK, redania: REDANIA_DECK,
  sorceresses: SORCERESSES_DECK,
});

export const GWENT_DECKS = Object.freeze({
  [SKELLIGE_DECK.id]: SKELLIGE_DECK,
  [NORTHERN_REALMS_DECK.id]: NORTHERN_REALMS_DECK,
  [NILFGAARD_DECK.id]: NILFGAARD_DECK,
  [MONSTERS_DECK.id]: MONSTERS_DECK,
  [SCOIATAEL_DECK.id]: SCOIATAEL_DECK,
  [WILD_HUNT_DECK.id]: WILD_HUNT_DECK,
  [WITCHERS_DECK.id]: WITCHERS_DECK,
  [TOUSSAINT_DECK.id]: TOUSSAINT_DECK,
  [VELEN_DECK.id]: VELEN_DECK,
  [REDANIA_DECK.id]: REDANIA_DECK,
  [SORCERESSES_DECK.id]: SORCERESSES_DECK,
});

/** The five factions of the original game. */
export const DECK_IDS = Object.freeze(['skellige', 'northern-realms', 'nilfgaard', 'monsters', 'scoiatael']);
/** The factions made for the extended rules. */
export const EXTENDED_FACTIONS = Object.freeze(['wild-hunt', 'witchers', 'toussaint', 'velen', 'redania', 'sorceresses']);

/** Rule sets: `classic` is the original game (rated), `extended` adds the new factions and rules. */
export const RULESETS = Object.freeze({
  classic: Object.freeze({ id: 'classic', title: 'Оригинал', factions: DECK_IDS }),
  extended: Object.freeze({ id: 'extended', title: 'Расширенный', factions: Object.freeze([...DECK_IDS, ...EXTENDED_FACTIONS]) }),
});
export const normalizeRuleset = value => (Object.hasOwn(RULESETS, value) ? value : 'classic');
/** The deck definition of a faction under a rule set (the extended rules tune the original factions). */
export const deckFor = (ruleset, faction) => (normalizeRuleset(ruleset) === 'extended' && Object.hasOwn(EXTENDED_DECKS, faction) ? EXTENDED_DECKS[faction] : GWENT_DECKS[faction]);
/** Key under which a saved deck is stored: the faction itself for the original rules, `x:` + faction for extended. */
export const loadoutKey = (ruleset, faction) => (normalizeRuleset(ruleset) === 'extended' ? `x:${faction}` : faction);
/** True when `faction` may be played under `ruleset`. */
export const rulesetAllows = (ruleset, faction) => RULESETS[normalizeRuleset(ruleset)].factions.includes(faction);

/** Expands a deck definition into a flat list of card definitions with copies. */
export function expandDeck(deckDef) {
  return deckDef.cards.flatMap(([card, copies]) => Array.from({ length: copies }, () => ({ ...card })));
}
