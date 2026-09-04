import crypto from 'crypto';

const GAME_CONFIG = {
  dice: {
    title: 'Кубики',
    icon: '🎲',
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
    scoreKey: 'ball',
    maxRolls: 3,
    maxValue: 5,
    minWin: 12,
    maxWin: 15,
    rewardMultiplier: (score) => score === 15 ? 1.7 : 1.25,
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

function emptyGame(config) {
  return {
    bet: 0,
    [config.scoreKey]: 0,
    counter: 0,
    isStart: false,
  };
}

function ensureGame(session, gameId) {
  const config = configFor(gameId);
  if (!session.game) session.game = {};
  if (!session.game.inventory) session.game.inventory = { gold: 0, crystals: 0, ironOre: 0 };
  if (!session.game[gameId] || typeof session.game[gameId] !== 'object') {
    session.game[gameId] = emptyGame(config);
  }

  const game = session.game[gameId];
  game.bet = Math.max(0, number(game.bet));
  game[config.scoreKey] = Math.max(0, number(game[config.scoreKey]));
  game.counter = Math.max(0, Math.trunc(number(game.counter)));
  game.isStart = Boolean(game.isStart);
  return { config, game };
}

function gameDto(session, gameId) {
  const { config, game } = ensureGame(session, gameId);
  const score = number(game[config.scoreKey]);
  const rolls = Math.min(config.maxRolls, Math.max(0, number(game.counter)));

  return {
    id: gameId,
    title: config.title,
    icon: config.icon,
    active: Boolean(game.isStart),
    bet: number(game.bet),
    score,
    rolls,
    maxRolls: config.maxRolls,
    rollsLeft: Math.max(0, config.maxRolls - rolls),
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
  const { game } = ensureGame(session, gameId);
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

  const config = configFor(gameId);
  session.game[gameId] = {
    bet,
    [config.scoreKey]: 0,
    counter: 0,
    isStart: true,
  };

  return {
    ok: true,
    action: 'start',
    game: gameDto(session, gameId),
    arcade: getArcadeState(session),
  };
}

export function rollArcadeGame(session, gameId, options = {}) {
  const { config, game } = ensureGame(session, gameId);
  if (!game.isStart) {
    return { ok: false, reason: 'not_started', arcade: getArcadeState(session) };
  }
  if (game.counter >= config.maxRolls) {
    return { ok: false, reason: 'finished', arcade: getArcadeState(session) };
  }

  const randomInt = options.randomInt || ((min, max) => crypto.randomInt(min, max + 1));
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

  // Сохраняем экономику старого бота: ставка ограничена текущим балансом,
  // но не списывается. При победе начисляется bet * modifier, при поражении
  // баланс не меняется.
  if (reward > 0) session.game.inventory.gold = number(session.game.inventory.gold) + reward;

  const result = {
    gameId,
    value,
    score,
    bet,
    won,
    multiplier,
    reward,
    winRange: { min: config.minWin, max: config.maxWin },
  };

  session.game[gameId] = emptyGame(config);

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
    maxRolls: config.maxRolls,
    maxValue: config.maxValue,
    minWin: config.minWin,
    maxWin: config.maxWin,
  }]));
}
