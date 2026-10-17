// Ratings for Gwent games found through the public queue (Elo), and strength-based pairing.
// Pure functions: the lobby decides when to use them, the route stores the result.

export const DEFAULT_RATING = 1000;
export const MIN_RATING = 100;
const BASE_GAP = 150;       // rating difference accepted straight away
const GAP_PER_SECOND = 10;  // the accepted difference grows while a player waits

/** The rating difference a player who has waited `waitedMs` accepts in an opponent. */
export function pairingGap(waitedMs) {
  return BASE_GAP + Math.floor(Math.max(0, waitedMs) / 1000) * GAP_PER_SECOND;
}

/** Elo's expected score of a player rated `own` against `other`. */
export function expectedScore(own, other) {
  return 1 / (1 + 10 ** ((other - own) / 400));
}

/** New players move fast, established players slowly. */
export function kFactor(games) {
  return games < 10 ? 40 : games < 40 ? 32 : 24;
}

/** Rating change of the first player of a finished game and of the second. `outcome`: 'first' | 'second' | 'draw'. */
export function eloChange(first, second, outcome) {
  const score = outcome === 'first' ? 1 : outcome === 'second' ? 0 : 0.5;
  const expected = expectedScore(first.rating, second.rating);
  const delta = (own, kScore, kExpected) => Math.round(kFactor(own.games) * (kScore - kExpected));
  return [delta(first, score, expected), delta(second, 1 - score, 1 - expected)];
}

/**
 * Pairs waiting players whose ratings are close enough; the longer one of the two has waited, the wider
 * the accepted gap. `start(a, b)` creates the match and removes both from `data.queue`.
 */
export function pairQueue(data, now, start) {
  for (let guard = 0; guard < 50 && data.queue.length >= 2; guard += 1) {
    let best = null;
    for (let i = 0; i < data.queue.length; i += 1) {
      for (let j = i + 1; j < data.queue.length; j += 1) {
        const a = data.queue[i], b = data.queue[j];
        if (a.userId === b.userId) continue;
        const diff = Math.abs((a.rating ?? DEFAULT_RATING) - (b.rating ?? DEFAULT_RATING));
        const gap = Math.max(pairingGap(now - (a.joinedAt ?? a.seenAt)), pairingGap(now - (b.joinedAt ?? b.seenAt)));
        if (diff <= gap && (!best || diff < best.diff)) best = { a, b, diff };
      }
    }
    if (!best) return;
    start(best.a, best.b);
  }
}

/**
 * Rating changes of rated matches that have finished and were not counted yet. Marks each match as
 * counted and keeps the change on it for the result screen. Returns one record per player.
 */
export function collectRatingUpdates(lobby) {
  const updates = [];
  for (const match of lobby.gwent.matches) {
    if (!match.rated || match.ratingApplied || match.state.phase !== 'matchOver') continue;
    const outcome = match.state.winner === 'player' ? 'first' : match.state.winner === 'ai' ? 'second' : 'draw';
    const [one, two] = match.players;
    const before = [match.rated.ratings[0], match.rated.ratings[1]], games = match.rated.games;
    const [d1, d2] = eloChange({ rating: before[0], games: games[0] }, { rating: before[1], games: games[1] }, outcome);
    const after = [Math.max(MIN_RATING, before[0] + d1), Math.max(MIN_RATING, before[1] + d2)];
    match.ratingApplied = true;
    match.ratingResult = { delta: [after[0] - before[0], after[1] - before[1]], after };
    const result = side => outcome === 'draw' ? 'draw' : (outcome === 'first') === (side === 0) ? 'win' : 'loss';
    updates.push({ userId: one, name: match.names[0], before: before[0], after: after[0], result: result(0), matchId: match.id });
    updates.push({ userId: two, name: match.names[1], before: before[1], after: after[1], result: result(1), matchId: match.id });
  }
  return updates;
}
