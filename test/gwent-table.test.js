import test from 'node:test';
import assert from 'node:assert/strict';
import { GWENT_DECKS, expandDeck } from '../webapp/gwent-decks.js';
import { defaultLoadout, buildDeck } from '../webapp/gwent-builder.js';
import { createTable, createMatch, playCard, passRound, resolveChoice, legalPlays, scores, TABLE_SEATS } from '../webapp/gwent-engine.js';
import { chooseTableAction, seededRandom } from '../webapp/gwent-ai.js';

// Tables of three and four players: seats in turn order, targets named by seat, rounds scored by place.

const catalogue = id => Object.values(GWENT_DECKS).flatMap(deck => expandDeck(deck)).find(card => card.id === id);
let nextUid = 50000;
const make = id => ({ ...catalogue(id), uid: nextUid++ });
const rows = (close = [], ranged = [], siege = []) => ({ close, ranged, siege });
const FACTIONS = ['redania', 'wild-hunt', 'toussaint', 'velen'];

/** A table with empty hands and boards, ready for a hand-built position. */
function table(count = 4, factions = FACTIONS) {
  const seats = TABLE_SEATS.slice(0, count);
  const state = createTable({ decks: factions.slice(0, count).map(id => GWENT_DECKS[id]), seats, rng: seededRandom(4), setup: false });
  for (const seat of seats) Object.assign(state.sides[seat], { deck: [], hand: [], graveyard: [], leader: null, rows: rows() });
  state.turn = state.starter = seats[0];
  return state;
}

test('a table starts with every seat dealt ten cards, a swap for each, and no first-turn choice', () => {
  const state = createTable({ decks: FACTIONS.map(id => GWENT_DECKS[id]), rng: seededRandom(9) });
  assert.deepEqual(state.seats, ['player', 'ai', 'ai2', 'ai3']);
  for (const seat of state.seats) assert.equal(state.sides[seat].hand.length, 10, seat);
  let next = state;
  const order = [];
  while (next.pending) {
    order.push(`${next.pending.side}:${next.pending.kind}`);
    next = resolveChoice(next, next.pending.side, 'done').state;
  }
  assert.deepEqual(order.filter(item => item.endsWith('mulligan')).map(item => item.split(':')[0]).sort(), [...state.seats].sort());
  assert.equal(order.some(item => item.endsWith('first')), false);
  assert.equal(next.setup, null);
  assert.ok(state.seats.includes(next.turn));
  assert.equal(createTable({ decks: FACTIONS.slice(0, 3).map(id => GWENT_DECKS[id]), rng: seededRandom(1) }).seats.length, 3);
});

test('turns go round the table, a seat that passed is skipped, and the round ends when everyone has passed', () => {
  const state = table(4);
  for (const seat of state.seats) state.sides[seat].hand = [make('re-captain'), make('re-captain')];
  let next = playCard(state, 'player', state.sides.player.hand[0].uid, { row: 'close' }).state;
  assert.equal(next.turn, 'ai');
  next = passRound(next, 'ai').state;
  assert.equal(next.turn, 'ai2');
  next = playCard(next, 'ai2', next.sides.ai2.hand[0].uid, { row: 'close' }).state;
  assert.equal(next.turn, 'ai3');
  next = playCard(next, 'ai3', next.sides.ai3.hand[0].uid, { row: 'close' }).state;
  assert.equal(next.turn, 'player', 'the passed seat is skipped on the way round');
  next = passRound(next, 'player').state;
  assert.equal(next.turn, 'ai2');
  next = passRound(next, 'ai2').state;
  next = passRound(next, 'ai3').state;
  assert.equal(next.round, 2, 'everyone passed: the round was scored');
});

