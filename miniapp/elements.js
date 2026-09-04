import crypto from 'crypto';
import elementsTemplate from '../template/elements.js';
import updatePoints from '../functions/game/elements/updatePoints.js';

const JOIN_MS = 15_000;
const BETTING_MS = 25_000;
const TURN_MS = 20_000;
const MAX_ROUNDS = 3;
const MAX_HUMANS = 6;

function nowValue(options = {}) {
  return Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
}

function rngFor(options = {}) {
  return options.randomInt || ((min, max) => crypto.randomInt(min, max + 1));
}

function ensureGameRoot(chat) {
  if (!chat.game || typeof chat.game !== 'object') chat.game = {};
  return chat.game;
}

function memberById(chat, userId) {
  return Array.isArray(chat?.members)
    ? chat.members.find(member => String(member.userId) === String(userId))
    : null;
}

function playerName(chat, id) {
  if (String(id) === 'bot') return 'Всемогущий';
  const user = memberById(chat, id)?.userChatData?.user || {};
  if (user.username) return `@${user.username}`;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return fullName || `Игрок ${id}`;
}

function emptyPlayer(id, bet = 0) {
  return { id: String(id), bet, usedItems: [], points: 0, draws: 0 };
}

function humanEntries(game) {
  return Object.entries(game?.players || {}).filter(([id]) => id !== 'bot');
}

function createGame(userId, now) {
  return {
    phase: 'join',
    createdAt: now,
    joinEndsAt: now + JOIN_MS,
    bettingEndsAt: now + JOIN_MS + BETTING_MS,
    turnEndsAt: null,
    currentRound: 1,
    players: {
      bot: emptyPlayer('bot'),
      [String(userId)]: emptyPlayer(userId),
    },
    lastResult: null,
    gameSessionLastUpdateAt: now,
  };
}

function randomElement(rng) {
  const index = rng(0, elementsTemplate.length - 1);
  if (!Number.isInteger(index) || index < 0 || index >= elementsTemplate.length) {
    throw new Error(`Elements RNG returned invalid index ${index}`);
  }
  return elementsTemplate[index];
}

function dealInitial(game, rng) {
  for (const [id, player] of humanEntries(game)) {
    player.usedItems = [randomElement(rng)];
    player.draws = 0;
    player.id = String(id);
  }

  const bot = game.players.bot || emptyPlayer('bot');
  bot.usedItems = [randomElement(rng), randomElement(rng), randomElement(rng), randomElement(rng)];
  bot.draws = MAX_ROUNDS;
  bot.id = 'bot';
  game.players.bot = bot;
  updatePoints(game.players);
}

function beginBetting(game, now) {
  game.phase = 'betting';
  game.gameSessionLastUpdateAt = now;
}

function beginPlaying(game, now, rng) {
  if (!humanEntries(game).length) return false;
  dealInitial(game, rng);
  game.phase = 'playing';
  game.currentRound = 1;
  game.turnEndsAt = now + TURN_MS;
  game.gameSessionLastUpdateAt = now;
  return true;
}

function everyoneDrew(game) {
  const humans = humanEntries(game);
  return humans.length > 0 && humans.every(([, player]) => Number(player.draws) >= Number(game.currentRound));
}

function settle(chat, game, now) {
  updatePoints(game.players);
  const humans = humanEntries(game);
  if (!humans.length) {
    delete chat.game.elementsMiniApp;
    return { changed: true, settled: false };
  }

  const maxPoints = Math.max(...Object.values(game.players).map(player => Number(player.points) || 0));
  const result = [];

  for (const [id, player] of Object.entries(game.players)) {
    const isBot = id === 'bot';
    const bet = isBot ? 0 : Number(player.bet) || 0;
    const points = Number(player.points) || 0;
    const won = points === maxPoints;
    const delta = isBot ? 0 : Math.round(won ? bet * 1.75 : -bet);

    if (!isBot) {
      const member = memberById(chat, id);
      if (member?.game?.inventory) {
        const current = Number(member.game.inventory.gold) || 0;
        member.game.inventory.gold = Math.round(current + delta);
      }
    }

    result.push({
      id: String(id),
      name: playerName(chat, id),
      isBot,
      bet,
      points,
      delta,
      won,
      elements: [...(player.usedItems || [])],
    });
  }

  game.phase = 'finished';
  game.turnEndsAt = null;
  game.finishedAt = now;
  game.gameSessionLastUpdateAt = now;
  game.lastResult = { maxPoints, players: result };
  return { changed: true, settled: true };
}

export function syncElements(chat, options = {}) {
  ensureGameRoot(chat);
  const game = chat.game.elementsMiniApp;
  if (!game) return { changed: false };

  const now = nowValue(options);
  const rng = rngFor(options);

  if (game.phase === 'join' && now >= Number(game.joinEndsAt || 0)) {
    beginBetting(game, now);
    if (now < Number(game.bettingEndsAt || 0)) return { changed: true, event: 'betting' };
  }

  if (game.phase === 'betting' && now >= Number(game.bettingEndsAt || 0)) {
    if (!beginPlaying(game, now, rng)) {
      delete chat.game.elementsMiniApp;
      return { changed: true, event: 'cancelled' };
    }
    return { changed: true, event: 'started' };
  }

  if (game.phase === 'playing' && now >= Number(game.turnEndsAt || 0)) {
    return { ...settle(chat, game, now), event: 'finished' };
  }

  return { changed: false };
}

function playerDto(chat, id, player) {
  return {
    id: String(id),
    name: playerName(chat, id),
    isBot: id === 'bot',
    bet: Number(player.bet) || 0,
    points: Number(player.points) || 0,
    elements: [...(player.usedItems || [])],
    drewThisRound: id === 'bot' ? true : Number(player.draws) >= Number(chat.game.elementsMiniApp?.currentRound || 1),
  };
}

