import Chat from '../db/models/Chat.js';
import ArenaTempBot from '../db/models/ArenaTempBot.js';
import getSession from '../functions/getters/getSession.js';
import generateArenaBot from '../functions/game/arena/generateArenaBot.js';
import getBattleResult from '../functions/game/arena/getBattleResult.js';
import calculatePoints from '../functions/game/arena/calculatePoints.js';
import calcGearScore from '../functions/game/player/calcGearScore.js';
import updateRank from '../functions/game/arena/updateRank.js';
import {
  adjustArenaRating,
  getArenaRatingDoc,
  getArenaRatingSnapshot,
  getArenaRatingTable,
} from '../functions/game/arena/ratingStore.js';

const MODES = new Set(['common', 'expansion']);
const MAX_DEFENDERS = 6;
const MAX_RATING_DIFF = 0.15;

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clone(value) {
  const plain = typeof value?.toObject === 'function' ? value.toObject() : value;
  return JSON.parse(JSON.stringify(plain));
}

function validateMode(mode) {
  if (!MODES.has(mode)) {
    const error = new Error('arena mode must be common or expansion');
    error.status = 400;
    throw error;
  }
}

function chanceField(mode) {
  return mode === 'common' ? 'arenaChances' : 'arenaExpansionChances';
}

function playerName(session) {
  const user = session?.userChatData?.user || {};
  return user.first_name || user.username || `Игрок ${session?.userId || user.id || ''}`.trim();
}

function className(game) {
  return game?.gameClass?.stats?.translateName
    || game?.gameClass?.stats?.name
    || game?.gameClass?.name
    || 'Без класса';
}

function safeGearScore(game) {
  try {
    return number(calcGearScore(game));
  } catch {
    return 0;
  }
}

function defenderDto({ id, kind, name, rating, session, bot }) {
  const game = kind === 'bot' ? bot : session?.game;
  const level = kind === 'bot' ? number(bot?.stats?.lvl, 1) : number(game?.stats?.lvl, 1);
  return {
    id,
    kind,
    name,
    rating: number(rating, 1000),
    level,
    className: className(game),
    gearScore: safeGearScore(game),
  };
}

async function ensureBots(attackerRating, minimum = 4) {
  const lower = Math.max(0, Math.floor(attackerRating * (1 - MAX_RATING_DIFF)));
  const upper = Math.ceil(attackerRating * (1 + MAX_RATING_DIFF));
  let bots = await ArenaTempBot.find({ rating: { $gte: lower, $lte: upper } }).limit(MAX_DEFENDERS);

  while (bots.length < minimum) {
    const generated = generateArenaBot(attackerRating);
    generated.rating = Math.min(upper, Math.max(lower, number(generated.rating, attackerRating)));
    const created = await ArenaTempBot.create(generated);
    bots.push(created);
  }

  return bots;
}

async function resolveExpansionChat(userId, preferredChatId) {
  if (preferredChatId != null) {
    const chat = await Chat.findOne({ chatId: Number(preferredChatId), 'members.userId': Number(userId) });
    if (chat) return chat.chatId;
  }

  const chat = await Chat.findOne({ 'members.userId': Number(userId) }).sort({ updatedAt: -1 });
  return chat?.chatId ?? null;
}

async function loadPlayerDefender(mode, currentChatId, userId) {
  const ratingDoc = await getArenaRatingDoc(userId, mode, currentChatId, { create: false });
  if (!ratingDoc) return null;

  const sourceChatId = mode === 'common'
    ? Number(currentChatId)
    : await resolveExpansionChat(userId, ratingDoc.chatId);
  if (sourceChatId == null) return null;

  try {
    const session = await getSession(sourceChatId, userId);
    return { session, sourceChatId, rating: number(ratingDoc.rating, 1000) };
  } catch {
    return null;
  }
}

async function buildDefenderList(session, chatId, userId, mode, attackerRating) {
  const table = await getArenaRatingTable(mode, chatId);
  const playerCandidates = table
    .filter(doc => String(doc.userId) !== String(userId))
    .filter(doc => Math.abs(number(doc.rating, 1000) - attackerRating) / Math.max(1, attackerRating) <= MAX_RATING_DIFF)
    .slice(0, MAX_DEFENDERS);

  const defenders = [];
  for (const doc of playerCandidates) {
    const loaded = await loadPlayerDefender(mode, chatId, doc.userId);
    if (!loaded) continue;
    defenders.push(defenderDto({
      id: `player:${doc.userId}`,
      kind: 'player',
      name: playerName(loaded.session),
      rating: loaded.rating,
      session: loaded.session,
    }));
    if (defenders.length >= MAX_DEFENDERS) break;
  }

  if (defenders.length < MAX_DEFENDERS) {
    const bots = await ensureBots(attackerRating, MAX_DEFENDERS - defenders.length);
    for (const bot of bots) {
      defenders.push(defenderDto({
        id: `bot:${bot._id}`,
        kind: 'bot',
        name: `Игрок №${bot.name}`,
        rating: bot.rating,
        bot,
      }));
      if (defenders.length >= MAX_DEFENDERS) break;
    }
  }

  return defenders;
}

