import crypto from 'crypto';

const SLOT_SYMBOLS = ['😈', '❤️', '💋', '🤏', '🛫', '🚗', '💩', '👻', '👽', '☠️'];

const GAME_CONFIG = {
  dice: {
    title: 'Кубики',
    icon: '🎲',
    mode: 'score',
    scoreKey: 'dice',
    maxRolls: 3,
    maxValue: 6,
    minWin: 12,
    maxWin: 18,
    rewardMultiplier: () => 1.2,
  },
  bowling: {
    title: 'Боулинг',
    icon: '🎳',
    mode: 'score',
    scoreKey: 'skittles',
    maxRolls: 2,
    maxValue: 6,
    minWin: 8,
    maxWin: 12,
    rewardMultiplier: (score) => score === 12 ? 3 : 1.2,
  },
  darts: {
    title: 'Дартс',
    icon: '🎯',
    mode: 'score',
    scoreKey: 'dart',
    maxRolls: 3,
    maxValue: 6,
    minWin: 13,
    maxWin: 18,
    rewardMultiplier: (score) => score === 18 ? 2 : 1.4,
  },
  football: {
    title: 'Футбол',
    icon: '⚽',
    mode: 'score',
    scoreKey: 'ball',
    maxRolls: 3,
    maxValue: 5,
    minWin: 12,
    maxWin: 15,
    rewardMultiplier: (score) => score === 15 ? 1.7 : 1.25,
  },
  basketball: {
    title: 'Баскетбол',
    icon: '🏀',
    mode: 'score',
    scoreKey: 'ball',
    maxRolls: 3,
    maxValue: 5,
    minWin: 12,
    maxWin: 15,
    rewardMultiplier: (score) => score === 15 ? 1.7 : 1.25,
  },
  slots: {
    title: 'Слоты',
    icon: '🎰',
    mode: 'slots',
    sessionKey: 'slotsMiniApp',
    maxRolls: 1,
    winChance: 0.2,
    rewardMultiplier: () => 1.5,
    deductBet: true,
  },
};

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function configFor(gameId) {
  const config = GAME_CONFIG[gameId];
  if (!config) throw new Error(`Unknown arcade game: ${gameId}`);
  return config;
}

function sessionKeyFor(gameId, config = configFor(gameId)) {
  return config.sessionKey || gameId;
}

function emptyGame(config) {
  if (config.mode === 'slots') {
    return {
      bet: 0,
      reels: [],
      counter: 0,
      isStart: false,
    };
  }

  return {
    bet: 0,
    [config.scoreKey]: 0,
    counter: 0,
    isStart: false,
  };
}

function ensureGame(session, gameId) {
  const config = configFor(gameId);
  const sessionKey = sessionKeyFor(gameId, config);
  if (!session.game) session.game = {};
  if (!session.game.inventory) session.game.inventory = { gold: 0, crystals: 0, ironOre: 0 };
  if (!session.game[sessionKey] || typeof session.game[sessionKey] !== 'object') {
    session.game[sessionKey] = emptyGame(config);
  }

  const game = session.game[sessionKey];
  game.bet = Math.max(0, number(game.bet));
  game.counter = Math.max(0, Math.trunc(number(game.counter)));
  game.isStart = Boolean(game.isStart);

  if (config.mode === 'slots') {
    if (!Array.isArray(game.reels)) game.reels = [];
  } else {
    game[config.scoreKey] = Math.max(0, number(game[config.scoreKey]));
  }

  return { config, game, sessionKey };
}

function gameDto(session, gameId) {
  const { config, game } = ensureGame(session, gameId);
  const rolls = Math.min(config.maxRolls, Math.max(0, number(game.counter)));
  const base = {
    id: gameId,
    title: config.title,
    icon: config.icon,
    mode: config.mode,
    active: Boolean(game.isStart),
    bet: number(game.bet),
    rolls,
    maxRolls: config.maxRolls,
    rollsLeft: Math.max(0, config.maxRolls - rolls),
    deductBet: Boolean(config.deductBet),
  };

  if (config.mode === 'slots') {
    return {
      ...base,
      reels: Array.isArray(game.reels) ? game.reels.slice(0, 3) : [],
      winChance: config.winChance,
      payoutMultiplier: config.rewardMultiplier(),
    };
  }

  return {
    ...base,
    score: number(game[config.scoreKey]),
    maxValue: config.maxValue,
    winRange: { min: config.minWin, max: config.maxWin },
  };
}

export function getArcadeState(session) {
  const gold = Math.max(0, number(session?.game?.inventory?.gold));
  return {
    gold,
    games: Object.keys(GAME_CONFIG).map(gameId => gameDto(session, gameId)),
  };
}

export function startArcadeGame(session, gameId, rawBet) {
  const { config, game, sessionKey } = ensureGame(session, gameId);
  const gold = Math.max(0, number(session.game.inventory.gold));
  const bet = Number(rawBet);

  if (!Number.isInteger(bet) || bet < 0) {
    return { ok: false, reason: 'invalid_bet', arcade: getArcadeState(session) };
  }
  if (bet > gold) {
    return { ok: false, reason: 'not_enough_gold', arcade: getArcadeState(session) };
  }
  if (game.isStart) {
    return { ok: false, reason: 'already_started', arcade: getArcadeState(session) };
  }

  if (config.deductBet) {
    session.game.inventory.gold = gold - bet;
  }

  session.game[sessionKey] = {
    ...emptyGame(config),
    bet,
    isStart: true,
  };

  return {
    ok: true,
    action: 'start',
    game: gameDto(session, gameId),
    arcade: getArcadeState(session),
  };
}