export function getElementsState(chat, userId, options = {}) {
  const now = nowValue(options);
  const game = chat?.game?.elementsMiniApp;
  const member = memberById(chat, userId);
  const gold = Math.max(0, Number(member?.game?.inventory?.gold) || 0);

  if (!game) {
    return {
      phase: 'idle', gold, remainingMs: 0, round: 0, maxRounds: MAX_ROUNDS,
      maxPlayers: MAX_HUMANS, me: { joined: false, bet: 0, points: 0, elements: [], drewThisRound: false },
      players: [], result: null,
    };
  }

  const me = game.players?.[String(userId)] || null;
  const deadline = game.phase === 'join' ? game.joinEndsAt
    : game.phase === 'betting' ? game.bettingEndsAt
      : game.phase === 'playing' ? game.turnEndsAt : null;

  return {
    phase: game.phase,
    gold,
    remainingMs: deadline ? Math.max(0, Number(deadline) - now) : 0,
    round: Number(game.currentRound) || 0,
    maxRounds: MAX_ROUNDS,
    maxPlayers: MAX_HUMANS,
    me: {
      joined: Boolean(me),
      bet: Number(me?.bet) || 0,
      points: Number(me?.points) || 0,
      elements: [...(me?.usedItems || [])],
      drewThisRound: Boolean(me && Number(me.draws) >= Number(game.currentRound || 1)),
    },
    players: Object.entries(game.players || {}).map(([id, player]) => playerDto(chat, id, player)),
    result: game.lastResult || null,
  };
}

function response(chat, userId, ok, reason, options = {}, extra = {}) {
  return { ok, ...(reason ? { reason } : {}), ...extra, elements: getElementsState(chat, userId, options) };
}

export function startElements(chat, userId, options = {}) {
  ensureGameRoot(chat);
  syncElements(chat, options);
  const current = chat.game.elementsMiniApp;
  if (current && ['join', 'betting', 'playing'].includes(current.phase)) {
    return response(chat, userId, false, 'already_started', options);
  }

  const now = nowValue(options);
  chat.game.elementsMiniApp = createGame(userId, now);
  return response(chat, userId, true, null, options, { action: 'start' });
}

export function joinElements(chat, userId, options = {}) {
  syncElements(chat, options);
  const game = chat?.game?.elementsMiniApp;
  if (!game || game.phase !== 'join') return response(chat, userId, false, 'not_join_phase', options);
  if (game.players[String(userId)]) return response(chat, userId, true, null, options, { action: 'join' });
  if (humanEntries(game).length >= MAX_HUMANS) return response(chat, userId, false, 'full', options);

  game.players[String(userId)] = emptyPlayer(userId);
  game.gameSessionLastUpdateAt = nowValue(options);
  return response(chat, userId, true, null, options, { action: 'join' });
}

export function leaveElements(chat, userId, options = {}) {
  syncElements(chat, options);
  const game = chat?.game?.elementsMiniApp;
  if (!game || game.phase !== 'join') return response(chat, userId, false, 'not_join_phase', options);
  if (!game.players[String(userId)]) return response(chat, userId, false, 'not_joined', options);

  delete game.players[String(userId)];
  game.gameSessionLastUpdateAt = nowValue(options);
  if (!humanEntries(game).length) delete chat.game.elementsMiniApp;
  return response(chat, userId, true, null, options, { action: 'leave' });
}

export function setElementsBet(chat, userId, rawBet, options = {}) {
  syncElements(chat, options);
  const game = chat?.game?.elementsMiniApp;
  if (!game || game.phase !== 'betting') return response(chat, userId, false, 'not_betting', options);
  const player = game.players[String(userId)];
  if (!player) return response(chat, userId, false, 'not_joined', options);

  const bet = Number(rawBet);
  const gold = Math.max(0, Number(memberById(chat, userId)?.game?.inventory?.gold) || 0);
  if (!Number.isSafeInteger(bet) || bet < 0) return response(chat, userId, false, 'invalid_bet', options);
  if (bet > gold) return response(chat, userId, false, 'not_enough_gold', options);

  player.bet = bet;
  game.gameSessionLastUpdateAt = nowValue(options);
  return response(chat, userId, true, null, options, { action: 'bet' });
}

export function drawElement(chat, userId, options = {}) {
  const synced = syncElements(chat, options);
  const game = chat?.game?.elementsMiniApp;
  if (!game || game.phase !== 'playing') {
    return response(chat, userId, false, synced.event === 'finished' ? 'finished' : 'not_playing', options);
  }

  const player = game.players[String(userId)];
  if (!player) return response(chat, userId, false, 'not_joined', options);
  if (Number(player.draws) >= Number(game.currentRound)) {
    return response(chat, userId, false, 'already_drew', options);
  }

  const element = randomElement(rngFor(options));
  player.usedItems.push(element);
  player.draws = Number(player.draws || 0) + 1;
  updatePoints(game.players);

  const now = nowValue(options);
  game.gameSessionLastUpdateAt = now;
  game.turnEndsAt = now + TURN_MS;

  if (everyoneDrew(game)) {
    if (game.currentRound >= MAX_ROUNDS) {
      settle(chat, game, now);
    } else {
      game.currentRound += 1;
      game.turnEndsAt = now + TURN_MS;
    }
  }

  return response(chat, userId, true, null, options, { action: 'draw', element });
}

export const elementsConfig = Object.freeze({
  joinMs: JOIN_MS,
  bettingMs: BETTING_MS,
  turnMs: TURN_MS,
  maxRounds: MAX_ROUNDS,
  maxHumans: MAX_HUMANS,
});
