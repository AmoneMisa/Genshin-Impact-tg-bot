import crypto from 'crypto';
import cardsDictionary from '../dictionaries/pointCards.js';
import getPoints from '../functions/game/point21/getPoints.js';

const LOBBY_MS = 25_000;
const TURN_MS = 20_000;
const MAX_HUMANS = 4;

function nowValue(options = {}) {
  return Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
}

function randomInt(options = {}) {
  return options.randomInt || ((min, max) => crypto.randomInt(min, max + 1));
}

function ensureChatGame(chat) {
  if (!chat.game || typeof chat.game !== 'object') chat.game = {};
  return chat.game;
}

function memberById(chat, userId) {
  return Array.isArray(chat?.members)
    ? chat.members.find(member => String(member.userId) === String(userId))
    : null;
}

function displayName(chat, userId) {
  if (String(userId) === 'bot') return 'Всемогущий';
  const member = memberById(chat, userId);
  const user = member?.userChatData?.user || {};
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  if (user.username) return `@${user.username}`;
  return fullName || `Игрок ${userId}`;
}

function emptyPlayer(bet = 0) {
  return { bet, usedItems: [], isPass: false };
}

function newGame(userId, now) {
  return {
    phase: 'lobby',
    createdAt: now,
    lobbyEndsAt: now + LOBBY_MS,
    roundEndsAt: null,
    gameSessionLastUpdateAt: now,
    players: {
      bot: emptyPlayer(0),
      [String(userId)]: emptyPlayer(0),
    },
    usedItems: [],
    lastResult: null,
  };
}

function deck() {
  const cards = [];
  for (const value of cardsDictionary.values) {
    for (const suit of cardsDictionary.suits) cards.push(`${value.name} ${suit}`);
  }
  return cards;
}

function drawCard(game, rng) {
  const available = deck().filter(card => !game.usedItems.includes(card));
  if (!available.length) return null;
  const index = rng(0, available.length - 1);
  if (!Number.isInteger(index) || index < 0 || index >= available.length) {
    throw new Error(`Point21 RNG returned invalid index ${index}`);
  }
  const card = available[index];
  game.usedItems.push(card);
  return card;
}

function giveCard(game, playerId, rng) {
  const player = game.players[String(playerId)];
  if (!player) return null;
  const card = drawCard(game, rng);
  if (card) player.usedItems.push(card);
  return card;
}

function humanEntries(game) {
  return Object.entries(game?.players || {}).filter(([id]) => id !== 'bot');
}

function allHumansPassed(game) {
  const humans = humanEntries(game);
  return humans.length > 0 && humans.every(([, player]) => Boolean(player.isPass));
}

function beginRound(game, now, rng) {
  const humans = humanEntries(game);
  if (!humans.length) return false;

  game.usedItems = [];
  for (const player of Object.values(game.players)) {
    player.usedItems = [];
    player.isPass = false;
  }

  for (const playerId of Object.keys(game.players)) {
    giveCard(game, playerId, rng);
    giveCard(game, playerId, rng);
    if (playerId !== 'bot' && getPoints(game.players[playerId]) >= 21) {
      game.players[playerId].isPass = true;
    }
  }

  game.phase = 'playing';
  game.gameSessionLastUpdateAt = now;
  game.roundEndsAt = now + TURN_MS;
  return true;
}

function runBot(game, rng) {
  const bot = game.players.bot;
  if (!bot) return;

  const humanPoints = humanEntries(game)
    .map(([, player]) => getPoints(player) || 0)
    .filter(points => points <= 21);
  const target = humanPoints.length ? Math.max(...humanPoints) : 0;
  let points = getPoints(bot) || 0;

  while (points < 21 && points <= target) {
    if (!giveCard(game, 'bot', rng)) break;
    points = getPoints(bot) || 0;
  }
  bot.isPass = true;
}

