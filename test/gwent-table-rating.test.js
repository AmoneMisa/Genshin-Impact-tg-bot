import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultLoadout } from '../webapp/gwent-builder.js';
import { runGwent, emptyLobby } from '../miniapp/gwentLobby.js';
import { tableEloChanges, collectTableRatingUpdates, collectRatingUpdates, pendingTableUsers } from '../miniapp/gwentRating.js';

// The table rating: its own Elo for tables of three and four whose seats are all taken by people.

const NOW = 8_000_000;
const heroes = { 1: { name: 'Анна', friends: [] }, 2: { name: 'Борис', friends: [] }, 3: { name: 'Вера', friends: [] }, 4: { name: 'Глеб', friends: [] } };
const decks = { 1: defaultLoadout('redania', 'extended'), 2: defaultLoadout('velen', 'extended'), 3: defaultLoadout('toussaint', 'extended'), 4: defaultLoadout('sorceresses', 'extended') };
function ask(lobby, user, mutation, body = null, tableRatings = {}) {
  const people = Object.fromEntries(Object.entries(heroes).map(([id, hero]) => [id, { ...hero, lastSeenAt: 0 }]));
  return runGwent({ lobby, userId: user, name: heroes[user].name, people, mutation, body, now: NOW, rng: () => 0.4, tableRatings });
}
const act = (lobby, user, body, tableRatings) => ask(lobby, user, true, body, tableRatings);

/** A table with `people` people (and the AI in the other seats of a table of `size`). */
function seat(lobby, people, size = 3, { teams = false } = {}) {
  const room = act(lobby, 1, { action: 'invite', table: size, ...(teams ? { teams: true } : {}), loadout: decks[1] }).result.invitation;
  for (let user = 2; user <= people; user += 1) act(lobby, user, { action: 'accept_invite', inviteId: room.id, loadout: decks[user] });
  if (people < size) act(lobby, 1, { action: 'start_table', inviteId: room.id });
  return lobby.gwent.matches[0];
}
const even = { 1: { rating: 1000, games: 20 }, 2: { rating: 1000, games: 20 }, 3: { rating: 1000, games: 20 }, 4: { rating: 1000, games: 20 } };
function finish(match, points, winners) {
  match.state.phase = 'matchOver';
  match.state.points = points; match.state.winners = winners; match.state.pending = null;
}

test('at an even table the winner gains, the last loses, and the middle seat stays at zero', () => {
  const deltas = tableEloChanges([6, 3, 0].map(points => ({ rating: 1000, games: 20, points })));
  assert.ok(deltas[0] > 0 && deltas[2] < 0);
  assert.equal(deltas[1], 0);
  assert.equal(deltas[0], -deltas[2]);
});

test('beating stronger players pays more than beating weaker ones', () => {
  const strongFirst = tableEloChanges([{ rating: 900, games: 20, points: 6 }, { rating: 1200, games: 20, points: 3 }, { rating: 1200, games: 20, points: 0 }]);
  const weakFirst = tableEloChanges([{ rating: 1200, games: 20, points: 6 }, { rating: 900, games: 20, points: 3 }, { rating: 900, games: 20, points: 0 }]);
  assert.ok(strongFirst[0] > weakFirst[0]);
});

test('tied places share the result, and a seat that left counts as the last', () => {
  const tied = tableEloChanges([{ rating: 1000, games: 20, points: 4 }, { rating: 1000, games: 20, points: 4 }, { rating: 1000, games: 20, points: 1 }]);
  assert.equal(tied[0], tied[1]);
  const left = tableEloChanges([{ rating: 1000, games: 20, points: 5, left: true }, { rating: 1000, games: 20, points: 0 }, { rating: 1000, games: 20, points: 1 }]);
  assert.ok(left[0] < 0, 'a leaver loses even with the most points');
});

test('two against two: the winning team gains, the losing team loses, a draw splits it', () => {
  const seats = ['A', 'B', 'A', 'B'].map(team => ({ team, rating: 1000, games: 20 }));
  const win = tableEloChanges(seats.map(seat => ({ ...seat, points: seat.team === 'A' ? 1 : 0 })), { teams: true });
  assert.deepEqual(win, [16, -16, 16, -16]);
  const draw = tableEloChanges(seats.map(seat => ({ ...seat, points: 0 })), { teams: true, draw: true });
  assert.deepEqual(draw, [0, 0, 0, 0]);
  const upset = tableEloChanges([{ team: 'A', rating: 800, games: 20, points: 1 }, { team: 'B', rating: 1200, games: 20, points: 0 }], { teams: true });
  assert.ok(upset[0] > 16, 'the weaker team gains more');
});