export async function getArenaState(session, chatId, userId, mode = 'common') {
  validateMode(mode);
  const snapshot = await getArenaRatingSnapshot(userId, mode, chatId);
  const rank = await updateRank(userId, mode, chatId);
  const defenders = await buildDefenderList(session, chatId, userId, mode, snapshot.rating);
  const chanceKey = chanceField(mode);
  const table = await getArenaRatingTable(mode, chatId);

  return {
    mode,
    rating: snapshot.rating,
    rank,
    position: snapshot.position,
    totalPlayers: snapshot.total,
    chances: number(session?.game?.[chanceKey]),
    maxChances: mode === 'common' ? 15 : 10,
    defenders,
    leaderboard: table.slice(0, 10).map((doc, index) => ({
      position: index + 1,
      userId: doc.userId,
      rating: number(doc.rating, 1000),
      isCurrentUser: String(doc.userId) === String(userId),
    })),
  };
}

async function resolveDefender(mode, chatId, rawId) {
  const [kind, identifier] = String(rawId || '').split(':');
  if (kind === 'bot') {
    const bot = await ArenaTempBot.findById(identifier);
    return bot ? { kind: 'bot', bot, rating: number(bot.rating, 1000) } : null;
  }

  if (kind === 'player') {
    const userId = Number(identifier);
    if (!Number.isFinite(userId)) return null;
    const loaded = await loadPlayerDefender(mode, chatId, userId);
    return loaded ? { kind: 'player', userId, ...loaded } : null;
  }

  return null;
}

export async function attackArena(session, chatId, userId, mode, defenderId) {
  validateMode(mode);
  const chanceKey = chanceField(mode);
  const chances = number(session?.game?.[chanceKey]);
  if (chances < 1) {
    return { ok: false, reason: 'no_chances', arena: await getArenaState(session, chatId, userId, mode) };
  }

  const defender = await resolveDefender(mode, chatId, defenderId);
  if (!defender) {
    return { ok: false, reason: 'stale_defender', arena: await getArenaState(session, chatId, userId, mode) };
  }
  if (defender.kind === 'player' && String(defender.userId) === String(userId)) {
    return { ok: false, reason: 'self_attack', arena: await getArenaState(session, chatId, userId, mode) };
  }

  const attackerRating = (await getArenaRatingSnapshot(userId, mode, chatId)).rating;
  const defenderRating = defender.rating;
  const ratingDifference = Math.abs(defenderRating - attackerRating) / Math.max(1, attackerRating);
  if (defender.kind === 'player' && ratingDifference > MAX_RATING_DIFF) {
    return { ok: false, reason: 'stale_defender', arena: await getArenaState(session, chatId, userId, mode) };
  }

  const attackerCombat = clone(session);
  const defenderCombat = defender.kind === 'bot' ? clone(defender.bot) : clone(defender.session);
  const [battleResult, defenderHpPercent] = getBattleResult(
    attackerCombat,
    defenderCombat,
    defender.kind === 'bot'
  );
  const points = calculatePoints(
    attackerCombat,
    defenderCombat,
    mode,
    chatId,
    defender.kind === 'bot',
    { attacker: attackerRating, defender: defenderRating }
  );

  session.game[chanceKey] = Math.max(0, chances - 1);

  let ratingDelta = 0;
  if (battleResult === 0) {
    ratingDelta = points;
  } else if (battleResult === 1) {
    ratingDelta = -points;
  }

  if (ratingDelta !== 0) {
    await adjustArenaRating(userId, mode, chatId, ratingDelta);
    if (defender.kind === 'player') {
      await adjustArenaRating(defender.userId, mode, defender.sourceChatId, -ratingDelta);
    }
  }

  return {
    ok: true,
    result: battleResult === 0 ? 'win' : battleResult === 1 ? 'lose' : 'draw',
    points,
    ratingDelta,
    defenderHpPercent: Math.max(0, number(defenderHpPercent)),
    defender: defender.kind === 'bot'
      ? defenderDto({ id: defenderId, kind: 'bot', name: `Игрок №${defender.bot.name}`, rating: defenderRating, bot: defender.bot })
      : defenderDto({ id: defenderId, kind: 'player', name: playerName(defender.session), rating: defenderRating, session: defender.session }),
    arena: await getArenaState(session, chatId, userId, mode),
  };
}