test('a round is scored by place: 3, 2, 1, 0 points at four seats; ties share, the table lowest starts the next round', () => {
  const state = table(4);
  for (const seat of state.seats) state.sides[seat].hand = [make('re-captain')];
  state.sides.player.rows = rows([make('re-radovid'), make('re-radovid')]);   // 20
  state.sides.ai.rows = rows([make('re-radovid'), make('re-captain')]);        // 18
  state.sides.ai2.rows = rows([make('re-radovid'), make('re-captain')]);       // 18
  state.sides.ai3.rows = rows([make('re-captain')]);                           // 8
  for (const seat of state.seats) state.passed[seat] = true;
  state.passed.player = false;
  const ended = passRound(state, 'player').state;
  assert.equal(ended.round, 2);
  assert.deepEqual(ended.lastRound.points, { player: 3, ai: 1.5, ai2: 1.5, ai3: 0 });
  assert.deepEqual(ended.points, { player: 3, ai: 1.5, ai2: 1.5, ai3: 0 });
  assert.equal(ended.lastRound.winner, 'player');
  assert.equal(ended.starter, 'ai3', 'the seat with the lowest score starts');
  assert.equal(ended.turn, 'ai3');
  assert.deepEqual(Object.values(ended.passed), [false, false, false, false]);
});

test('three seats score 2, 1, 0; a faction that wins ties takes the better place of a tie', () => {
  const state = table(3, ['nilfgaard', 'redania', 'velen']);
  for (const seat of state.seats) state.sides[seat].hand = [make('re-captain')];
  state.sides.player.rows = rows([make('re-radovid')]);   // 10, Nilfgaard
  state.sides.ai.rows = rows([make('re-radovid')]);       // 10
  state.sides.ai2.rows = rows([make('re-captain')]);      // 8
  state.passed.ai = true; state.passed.ai2 = true;
  const ended = passRound(state, 'player').state;
  assert.deepEqual(ended.lastRound.points, { player: 2, ai: 1, ai2: 0 }, 'Nilfgaard win the tie for first place');
  const plain = table(3);
  for (const seat of plain.seats) plain.sides[seat].hand = [make('re-captain')];
  plain.sides.player.rows = rows([make('re-radovid')]);
  plain.sides.ai.rows = rows([make('re-radovid')]);
  plain.sides.ai2.rows = rows([make('re-captain')]);
  plain.passed.ai = true; plain.passed.ai2 = true;
  assert.deepEqual(passRound(plain, 'player').state.lastRound.points, { player: 1.5, ai: 1.5, ai2: 0 });
});

test('the match lasts three rounds; the most points win, a tie goes to the last round\'s score', () => {
  const state = table(4);
  state.round = 3;
  state.points = { player: 4, ai: 4, ai2: 2, ai3: 0 };
  for (const seat of state.seats) state.sides[seat].hand = [make('re-captain')];
  state.sides.player.rows = rows([make('re-captain')]);   // 8
  state.sides.ai.rows = rows([make('re-radovid')]);       // 10
  state.sides.ai2.rows = rows([make('re-captain')]);
  state.sides.ai3.rows = rows();
  state.passed.ai = state.passed.ai2 = state.passed.ai3 = true;
  const over = passRound(state, 'player').state;
  assert.equal(over.phase, 'matchOver');
  assert.equal(over.round, 3);
  // Round three points: ai 3, player 2 (and ai2 tied with player on 8: share) -> ai leads on 4+3 = 7.
  assert.equal(over.winner, 'ai');
  assert.deepEqual(over.winners, ['ai']);
  assert.equal(over.rounds.length, 1);
  const tied = table(3);
  tied.round = 3; tied.points = { player: 2, ai: 2, ai2: 0 };
  for (const seat of tied.seats) tied.sides[seat].hand = [make('re-captain')];
  tied.sides.player.rows = rows([make('re-radovid')]);   // 10
  tied.sides.ai.rows = rows([make('re-captain')]);       // 8
  tied.sides.ai2.rows = rows([make('re-captain')]);      // 8
  tied.passed.ai = tied.passed.ai2 = true;
  const result = passRound(tied, 'player').state;
  assert.equal(result.winner, 'player', 'points 4, 3, 1');
});