function settleGame(chat, game, now, rng) {
  const humans = humanEntries(game);
  if (!humans.length) {
    delete chat.game.pointsMiniApp;
    return { changed: true, settled: false };
  }

  runBot(game, rng);

  const scores = Object.values(game.players)
    .map(player => getPoints(player) || 0)
    .filter(points => points <= 21);
  const maxPoints = scores.length ? Math.max(...scores) : 0;
  const result = [];

  for (const [playerId, player] of Object.entries(game.players)) {
    const points = getPoints(player) || 0;
    const bet = Number(player.bet) || 0;
    let delta = 0;
    let won = false;

    if (playerId !== 'bot') {
      if (points === 21) {
        delta = Math.round(bet * 3);
        won = true;
      } else if (points === maxPoints && points <= 21) {
        delta = Math.round(bet * 1.8);
        won = true;
      } else {
        delta = -bet;
      }

      const member = memberById(chat, playerId);
      if (member?.game?.inventory) {
        const current = Number(member.game.inventory.gold) || 0;
        member.game.inventory.gold = Math.round(current + delta);
      }
    }

    result.push({
      id: String(playerId),
      name: displayName(chat, playerId),
      cards: [...(player.usedItems || [])],
      points,
      bet,
      delta,
      won,
      exact21: points === 21,
      isBot: playerId === 'bot',
    });
  }

  game.phase = 'finished';
  game.finishedAt = now;
  game.roundEndsAt = null;
  game.gameSessionLastUpdateAt = now;
  game.lastResult = { maxPoints, players: result };
  return { changed: true, settled: true };
}

export function syncPoint21(chat, options = {}) {
  ensureChatGame(chat);
  const game = chat.game.pointsMiniApp;
  if (!game) return { changed: false };

  const now = nowValue(options);
  const rng = randomInt(options);

  if (game.phase === 'lobby' && now >= Number(game.lobbyEndsAt || 0)) {
    if (!beginRound(game, now, rng)) {
      delete chat.game.pointsMiniApp;
      return { changed: true, event: 'cancelled' };
    }
    if (allHumansPassed(game)) {
      return { ...settleGame(chat, game, now, rng), event: 'finished' };
    }
    return { changed: true, event: 'started' };
  }

  if (game.phase === 'playing' && now >= Number(game.roundEndsAt || 0)) {
    return { ...settleGame(chat, game, now, rng), event: 'finished' };
  }

  return { changed: false };
}

function playerDto(chat, id, player) {
  return {
    id: String(id),
    name: displayName(chat, id),
    isBot: String(id) === 'bot',
    bet: Number(player?.bet) || 0,
    cards: [...(player?.usedItems || [])],
    points: getPoints(player) || 0,
    passed: Boolean(player?.isPass),
  };
}

export function getPoint21State(chat, userId, options = {}) {
  const now = nowValue(options);
  const game = chat?.game?.pointsMiniApp;
  const member = memberById(chat, userId);
  const gold = Math.max(0, Number(member?.game?.inventory?.gold) || 0);

  if (!game) {
    return {
      phase: 'idle',
      gold,
      remainingMs: 0,
      me: { joined: false, bet: 0, cards: [], points: 0, passed: false },
      players: [],
      result: null,
    };
  }

  const me = game.players?.[String(userId)] || null;
  const deadline = game.phase === 'lobby' ? game.lobbyEndsAt : game.phase === 'playing' ? game.roundEndsAt : null;

  return {
    phase: game.phase || 'idle',
    gold,
    remainingMs: deadline ? Math.max(0, Number(deadline) - now) : 0,
    maxPlayers: MAX_HUMANS,
    me: {
      joined: Boolean(me),
      bet: Number(me?.bet) || 0,
      cards: [...(me?.usedItems || [])],
      points: getPoints(me) || 0,
      passed: Boolean(me?.isPass),
    },
    players: Object.entries(game.players || {}).map(([id, player]) => playerDto(chat, id, player)),
    result: game.lastResult || null,
  };
}

function response(chat, userId, ok, reason, options = {}, extra = {}) {
  return {
    ok,
    ...(reason ? { reason } : {}),
    ...extra,
    point21: getPoint21State(chat, userId, options),
  };
}

export function startPoint21(chat, userId, options = {}) {
  ensureChatGame(chat);
  syncPoint21(chat, options);
  const current = chat.game.pointsMiniApp;
  if (current && ['lobby', 'playing'].includes(current.phase)) {
    return response(chat, userId, false, 'already_started', options);
  }

  const now = nowValue(options);
  chat.game.pointsMiniApp = newGame(userId, now);
  return response(chat, userId, true, null, options, { action: 'start' });
}