function secureRandomInt(min, max) {
  return crypto.randomInt(min, max + 1);
}

function rollSlots(session, gameId, config, game, options = {}) {
  const randomInt = options.randomInt || secureRandomInt;
  const winRoll = randomInt(0, 4);
  if (!Number.isInteger(winRoll) || winRoll < 0 || winRoll > 4) {
    throw new Error(`Arcade RNG returned invalid win roll ${winRoll} for ${gameId}`);
  }

  const won = winRoll === 0;
  let reels;

  if (won) {
    const index = randomInt(0, SLOT_SYMBOLS.length - 1);
    if (!Number.isInteger(index) || index < 0 || index >= SLOT_SYMBOLS.length) {
      throw new Error(`Arcade RNG returned invalid slot index ${index}`);
    }
    const symbol = SLOT_SYMBOLS[index];
    reels = [symbol, symbol, symbol];
  } else {
    const indexes = [];
    for (let i = 0; i < 3; i++) {
      const index = randomInt(0, SLOT_SYMBOLS.length - 1);
      if (!Number.isInteger(index) || index < 0 || index >= SLOT_SYMBOLS.length) {
        throw new Error(`Arcade RNG returned invalid slot index ${index}`);
      }
      indexes.push(index);
    }

    // Старый бот при проигрыше перегенерировал случайную тройку, пока она не
    // переставала быть джекпотом. Здесь гарантируем то же условие без цикла.
    if (indexes[0] === indexes[1] && indexes[1] === indexes[2]) {
      indexes[2] = (indexes[2] + 1) % SLOT_SYMBOLS.length;
    }
    reels = indexes.map(index => SLOT_SYMBOLS[index]);
  }

  const bet = number(game.bet);
  const multiplier = won ? config.rewardMultiplier() : 0;
  const reward = won ? bet * multiplier : 0;
  if (reward > 0) {
    session.game.inventory.gold = number(session.game.inventory.gold) + reward;
  }

  const result = {
    gameId,
    mode: 'slots',
    reels,
    bet,
    won,
    multiplier,
    reward,
    net: reward - bet,
    winChance: config.winChance,
  };

  session.game[sessionKeyFor(gameId, config)] = emptyGame(config);

  return {
    ok: true,
    action: 'roll',
    value: reels.join(''),
    finished: true,
    result,
    game: gameDto(session, gameId),
    arcade: getArcadeState(session),
  };
}

export function rollArcadeGame(session, gameId, options = {}) {
  const { config, game, sessionKey } = ensureGame(session, gameId);
  if (!game.isStart) {
    return { ok: false, reason: 'not_started', arcade: getArcadeState(session) };
  }
  if (game.counter >= config.maxRolls) {
    return { ok: false, reason: 'finished', arcade: getArcadeState(session) };
  }

  if (config.mode === 'slots') {
    return rollSlots(session, gameId, config, game, options);
  }

  const randomInt = options.randomInt || secureRandomInt;
  const value = randomInt(1, config.maxValue);
  if (!Number.isInteger(value) || value < 1 || value > config.maxValue) {
    throw new Error(`Arcade RNG returned invalid value ${value} for ${gameId}`);
  }

  game[config.scoreKey] += value;
  game.counter += 1;

  if (game.counter < config.maxRolls) {
    return {
      ok: true,
      action: 'roll',
      value,
      finished: false,
      game: gameDto(session, gameId),
      arcade: getArcadeState(session),
    };
  }

  const score = number(game[config.scoreKey]);
  const bet = number(game.bet);
  const won = score >= config.minWin && score <= config.maxWin;
  const multiplier = won ? config.rewardMultiplier(score) : 0;
  const reward = won ? Math.round(bet * multiplier) : 0;

  // Сохраняем экономику старого бота для спортивных игр: ставка ограничена
  // текущим балансом, но не списывается. При победе начисляется bet * modifier,
  // при поражении баланс не меняется. Слоты обрабатываются отдельно выше.
  if (reward > 0) session.game.inventory.gold = number(session.game.inventory.gold) + reward;

  const result = {
    gameId,
    mode: 'score',
    value,
    score,
    bet,
    won,
    multiplier,
    reward,
    winRange: { min: config.minWin, max: config.maxWin },
  };

  session.game[sessionKey] = emptyGame(config);

  return {
    ok: true,
    action: 'roll',
    value,
    finished: true,
    result,
    game: gameDto(session, gameId),
    arcade: getArcadeState(session),
  };
}

export function getArcadeConfig() {
  return Object.fromEntries(Object.entries(GAME_CONFIG).map(([id, config]) => [id, {
    id,
    title: config.title,
    icon: config.icon,
    mode: config.mode,
    maxRolls: config.maxRolls,
    maxValue: config.maxValue || null,
    minWin: config.minWin ?? null,
    maxWin: config.maxWin ?? null,
    winChance: config.winChance ?? null,
    deductBet: Boolean(config.deductBet),
  }]));
}