test('attacks name an opponent by seat: spies, ambushes, fireball and curse; strikes find their unit; the default is the first opponent', () => {
  const state = table(4, ['redania', 'wild-hunt', 'toussaint', 'velen']);
  const spy = make('re-informant'), ambush = make('ambush'), fireball = make('so-fireball'), curse = make('so-curse'), strike = make('ex-trap');
  state.sides.player.hand = [spy, ambush, fireball, curse, strike];
  state.sides.player.deck = [make('re-captain'), make('re-captain'), make('re-captain')];
  state.sides.ai.rows = rows([make('wh-ice-warrior')]);
  state.sides.ai2.rows = rows([make('to-vintner')]);
  state.sides.ai3.rows = rows([make('ve-bandit')]);
  for (const seat of ['ai', 'ai2', 'ai3']) state.sides[seat].hand = [make('ve-water-hag')]; // keeps the seats in the round
  const seatsOf = uid => legalPlays(state, 'player').filter(play => play.uid === uid).map(play => `${play.seat}:${play.row ?? '-'}`);
  assert.deepEqual(seatsOf(spy.uid), ['ai:close', 'ai2:close', 'ai3:close']);
  assert.equal(seatsOf(ambush.uid).length, 9, 'three rows at each of three opponents');
  assert.deepEqual(seatsOf(fireball.uid), ['ai:close', 'ai2:close', 'ai3:close']);
  assert.deepEqual(legalPlays(state, 'player').filter(play => play.uid === strike.uid).map(play => play.targetUid).length, 3);

  const spied = playCard(state, 'player', spy.uid, { row: 'close', seat: 'ai2' }).state;
  assert.ok(spied.sides.ai2.rows.close.some(card => card.uid === spy.uid), 'the spy stands at the named opponent');
  assert.equal(spied.sides.ai.rows.close.length, 1);
  assert.equal(spied.sides.player.hand.length, 5 - 1 + 3, 'Redania spies draw three');
  const defaulted = playCard(state, 'player', spy.uid, { row: 'close' }).state;
  assert.ok(defaulted.sides.ai.rows.close.some(card => card.uid === spy.uid), 'no seat: the first opponent');

  const laid = playCard(state, 'player', ambush.uid, { row: 'ranged', seat: 'ai3' }).state;
  assert.equal(laid.sides.ai3.traps.ranged.id, 'ambush');
  assert.equal(laid.sides.ai.traps.ranged, null);
  laid.turn = 'ai3'; laid.passed.ai = laid.passed.ai2 = true;
  const sprungResult = playCard(laid, 'ai3', laid.sides.ai3.hand[0].uid, { row: 'ranged' });
  assert.ok(sprungResult.state, sprungResult.error);
  const sprung = sprungResult.state;
  assert.deepEqual(sprung.sides.player.rows.ranged.map(card => card.id), ['squirrel', 'squirrel'], 'the squirrels go to whoever laid the ambush');

  const burned = playCard(state, 'player', fireball.uid, { row: 'close', seat: 'ai3' }).state;
  assert.equal(burned.sides.ai3.rows.close.length, 0);
  assert.equal(burned.sides.ai.rows.close.length, 1);
  const cursed = playCard(state, 'player', curse.uid, { row: 'close', seat: 'ai2' }).state;
  assert.equal(cursed.sides.ai2.mods.close, -1);
  assert.equal(cursed.sides.ai.mods.close, 0);
  const hit = playCard(state, 'player', strike.uid, { targetUid: state.sides.ai3.rows.close[0].uid }).state;
  assert.equal(hit.sides.ai3.rows.close.length, 1, 'the strike found the unit at the third opponent');
  assert.equal(hit.sides.ai3.rows.close[0].bonus, -4);
});

