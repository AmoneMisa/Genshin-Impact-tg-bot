// Gwent decks for the mini-game. Names, rows, strengths and abilities follow the Russian card
// list of The Witcher 3 Gwent (duskworld.ru table, pasted by the user). Card names are the list's
// Russian names. Matched Witcher 3 artwork is indexed in gwent-art.js, with pinned provenance.
// Leaders and deck composition are selected in gwent-builder.js; choices during play are interactive.

/** Row keys used by the engine. The order is the order on the board. */
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
});

/** Special cards every deck shares. Counts are an approximation, not the official deck builder. */
export const SHARED_SPECIALS = Object.freeze([
  [special('decoy', 'Чучело', 'decoy'), 3],
  [special('commanders-horn', 'Командирский рог', 'horn'), 1],
  [special('scorch', 'Казнь', 'scorch'), 1],
  [special('biting-frost', 'Мороз', 'weather', { weather: 'close' }), 1],
  [special('impenetrable-fog', 'Мгла', 'weather', { weather: 'ranged' }), 1],
  [special('torrential-rain', 'Ливень', 'weather', { weather: 'siege' }), 1],
  [special('clear-weather', 'Ясное небо', 'weather', { weather: 'clear' }), 1],
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
  unit('gaunter-darkness', 'Гюнтер о’Дим: Тьма', 'r', 4, 'm:gaunter-darkness'),
  unit('gaunter', 'Гюнтер о’Дим', 's', 2, 'm:gaunter'),
  ability(unit('cow', 'Корова', 'c', 0), { onDestroy: { type: 'summon', token: 'cow-army' } }),
  ability(unit('villentretemerth', 'Виллентретемерт', 'c', 7), { onPlay: { type: 'scorchRow', target: 'close', cond: 'close', threshold: 10 } }),
]);

/** `tieWins`: the faction wins a drawn round (Nilfgaard, per the playground.ru guide). */
function deck(id, title, factionUnits, { leaders = [], extra = [], tieWins = false } = {}) {
  const cards = [...NEUTRAL, ...factionUnits, ...SHARED_SPECIALS, ...extra];
  return Object.freeze({ id, title, tieWins, leaders: Object.freeze(leaders), cards: Object.freeze(cards) });
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
  unit('hjalmar', 'Хьялмар', 'c', 10, 'H'),
  unit('birna', 'Бирна Бран', 'c', 2, 'D'),
  unit('holger-blackhand', 'Хольгер Чернорукий', 's', 4),
  unit('draig-bon-dhu', 'Драйк Бон-Дху', 's', 2, 'R'),
  unit('war-longship', 'Военный драккар', 's', 6, 'b:longship', 3),
  unit('light-longship', 'Легкий драккар', 'r', 4, 'm:longship', 2),
  unit('brokvar-archer', 'Лучник клана Броквар', 'r', 6),
  unit('olaf', 'Олаф', 'cr', 12, 'M'),
  unit('berserker', 'Берсерк', 'c', 4, 't:vildkaarl', 2),
  unit('young-berserker', 'Молодой берсерк', 'r', 2, 't:young-vildkaarl', 2),
  ability(unit('myshovur', 'Мышовур', 'r', 8, 'H'), { onPlay: { type: 'mardroeme' } }),
  ability(unit('keris', 'Керис', 'c', 10, 'H'), { onPlay: { type: 'musterHand', group: 'drummond' } }),
  ability(unit('kambi', 'Камби', 'c', 0), { onDestroy: { type: 'summon', token: 'heimdall' } }),
  ability(unit('pirate', 'Пират клана Димун', 'r', 6), { onPlay: { type: 'scorchAll' } }),
], {
  leaders: [leader('king-bran', 'Король Бран', { type: 'passive-bran' }), leader('crach', 'Крах ан Крайт', { type: 'shuffleGraveyards' })],
  extra: [[special('mardroeme', 'Мардрём', 'mardroeme'), 2], [special('storm-skellige', 'Шторм со Скеллиге', 'weather', { weather: ['ranged', 'siege'] }), 1]],
});