test('a table of people is rated; a table with the AI in a seat is not', () => {
  const full = emptyLobby();
  assert.deepEqual(seat(full, 3, 3).tableRated.seated, ['1', '2', '3']);
  const bots = emptyLobby();
  assert.equal(seat(bots, 2, 3).tableRated, undefined);
});

test('a finished rated table is counted once, for every person, and shown on the result', () => {
  const lobby = emptyLobby();
  const match = seat(lobby, 3, 3);
  finish(match, { player: 6, ai: 3, ai2: 0 }, ['player']);
  assert.equal(act(lobby, 1, { action: 'noop' }, {}).tableUpdates.length, 0, 'nobody is counted without their ratings');
  assert.equal(match.tableRated.result, null);
  const counted = ask(lobby, 1, false, null, even);
  assert.deepEqual(counted.tableUpdates.map(update => [update.userId, update.result]), [['1', 'win'], ['2', 'loss'], ['3', 'loss']]);
  assert.ok(counted.tableUpdates[0].after > 1000 && counted.tableUpdates[2].after < 1000);
  const mine = counted.result.match.rated;
  assert.equal(mine.table, true);
  assert.equal(mine.change.after, counted.tableUpdates[0].after);
  assert.ok(ask(lobby, 2, false, null, even).result.match.rated.change.delta <= 0, 'the others see their own change');
  assert.equal(ask(lobby, 1, false, null, even).tableUpdates.length, 0, 'counted only once');
});

test('a table with the AI shows no rating on its result', () => {
  const lobby = emptyLobby();
  const match = seat(lobby, 2, 3);
  finish(match, { player: 6, ai: 3, ai2: 0 }, ['player']);
  assert.equal(ask(lobby, 1, false, null, even).result.match.rated, null);
});

test('a player who left is counted as the last, even when the table went on', () => {
  const lobby = emptyLobby();
  const match = seat(lobby, 3, 3);
  match.players[0] = 'bot:left0'; match.names[0] = 'Анна (бот)';
  finish(match, { player: 6, ai: 3, ai2: 0 }, ['player']);
  const anna = collectTableRatingUpdates(lobby, even).find(update => update.userId === '1');
  assert.equal(anna.result, 'loss');
  assert.ok(anna.after < 1000);
});

test('a table everybody left is not counted', () => {
  const lobby = emptyLobby();
  const match = seat(lobby, 3, 3);
  match.state.phase = 'matchOver'; match.state.winners = []; match.endKind = 'abandoned';
  assert.deepEqual(collectTableRatingUpdates(lobby, even), []);
  assert.deepEqual(collectTableRatingUpdates(lobby, even), [], 'and it stays uncounted');
});

test('a two-against-two table is rated by team', () => {
  const lobby = emptyLobby();
  const match = seat(lobby, 4, 4, { teams: true });
  assert.ok(match.tableRated);
  const seats = ['player', 'ai', 'ai2', 'ai3'];
  const winners = seats.filter(name => match.state.teams[name] === 'A');
  finish(match, {}, winners);
  const updates = collectTableRatingUpdates(lobby, even);
  assert.equal(updates.length, 4);
  match.players.forEach((id, index) => assert.equal(updates.find(update => update.userId === id).result, winners.includes(seats[index]) ? 'win' : 'loss'));
});

test('duel ratings ignore tables, and the people of an uncounted table are looked up', () => {
  const lobby = emptyLobby();
  const match = seat(lobby, 3, 3);
  finish(match, { player: 6, ai: 3, ai2: 0 }, ['player']);
  assert.deepEqual(collectRatingUpdates(lobby), []);
  assert.deepEqual(pendingTableUsers(lobby, 2).sort(), ['1', '2', '3']);
  collectTableRatingUpdates(lobby, even);
  assert.deepEqual(pendingTableUsers(lobby, 2), []);
});