test('at a table a leader attacks the opponent that suits it, and the weather is shared by everybody', () => {
  const state = table(3, ['sorceresses', 'redania', 'velen']);
  state.sides.ai.rows = rows([], [make('re-radovid'), make('re-captain'), make('re-captain')]);
  state.sides.ai2.rows = rows([], [make('ve-bandit')]);
  state.sides.player.leader = { id: 'x', name: 'Test', type: 'leader', uid: 77001, effect: { type: 'scorchRow', target: 'ranged', cond: 'ranged', threshold: 10 } };
  state.sides.player.hand = [make('so-guard')];
  const burned = playCard(state, 'player', 77001).state;
  assert.equal(burned.sides.ai.rows.ranged.filter(card => card.id === 're-captain').length, 0, 'the richest ranged row loses its strongest ordinary units');
  assert.equal(burned.sides.ai.rows.ranged.some(card => card.id === 're-radovid'), true, 'the hero stays');
  assert.equal(burned.sides.ai2.rows.ranged.length, 1);
  const frost = make('biting-frost');
  const cold = table(3);
  cold.sides.player.hand = [frost, make('re-captain')];
  cold.sides.ai.rows = rows([make('re-captain')]);
  cold.sides.ai2.rows = rows([make('re-captain')]);
  const frozen = playCard(cold, 'player', frost.uid).state;
  assert.equal(scores(frozen).ai, 1);
  assert.equal(scores(frozen).ai2, 1, 'weather hits every board');
});

test('AI seats play whole tables of three and four, every level, and the points add up', () => {
  for (const [index, factions] of [['redania', 'wild-hunt', 'toussaint'], FACTIONS, ['sorceresses', 'eternal-fire', 'witchers', 'velen']].entries()) {
    for (const level of ['easy', 'medium', 'hard']) {
      const rng = seededRandom(20 + index);
      const seats = TABLE_SEATS.slice(0, factions.length);
      let state = createTable({ decks: factions.map(id => buildDeck(defaultLoadout(id, 'extended'))), seats, rng });
      for (let steps = 0; steps < 3000 && state.phase === 'playing'; steps += 1) {
        const seat = state.pending ? state.pending.side : state.turn;
        const action = chooseTableAction(state, seat, { level, rng, budgetMs: 4 });
        assert.ok(action, `${factions.length} seats, ${level}: no action for ${seat}`);
        const result = action.type === 'choice' ? resolveChoice(state, seat, action.id)
          : action.type === 'pass' ? passRound(state, seat) : playCard(state, seat, action.uid, action);
        assert.ok(result.state, `${factions.length} seats, ${level}: ${result.error}`);
        state = result.state;
      }
      assert.equal(state.phase, 'matchOver', `${factions.length} seats, ${level}`);
      assert.equal(state.rounds.length, 3, 'exactly three rounds');
      const perRound = factions.length === 4 ? 6 : 3;
      assert.equal(Object.values(state.points).reduce((a, b) => a + b, 0), 3 * perRound);
      assert.ok(state.winners.length >= 1 && state.winners.every(seat => seats.includes(seat)));
    }
  }
});

test('a duel is still a duel: two seats, wins decide, nothing of the table rules applies', () => {
  const duel = createMatch({ playerDeck: GWENT_DECKS.skellige, aiDeck: GWENT_DECKS.nilfgaard, rng: seededRandom(3), setup: false });
  assert.deepEqual(duel.seats, ['player', 'ai']);
  assert.equal(duel.sides.player.faction, 'skellige');
  assert.equal(legalPlays(duel, duel.turn).every(play => play.seat === undefined), true, 'no seat named at a duel');
});

// Two against two: seats 1 and 3 against seats 2 and 4; the team sums decide a round, two rounds win the match.
function teams(factions = FACTIONS) {
  const seats = TABLE_SEATS.slice(0, 4);
  const state = createTable({ decks: factions.map(id => GWENT_DECKS[id]), seats, rng: seededRandom(4), setup: false, teams: true });
  for (const seat of seats) Object.assign(state.sides[seat], { deck: [], hand: [], graveyard: [], leader: null, rows: rows() });
  state.turn = state.starter = seats[0];
  return state;
}