export function joinPoint21(chat, userId, options = {}) {
  syncPoint21(chat, options);
  const game = chat?.game?.pointsMiniApp;
  if (!game || game.phase !== 'lobby') return response(chat, userId, false, 'not_lobby', options);
  if (game.players[String(userId)]) return response(chat, userId, true, null, options, { action: 'join' });
  if (humanEntries(game).length >= MAX_HUMANS) return response(chat, userId, false, 'full', options);

  game.players[String(userId)] = emptyPlayer(0);
  game.gameSessionLastUpdateAt = nowValue(options);
  return response(chat, userId, true, null, options, { action: 'join' });
}

export function leavePoint21(chat, userId, options = {}) {
  syncPoint21(chat, options);
  const game = chat?.game?.pointsMiniApp;
  if (!game || game.phase !== 'lobby') return response(chat, userId, false, 'not_lobby', options);
  if (!game.players[String(userId)]) return response(chat, userId, false, 'not_joined', options);

  delete game.players[String(userId)];
  game.gameSessionLastUpdateAt = nowValue(options);
  if (!humanEntries(game).length) delete chat.game.pointsMiniApp;
  return response(chat, userId, true, null, options, { action: 'leave' });
}

export function setPoint21Bet(chat, userId, rawBet, options = {}) {
  syncPoint21(chat, options);
  const game = chat?.game?.pointsMiniApp;
  if (!game || game.phase !== 'lobby') return response(chat, userId, false, 'not_lobby', options);
  const player = game.players[String(userId)];
  if (!player) return response(chat, userId, false, 'not_joined', options);

  const bet = Number(rawBet);
  const member = memberById(chat, userId);
  const gold = Math.max(0, Number(member?.game?.inventory?.gold) || 0);
  if (!Number.isSafeInteger(bet) || bet < 0) return response(chat, userId, false, 'invalid_bet', options);
  if (bet > gold) return response(chat, userId, false, 'not_enough_gold', options);

  player.bet = bet;
  game.gameSessionLastUpdateAt = nowValue(options);
  return response(chat, userId, true, null, options, { action: 'bet' });
}

export function takePoint21Card(chat, userId, options = {}) {
  const synced = syncPoint21(chat, options);
  const game = chat?.game?.pointsMiniApp;
  if (!game || game.phase !== 'playing') {
    return response(chat, userId, false, synced.event === 'finished' ? 'finished' : 'not_playing', options);
  }

  const player = game.players[String(userId)];
  if (!player) return response(chat, userId, false, 'not_joined', options);
  if (player.isPass) return response(chat, userId, false, 'passed', options);

  const rng = randomInt(options);
  const card = giveCard(game, String(userId), rng);
  if (!card) return response(chat, userId, false, 'deck_empty', options);

  const now = nowValue(options);
  const points = getPoints(player) || 0;
  if (points >= 21) player.isPass = true;
  game.gameSessionLastUpdateAt = now;
  game.roundEndsAt = now + TURN_MS;

  if (allHumansPassed(game)) settleGame(chat, game, now, rng);
  return response(chat, userId, true, null, options, { action: 'card', card });
}

export function passPoint21(chat, userId, options = {}) {
  const synced = syncPoint21(chat, options);
  const game = chat?.game?.pointsMiniApp;
  if (!game || game.phase !== 'playing') {
    return response(chat, userId, false, synced.event === 'finished' ? 'finished' : 'not_playing', options);
  }

  const player = game.players[String(userId)];
  if (!player) return response(chat, userId, false, 'not_joined', options);
  if (player.isPass) return response(chat, userId, false, 'passed', options);

  const now = nowValue(options);
  player.isPass = true;
  game.gameSessionLastUpdateAt = now;
  game.roundEndsAt = now + TURN_MS;
  if (allHumansPassed(game)) settleGame(chat, game, now, randomInt(options));
  return response(chat, userId, true, null, options, { action: 'pass' });
}

export const point21Config = Object.freeze({ lobbyMs: LOBBY_MS, turnMs: TURN_MS, maxHumans: MAX_HUMANS });