export const NORTHERN_REALMS_DECK = deck('northern-realms', 'Северные Королевства', [
  unit('poor-infantry', 'Гребаная пехтура', 'c', 1, 'b:poor-infantry', 3),
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
  unit('kaedweni-expert', 'Каэдвенский осадный мастер', 's', 1, 'M'),
  unit('thaler', 'Талер', 's', 1, 'S'),
  unit('dun-banner-medic', 'Лекарь Бурой Хоругви', 's', 5, 'D'),
  unit('ballista', 'Баллиста', 's', 6),
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
  unit('black-archer', 'Лучник Бурой Хоругви', 'r', 10),
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
  unit('nausicaa', 'Кавалерия «Наузикаа»', 'c', 2, 'b:nausicaa', 2),
  unit('impera', 'Бригада «Импера»', 'c', 3, 'b:impera', 2),
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
  unit('bruxa', 'Вампиры: брукса', 'c', 4, 'm:bruxa', 2),
  unit('garkain', 'Вампиры: гаркаин', 'c', 4, 'm:garkain', 2),
  unit('fleder', 'Вампиры: фледер', 'c', 4, 'm:fleder', 2),
  unit('ekimmara', 'Вампиры: экимма', 'c', 4, 'm:ekimmara', 2),
  unit('katakan', 'Вампиры: катакан', 'c', 5, 'm:katakan', 2),
  unit('arachas', 'Главоглаз', 'c', 4, 'm:arachas', 2),
  unit('arachas-behemoth', 'Огромный главоглаз', 's', 6, 'm:arachas-behemoth'),
  unit('forktail', 'Вилохвост', 'c', 5),
  unit('werewolf', 'Волколак', 'c', 5),
  unit('griffin', 'Грифон', 'c', 5),
  unit('plague-maiden', 'Моровая дева', 'c', 5),
  unit('frightener', 'Пугач', 'c', 5),
  unit('ice-giant', 'Ледяной Великан', 's', 5),
  unit('grave-hag', 'Кладбищенская баба', 'r', 5),
  unit('fiend', 'Бес', 'c', 6),
  unit('crone-brewess', 'Ведьма: Кухарка', 'c', 6, 'm:crone-brewess', 2),
  unit('crone-weavess', 'Ведьма: Пряха', 'c', 6, 'm:crone-weavess', 2),
  unit('crone-whispess', 'Ведьма: Шептуха', 'c', 6, 'm:crone-whispess', 2),
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
  unit('elven-skirmisher', 'Эльфийский застрельщик', 'r', 2, 'm:elven', 2),
  unit('dwarf-skirmisher', 'Краснолюд-застрельщик', 'c', 3, 'm:dwarf', 2),
  unit('ciaran', 'Киаран аэп Эасниллен', 'cr', 3),
  unit('vrihedd-cadet', 'Кадет «Врихедда»', 'r', 4),
  unit('dol-archer', 'Лучник из Дол Балатанны', 'r', 4),
  unit('hav-support', 'Поддержка гавенкаров', 'c', 5, 'm:hav-support', 2),
  unit('mahakaman', 'Махакамские добровольцы', 'c', 5, '', 3),
  unit('vrihedd-brigade', 'Бригада «Врихедд»', 'cr', 5, '', 2),
  unit('dennis', 'Деннис Кранмер', 'c', 6),
  unit('filavandrel', 'Филавандрель', 'cr', 6),
  unit('yaevinn', 'Яэвинн', 'cr', 6),
  unit('barclay', 'Барклай Эльс', 'cr', 6),
  unit('dol-scout', 'Следопыт из Дол Блатанны', 'cr', 6, '', 2),
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

export const GWENT_DECKS = Object.freeze({
  [SKELLIGE_DECK.id]: SKELLIGE_DECK,
  [NORTHERN_REALMS_DECK.id]: NORTHERN_REALMS_DECK,
  [NILFGAARD_DECK.id]: NILFGAARD_DECK,
  [MONSTERS_DECK.id]: MONSTERS_DECK,
  [SCOIATAEL_DECK.id]: SCOIATAEL_DECK,
});

export const DECK_IDS = Object.freeze(Object.keys(GWENT_DECKS));

/** Expands a deck definition into a flat list of card definitions with copies. */
export function expandDeck(deckDef) {
  return deckDef.cards.flatMap(([card, copies]) => Array.from({ length: copies }, () => ({ ...card })));
}