test('teams are fixed by seat and attacks may only name the other team', () => {
  const state = teams();
  assert.deepEqual(state.teams, { player: 'A', ai: 'B', ai2: 'A', ai3: 'B' });
  const spy = make('re-informant');
  state.sides.player.hand = [spy, make('re-informant')];
  for (const seat of ['ai', 'ai2', 'ai3']) state.sides[seat].hand = [make('re-informant')];
  const seatsHit = legalPlays(state, 'player').filter(play => play.uid === spy.uid).map(play => play.seat);
  assert.deepEqual(new Set(seatsHit), new Set(['ai', 'ai3']), 'never the teammate');
  const refused = playCard(state, 'player', spy.uid, { row: 'close', seat: 'ai2' });
  assert.ok(!refused.error && refused.state.sides.ai.rows.close.length === 1, 'a teammate named as a target falls back to the first opponent');
});

test('a round goes to the team with the higher sum and every member wins it', () => {
  const state = teams();
  const unit = strength => ({ id: 'u' + strength, uid: nextUid++, type: 'unit', name: 'Отряд', rows: ['close'], strength });
  state.sides.player.rows.close = [unit(5)]; state.sides.ai2.rows.close = [unit(6)]; // team A: 11
  state.sides.ai.rows.close = [unit(9)]; state.sides.ai3.rows.close = [unit(1)];     // team B: 10
  for (const seat of TABLE_SEATS) state.sides[seat].hand = [unit(1)];
  for (const seat of TABLE_SEATS) { const r = passRound(state, state.turn); Object.assign(state, r.state); }
  assert.equal(state.round, 2);
  assert.deepEqual([state.wins.player, state.wins.ai2, state.wins.ai, state.wins.ai3], [1, 1, 0, 0]);
  assert.deepEqual(state.lastRound.teamScores, { A: 11, B: 10 });
  assert.equal(state.starter, 'player', 'the winning team starts');
});

test('the second round won ends a team match and names both members', () => {
  const state = teams();
  state.wins = { player: 0, ai: 1, ai2: 0, ai3: 1 };
  state.round = 2;
  const unit = strength => ({ id: 'u' + strength, uid: nextUid++, type: 'unit', name: 'Отряд', rows: ['close'], strength });
  state.sides.ai.rows.close = [unit(5)]; state.sides.ai3.rows.close = [unit(5)];
  state.sides.player.rows.close = [unit(2)];
  for (const seat of TABLE_SEATS) state.sides[seat].hand = [unit(1)];
  for (let i = 0; i < 4; i += 1) { const r = passRound(state, state.turn); Object.assign(state, r.state); }
  assert.equal(state.phase, 'matchOver');
  assert.deepEqual(state.winners.sort(), ['ai', 'ai3']);
  assert.equal(state.wins.ai, 2);
});

test('the AI plays a whole two-against-two match and a team wins it', () => {
  for (const seed of [1, 2, 3]) {
    const seats = TABLE_SEATS.slice(0, 4);
    const rng = seededRandom(seed);
    let state = createTable({ decks: ['redania', 'velen', 'toussaint', 'witchers'].map(id => buildDeck(defaultLoadout(id, 'extended'))), seats, rng, teams: true });
    for (let guard = 0; guard < 2500 && state.phase === 'playing'; guard += 1) {
      const seat = state.pending ? state.pending.side : state.turn;
      const action = chooseTableAction(state, seat, { level: 'medium', rng });
      assert.ok(action, `the seat to move has an action (${seat})`);
      const result = action.type === 'choice' ? resolveChoice(state, seat, action.id) : action.type === 'pass' ? passRound(state, seat) : playCard(state, seat, action.uid, action);
      assert.ok(!result.error, result.error);
      state = result.state;
    }
    assert.equal(state.phase, 'matchOver', `match ${seed} ends`);
    assert.ok(state.winners.length === 2 || state.winner === 'draw');
    if (state.winners.length) assert.equal(new Set(state.winners.map(seat => state.teams[seat])).size, 1, 'the winners are one team');
  }
});
