import GwentRating from '../db/models/GwentRating.js';
import GwentTableRating from '../db/models/GwentTableRating.js';
import { DEFAULT_RATING } from './gwentRating.js';

// Storage of Gwent ratings and the leaderboard. Updates are applied under the lobby lock, one finished
// game at a time, so a rating is always read, changed and written by a single request.

const BOARD_SIZE = 50;
const BOARD_CACHE_MS = 15_000;
const boards = { duel: { at: 0, rows: [] }, table: { at: 0, rows: [] } };
const modelOf = kind => (kind === 'table' ? GwentTableRating : GwentRating);

const emptyRecord = () => ({ rating: DEFAULT_RATING, peak: DEFAULT_RATING, games: 0, wins: 0, losses: 0, draws: 0 });
const view = doc => ({ rating: doc.rating, peak: doc.peak, games: doc.games, wins: doc.wins, losses: doc.losses, draws: doc.draws });

/** A player's rating record (the starting rating for a player who has none). */
export async function getRating(userId, kind = 'duel') {
  const doc = await modelOf(kind).findOne({ userId: Number(userId) }).lean();
  return doc ? view(doc) : emptyRecord();
}

/** Stores the changes `collectRatingUpdates` reported. Throws when the database refuses, so the caller keeps the game uncounted. */
export async function applyRatingUpdates(updates, now = Date.now(), kind = 'duel') {
  if (!updates.length) return;
  const operations = [];
  for (const update of updates) {
    const current = await getRating(update.userId, kind);
    const wins = current.wins + (update.result === 'win' ? 1 : 0), losses = current.losses + (update.result === 'loss' ? 1 : 0), draws = current.draws + (update.result === 'draw' ? 1 : 0);
    operations.push({ updateOne: { filter: { userId: Number(update.userId) }, upsert: true,
      update: { $set: { name: update.name, rating: update.after, peak: Math.max(current.peak, update.after), games: current.games + 1, wins, losses, draws, updatedAt: now } } } });
  }
  await modelOf(kind).bulkWrite(operations);
  boards[kind].at = 0;
}

/** The best players and the place of `userId` (null when they have no rated game). */
export async function leaderboard(userId, now = Date.now(), kind = 'duel') {
  const Model = modelOf(kind), board = boards[kind];
  if (now - board.at >= BOARD_CACHE_MS) {
    const rows = await Model.find({ games: { $gte: 1 } }).sort({ rating: -1, games: -1 }).limit(BOARD_SIZE).lean();
    boards[kind] = { at: now, rows: rows.map((row, index) => ({ rank: index + 1, userId: String(row.userId), name: row.name, rating: row.rating, games: row.games, wins: row.wins, losses: row.losses, draws: row.draws })) };
  }
  const mine = await Model.findOne({ userId: Number(userId), games: { $gte: 1 } }).lean();
  const rank = mine ? 1 + await Model.countDocuments({ games: { $gte: 1 }, rating: { $gt: mine.rating } }) : null;
  return { kind, rows: boards[kind].rows.map(row => ({ ...row, me: row.userId === String(userId) })), me: mine ? { ...view(mine), rank } : null };
}
