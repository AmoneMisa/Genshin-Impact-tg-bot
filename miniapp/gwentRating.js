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
        if (a.userId === b.userId || (a.ruleset || 'classic') !== (b.ruleset || 'classic')) continue;
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
    if (match.table || !match.rated || match.ratingApplied || match.state.phase !== 'matchOver') continue;
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

/** Elo change of every seat of a table. `seats`: `{ rating, games, points, team? }`; a seat that left has `left: true` and counts as last. */
export function tableEloChanges(seats, { teams = false, draw = false } = {}) {
  if (teams) {
    const average = team => seats.filter(seat => seat.team === team).reduce((all, seat, _, list) => all + seat.rating / list.length, 0);
    const top = Math.max(...seats.filter(seat => !seat.left).map(seat => seat.points), -Infinity);
    return seats.map(seat => {
      const own = average(seat.team), other = average(seat.team === 'A' ? 'B' : 'A');
      const score = seat.left ? 0 : draw ? 0.5 : seat.points === top ? 1 : 0;
      return Math.round(kFactor(seat.games) * (score - expectedScore(own, other)));
    });
  }
  const standing = seat => (seat.left ? -1 : seat.points);
  return seats.map((seat, i) => {
    const others = seats.filter((_, j) => j !== i);
    const score = others.reduce((all, other) => all + (seat.left ? 0 : standing(seat) > standing(other) ? 1 : standing(seat) === standing(other) ? 0.5 : 0), 0) / others.length;
    const expected = others.reduce((all, other) => all + expectedScore(seat.rating, other.rating), 0) / others.length;
    return Math.round(kFactor(seat.games) * (score - expected));
  });
}

/** The people (ids) of tables that are rated and not counted yet, among which `userId` sits: their table ratings are needed to count. */
export function pendingTableUsers(lobby, userId) {
  const ids = new Set();
  for (const match of lobby.gwent.matches) {
    if (match.tableRated && !match.tableRated.result && match.tableRated.seated.includes(String(userId))) match.tableRated.seated.forEach(id => ids.add(id));
  }
  return [...ids];
}

/**
 * Rating changes of finished rated tables (every seat taken by a person when the table started) that were not counted yet.
 * `ratings` maps a user id to `{ rating, games }`; a table whose people are not all listed waits for the next request.
 * Whoever left (the AI took the seat) counts as the last. A table where everybody left is not counted.
 */
export function collectTableRatingUpdates(lobby, ratings = {}) {
  const updates = [];
  for (const match of lobby.gwent.matches) {
    const rated = match.tableRated;
    if (!match.table || !rated || rated.result || match.state.phase !== 'matchOver') continue;
    if (match.endKind === 'abandoned') { rated.result = {}; continue; }
    if (!rated.seated.every(id => ratings[id])) continue;
    const state = match.state, seats = state.seats || ['player', 'ai', 'ai2', 'ai3'].slice(0, match.players.length);
    const teams = Boolean(state.teams);
    const seated = rated.seated.map((id, index) => {
      const seat = seats[index];
      return { id, name: match.names[index].replace(/ \(бот\)$/, ''), rating: ratings[id].rating, games: ratings[id].games, left: match.players[index] !== id,
        team: teams ? state.teams[seat] : undefined, points: teams ? (state.winners.includes(seat) ? 1 : 0) : state.points[seat], won: state.winners.includes(seat) };
    });
    const deltas = tableEloChanges(seated, { teams, draw: teams && state.winners.length === 0 });
    rated.result = {};
    seated.forEach((seat, i) => {
      const after = Math.max(MIN_RATING, seat.rating + deltas[i]);
      rated.result[seat.id] = { before: seat.rating, after, delta: after - seat.rating };
      const result = !seat.left && seat.won ? 'win' : !seat.left && state.winners.length === 0 ? 'draw' : 'loss';
      updates.push({ userId: seat.id, name: seat.name, before: seat.rating, after, result, matchId: match.id });
    });
  }
  return updates;
}
