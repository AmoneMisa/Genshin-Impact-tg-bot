import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultLoadout } from '../webapp/gwent-builder.js';
import { legalPlays, TABLE_SEATS } from '../webapp/gwent-engine.js';
import { runGwent, emptyLobby, lobbyBusy } from '../miniapp/gwentLobby.js';
import { TURN_TTL } from '../miniapp/gwent.js';

// Online tables of three and four: a room opened as a link, joined by other players, started by the host with the
// AI in the empty seats; every player sees the table from their own seat, and hidden information stays on the server.

const NOW = 7_000_000;
const heroes = { 1: { name: 'Анна', friends: ['4'] }, 2: { name: 'Борис', friends: [] }, 3: { name: 'Вера', friends: [] }, 4: { name: 'Глеб', friends: ['1'] } };
const decks = { 1: defaultLoadout('redania', 'extended'), 2: defaultLoadout('velen', 'extended'), 3: defaultLoadout('toussaint', 'extended'), 4: defaultLoadout('sorceresses', 'extended') };
const world = () => ({ lobby: emptyLobby() });
function ask(w, user, mutation, body = null, now = NOW) {
  const people = Object.fromEntries(Object.entries(heroes).map(([id, hero]) => [id, { ...hero, lastSeenAt: 0 }]));
  return runGwent({ lobby: w.lobby, userId: user, name: heroes[user].name, people, mutation, body, now, rng: () => 0.4 });
}
const act = (w, user, body, now) => ask(w, user, true, body, now);
const read = (w, user, now) => ask(w, user, false, null, now);

function open(w, size = 3) {
  const created = act(w, 1, { action: 'invite', table: size, loadout: decks[1] }).result;
  assert.equal(created.ok, true, created.reason);
  return created.invitation;
}
const join = (w, user, room) => act(w, user, { action: 'accept_invite', inviteId: room.id, loadout: decks[user] }).result;

test('a table room shows its seats, and a full room starts at once', () => {
  const w = world();
  const room = open(w, 3);
  assert.equal(room.table.size, 3);
  assert.equal(room.open, true);
  assert.equal(read(w, 1, NOW).result.room.table.players.length, 1);
  const second = join(w, 2, room);
  assert.equal(second.ok, true);
  assert.equal(second.room.table.players.length, 2, 'the guest sees the room they sit in');
  assert.equal(second.match, null);
  const third = join(w, 3, room);
  assert.ok(third.match, 'the last seat starts the game');
  assert.equal(third.match.table, 3);
  assert.equal(read(w, 1, NOW).result.match.table, 3);
  assert.equal(read(w, 1, NOW).result.room, undefined, 'the room is gone once the table plays');
});

test('the host can start with the AI in the empty seats, but not alone', () => {
  const w = world();
  const room = open(w, 4);
  assert.equal(act(w, 1, { action: 'start_table', inviteId: room.id }).result.ok, false, 'alone there is nobody to play with');
  join(w, 2, room);
  assert.equal(act(w, 2, { action: 'start_table', inviteId: room.id }).result.ok, false, 'only the host starts');
  const started = act(w, 1, { action: 'start_table', inviteId: room.id }).result;
  assert.equal(started.ok, true);
  assert.equal(started.match.table, 4);
  const match = w.lobby.gwent.matches[0];
  assert.deepEqual(match.players.map(id => id.startsWith('bot:')), [false, false, true, true]);
  assert.equal(new Set(match.factions).size, 4, 'the AI plays other factions than the people');
});

test('a full or closed room refuses more guests, and a seated player cannot sit twice', () => {
  const w = world();
  const room = open(w, 3);
  join(w, 2, room);
  assert.equal(act(w, 1, { action: 'invite', table: 3, loadout: decks[1] }).result.ok, false, 'the host already has a table');
  assert.equal(join(w, 2, room).ok, true, 'joining again changes nothing');
  assert.equal(read(w, 1, NOW).result.room.table.players.length, 2);
  join(w, 3, room);
  assert.equal(act(w, 4, { action: 'accept_invite', inviteId: room.id, loadout: decks[4] }).result.ok, false, 'the room started and is closed');
});

test('classic decks are refused at a table', () => {
  const w = world();
  const room = open(w, 3);
  const refused = act(w, 2, { action: 'accept_invite', inviteId: room.id, loadout: defaultLoadout('nilfgaard') }).result;
  assert.equal(refused.ok, false);
  assert.equal(act(w, 1, { action: 'invite', table: 5, loadout: decks[1] }).result.ok, false, 'tables seat three or four');
  assert.equal(act(w, 1, { action: 'leave_table', inviteId: room.id }).result.ok, false);
});

