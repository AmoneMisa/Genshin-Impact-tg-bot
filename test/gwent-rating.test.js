import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultLoadout } from '../webapp/gwent-builder.js';
import { runGwent, emptyLobby } from '../miniapp/gwentLobby.js';
import { DEFAULT_RATING, MIN_RATING, pairingGap, expectedScore, kFactor, eloChange, collectRatingUpdates } from '../miniapp/gwentRating.js';

const NOW = 9_000_000;
const deck = defaultLoadout();
const heroes = { 1: 'Анна', 2: 'Борис', 3: 'Вера', 4: 'Глеб' };
const world = () => ({ lobby: emptyLobby() });
const people = () => Object.fromEntries(Object.entries(heroes).map(([id, name]) => [id, { name, friends: Object.keys(heroes).filter(other => other !== id) }]));
const ask = (w, user, mutation, body, now = NOW, extra = {}) => runGwent({ lobby: w.lobby, userId: user, name: heroes[user], people: people(user), mutation, body, now, rng: () => 0.4, ...extra });
const join = (w, user, rating, games = 0, now = NOW) => ask(w, user, true, { action: 'join', loadout: deck }, now, { rating: { rating, games } });
const poll = (w, user, now) => ask(w, user, false, null, now);

test('Elo: equal players trade the same points, an upset pays more, and new players move faster', () => {
  assert.equal(kFactor(0), 40); assert.equal(kFactor(20), 32); assert.equal(kFactor(100), 24);
  assert.equal(expectedScore(1000, 1000), 0.5);
  assert.deepEqual(eloChange({ rating: 1000, games: 50 }, { rating: 1000, games: 50 }, 'first'), [12, -12]);
  const [favourite, underdog] = eloChange({ rating: 1400, games: 50 }, { rating: 1000, games: 50 }, 'second');
  assert.ok(favourite < -12 && underdog > 12, 'a favourite who loses gives away more than a coin flip');
  assert.deepEqual(eloChange({ rating: 1000, games: 50 }, { rating: 1000, games: 50 }, 'draw'), [0, 0]);
  const [newPlayer, veteran] = eloChange({ rating: 1000, games: 0 }, { rating: 1000, games: 50 }, 'first');
  assert.ok(newPlayer > Math.abs(veteran));
});

test('the accepted rating gap grows with waiting time', () => {
  assert.equal(pairingGap(0), 150);
  assert.ok(pairingGap(30_000) > pairingGap(10_000));
  assert.equal(pairingGap(-5), 150);
});

test('players of a similar rating are paired at once, far ones wait and are paired as the gap widens', () => {
  const w = world();
  assert.equal(join(w, 1, 1000).result.searching, true);
  const far = join(w, 2, 1500, 0, NOW + 1000);
  assert.equal(far.result.searching, true, 'a 500 point difference is too much at first');
  assert.equal(w.lobby.gwent.matches.length, 0);
  for (const seconds of [10, 20, 30]) poll(w, 1, NOW + seconds * 1000), poll(w, 2, NOW + seconds * 1000 + 100);
  assert.equal(w.lobby.gwent.matches.length, 0, 'still too far apart after 30 s');
  // After 40 s the accepted gap is 150 + 400 = 550, so the waiting players are matched on a poll.
  const paired = poll(w, 1, NOW + 40_000);
  assert.ok(paired.result.match, 'a poll of a waiting player completes the pairing');
  assert.equal(w.lobby.gwent.matches[0].rated.ratings.join(), '1000,1500');
});

test('the closest rating is chosen among several waiting players', () => {
  const w = world();
  join(w, 1, 1300); join(w, 2, 1000, 0, NOW + 100);
  assert.equal(w.lobby.gwent.matches.length, 0, '300 apart');
  const third = join(w, 3, 1080, 0, NOW + 200);
  assert.ok(third.result.match, 'the new player is matched at once');
  assert.deepEqual([...w.lobby.gwent.matches[0].players].sort(), ['2', '3'], 'with the closest rating, not the first in the queue');
  assert.equal(w.lobby.gwent.queue.length, 1);
});

test('a finished rated game is counted once and shows the change on both result screens', () => {
  const w = world();
  join(w, 1, 1000, 0); join(w, 2, 1000, 0, NOW + 100);
  const match = w.lobby.gwent.matches[0];
  assert.ok(match.rated);
  const ended = ask(w, 1, true, { action: 'surrender', matchId: match.id, revision: match.revision }, NOW + 200);
  assert.equal(ended.ratingUpdates.length, 2);
  const [loser, winner] = ended.ratingUpdates;
  assert.deepEqual([loser.userId, loser.result, loser.before, loser.after], ['1', 'loss', 1000, 980]);
  assert.deepEqual([winner.userId, winner.result, winner.before, winner.after], ['2', 'win', 1000, 1020]);
  assert.deepEqual(ended.result.match.rated.change, { delta: -20, after: 980 });
  assert.deepEqual(poll(w, 2, NOW + 300).result.match.rated, { before: 1000, opponent: 1000, change: { delta: 20, after: 1020 } });
  assert.equal(ask(w, 2, false, null, NOW + 400).ratingUpdates.length, 0, 'a game is never counted twice');
  assert.equal(collectRatingUpdates(w.lobby).length, 0);
});

test('friendly games and rematches are not rated', () => {
  const w = world();
  const sent = ask(w, 1, true, { action: 'invite', targetId: '2', loadout: deck });
  assert.equal(sent.result.ok, true);
  const accepted = ask(w, 2, true, { action: 'accept_invite', inviteId: sent.result.invitation.id, loadout: deck }, NOW + 100);
  assert.equal(accepted.result.match.rated, null, 'an invitation game has no rating');
  const match = w.lobby.gwent.matches[0];
  assert.equal(ask(w, 1, true, { action: 'surrender', matchId: match.id, revision: match.revision }, NOW + 200).ratingUpdates.length, 0);
  // A rematch of a rated game is friendly too.
  const rated = world();
  join(rated, 1, 1000); join(rated, 2, 1000, 0, NOW + 100);
  const first = rated.lobby.gwent.matches[0];
  ask(rated, 1, true, { action: 'surrender', matchId: first.id, revision: first.revision }, NOW + 200);
  ask(rated, 1, true, { action: 'rematch', matchId: first.id }, NOW + 300);
  const again = ask(rated, 2, true, { action: 'rematch', matchId: first.id }, NOW + 400);
  assert.equal(again.result.match.rated, null);
});

test('a draw changes ratings by the difference only, and a rating never falls below the floor', () => {
  const w = world();
  join(w, 1, 1000, 50); join(w, 2, 1100, 50, NOW + 100);
  const match = w.lobby.gwent.matches[0];
  match.state.phase = 'matchOver'; match.state.winner = 'draw'; match.endedAt = NOW;
  const [one, two] = collectRatingUpdates(w.lobby);
  assert.equal(one.result, 'draw'); assert.ok(one.after > one.before, 'the weaker player gains from a draw');
  assert.ok(two.after < two.before);
  assert.equal(DEFAULT_RATING, 1000);
  const [, lowLoss] = eloChange({ rating: MIN_RATING, games: 0 }, { rating: 2000, games: 0 }, 'first');
  assert.ok(lowLoss < 0);
  const floor = world();
  join(floor, 1, MIN_RATING, 0); join(floor, 2, MIN_RATING, 0, NOW + 100);
  const low = floor.lobby.gwent.matches[0];
  ask(floor, 2, true, { action: 'surrender', matchId: low.id, revision: low.revision }, NOW + 200);
  assert.ok(low.ratingResult.after.every(rating => rating >= MIN_RATING));
});