test('every player sees the table from their own seat and never the hidden cards', () => {
  const w = world();
  const room = open(w, 3);
  join(w, 2, room); join(w, 3, room);
  const match = w.lobby.gwent.matches[0];
  const views = [1, 2, 3].map(user => read(w, user, NOW).result.match);
  views.forEach((view, i) => {
    assert.deepEqual(view.state.seats, ['player', 'ai', 'ai2']);
    assert.equal(view.seatNames.player, heroes[i + 1].name);
    assert.equal(view.seatNames.ai, heroes[((i + 1) % 3) + 1].name, 'the next seat is the opponent after you');
    assert.equal(view.faction, match.factions[i]);
    assert.equal(view.state.sides.player.hand.length, match.state.sides[TABLE_SEATS[i]].hand.length, 'your own hand is visible');
    for (const seat of ['ai', 'ai2']) { assert.deepEqual(view.state.sides[seat].hand, []); assert.deepEqual(view.state.sides[seat].deck, []); }
    assert.equal(view.state.rngState, undefined);
  });
});

test('turns go round the table and only the player to move can act', () => {
  const w = world();
  const room = open(w, 3);
  join(w, 2, room); join(w, 3, room);
  const match = w.lobby.gwent.matches[0];
  for (let guard = 0; match.state.pending && guard < 12; guard += 1) {
    const seat = match.state.pending.side, user = match.players[TABLE_SEATS.indexOf(seat)];
    assert.ok(act(w, user, { action: 'choice', matchId: match.id, revision: match.revision, choiceId: 'done' }).result.ok);
  }
  const seat = match.state.turn, user = match.players[TABLE_SEATS.indexOf(seat)], other = match.players.find(id => id !== user);
  const play = legalPlays(match.state, seat).find(item => item.row);
  assert.equal(act(w, other, { action: 'play', matchId: match.id, revision: match.revision, uid: play.uid, row: play.row }).result.ok, false);
  const moved = act(w, user, { action: 'play', matchId: match.id, revision: match.revision, uid: play.uid, row: play.row }).result;
  assert.equal(moved.ok, true, moved.reason);
  assert.notEqual(match.state.turn, seat, 'the turn passes to the next seat');
});

test('an attack names the opponent by the seat the player sees', () => {
  const w = world();
  const room = open(w, 3);
  join(w, 2, room); join(w, 3, room);
  const match = w.lobby.gwent.matches[0];
  match.state.pending = null; match.state.setup = null;
  match.state.turn = match.state.starter = 'ai';          // the second player to move
  const fireball = { id: 'fireball', uid: 99001, type: 'special', special: 'fireball', name: 'Огненный шар', row: 'close' };
  match.state.sides.ai.hand.push(fireball);
  match.state.sides.ai2.rows.close.push({ id: 'dummy', uid: 99002, type: 'unit', name: 'Мишень', row: 'close', strength: 6 });
  match.state.sides.player.rows.close.push({ id: 'dummy', uid: 99003, type: 'unit', name: 'Мишень', row: 'close', strength: 9 });
  const view = read(w, 2, NOW).result.match;
  assert.equal(view.state.turn, 'player', 'the second player sees their own move as `player`');
  // For them the first player is `ai2` and the third is `ai`; the fireball at `ai2` must burn the first player's row.
  const result = act(w, 2, { action: 'play', matchId: match.id, revision: match.revision, uid: 99001, row: 'close', seat: 'ai2' }).result;
  if (result.ok) assert.equal(match.state.sides.player.rows.close.length, 0, 'the named opponent lost the row');
  else assert.fail(result.reason);
});

test('a player who runs out of time is replaced by the AI, the others play on', () => {
  const w = world();
  const room = open(w, 3);
  join(w, 2, room); join(w, 3, room);
  const match = w.lobby.gwent.matches[0];
  const mover = match.state.pending ? match.state.pending.side : match.state.turn, user = match.players[TABLE_SEATS.indexOf(mover)];
  read(w, 1, NOW + TURN_TTL + 1000);
  assert.ok(!match.players.includes(user), 'the idle player no longer holds a seat');
  assert.ok(match.names.some(name => name.endsWith('(бот)')));
  assert.equal(lobbyBusy(w.lobby, user), false, 'and is free to play again');
});

test('surrendering at a table hands the seat to the AI; the last person leaving ends the game', () => {
  const w = world();
  const room = open(w, 3);
  join(w, 2, room); join(w, 3, room);
  const match = w.lobby.gwent.matches[0];
  assert.equal(act(w, 2, { action: 'surrender', matchId: match.id, revision: match.revision }).result.ok, true);
  assert.equal(read(w, 2, NOW).result.match, null);
  assert.equal(match.state.phase, 'playing');
  act(w, 1, { action: 'surrender', matchId: match.id, revision: match.revision });
  act(w, 3, { action: 'surrender', matchId: match.id, revision: match.revision });
  assert.equal(match.state.phase, 'matchOver');
});

test('a spectator watches a table with every hand hidden', () => {
  const w = world();
  const room = open(w, 3);
  join(w, 2, room); join(w, 3, room);
  const match = w.lobby.gwent.matches[0];
  const watched = ask(w, 4, false, null, NOW).result;
  assert.ok(watched.games.some(game => game.id === match.id && game.table === 3));
  const view = runGwent({ lobby: w.lobby, userId: 4, name: 'Глеб', people: {}, mutation: false, watch: match.id, now: NOW }).result.spectating;
  assert.equal(view.spectator, true);
  for (const seat of view.state.seats) assert.deepEqual(view.state.sides[seat].hand, []);
});

test('a room is cancelled by its host, and a guest can leave it', () => {
  const w = world();
  const room = open(w, 4);
  join(w, 2, room);
  assert.equal(act(w, 2, { action: 'leave_table', inviteId: room.id }).result.room, undefined);
  assert.equal(act(w, 1, { action: 'leave_table', inviteId: room.id }).result.ok, false, 'the host cancels instead');
  join(w, 3, room);
  assert.equal(act(w, 1, { action: 'cancel_invite', inviteId: room.id }).result.ok, true);
  assert.equal(read(w, 3, NOW).result.room, undefined);
});

test('a two-against-two room seats the first two people as teammates and shows teammates their hands', () => {
  const w = world();
  const created = act(w, 1, { action: 'invite', table: 4, teams: true, loadout: decks[1] }).result;
  assert.equal(created.ok, true, created.reason);
  const room = created.invitation;
  assert.equal(room.table.teams, true);
  assert.equal(join(w, 2, room).ok, true);
  assert.equal(act(w, 1, { action: 'start_table', inviteId: room.id }).result.ok, true);
  const match = w.lobby.gwent.matches[0];
  assert.deepEqual(match.players.map(id => id.startsWith('bot:')), [false, true, false, true], 'the people are teammates at seats 1 and 3');
  assert.deepEqual(match.state.teams, { player: 'A', ai: 'B', ai2: 'A', ai3: 'B' });
  const host = read(w, 1, NOW).result.match, mate = read(w, 2, NOW).result.match;
  assert.equal(host.state.sides.ai2.hand.length, 10, 'the teammate sits two seats on and the host sees the hand');
  assert.equal(host.state.sides.ai.hand.length, 0, 'opponents stay hidden');
  assert.equal(mate.state.sides.ai2.hand.length, 10);
  assert.deepEqual(mate.state.teams, { player: 'A', ai: 'B', ai2: 'A', ai3: 'B' });
  assert.equal(host.seatNames.ai2, 'Борис');
  assert.equal(act(w, 3, { action: 'invite', table: 3, teams: true, loadout: decks[3] }).result.invitation.table.teams, false, 'teams need four seats');
});

test('a blessing named for the teammate lands on the teammate row, whichever seat the sender has', () => {
  const w = world();
  const room = act(w, 1, { action: 'invite', table: 4, teams: true, loadout: decks[1] }).result.invitation;
  join(w, 2, room);
  act(w, 1, { action: 'start_table', inviteId: room.id });
  const match = w.lobby.gwent.matches[0];
  match.state.pending = null; match.state.setup = null;
  // The second person sits at seat 3 (`ai2` for the host, `ai2` for them as well: teammates are two seats apart).
  const unit = (uid, strength) => ({ id: 'u' + uid, uid, type: 'unit', name: 'Отряд', rows: ['close'], strength });
  match.state.sides.ai2.rows.close = [unit(88001, 4)];
  match.state.sides.player.hand.push({ id: 'b', uid: 88002, type: 'special', special: 'blessing', name: 'Благословение', amount: 2 });
  for (const seat of ['ai', 'ai3']) match.state.sides[seat].hand.push(unit(88100 + seat.length, 1));
  match.state.turn = 'player'; match.state.passed = { player: false, ai: false, ai2: false, ai3: false };
  const result = act(w, 1, { action: 'play', matchId: match.id, revision: match.revision, uid: 88002, row: 'close', seat: 'ai2' }).result;
  assert.equal(result.ok, true, result.reason);
  assert.equal(match.state.sides.ai2.mods.close, 2, 'the mate row got the blessing');
  assert.equal(match.state.sides.player.mods.close, 0);
});
