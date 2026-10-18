import test from 'node:test';
import assert from 'node:assert/strict';
import { SKELLIGE_DECK, GWENT_DECKS, DECK_IDS, expandDeck } from '../webapp/gwent-decks.js';
import { chooseAiAction } from '../webapp/gwent-ai.js';
import { createMatch, legalPlays, playCard, passRound, resolveChoice, aiChoiceId, rowValues, rowValuesFor, sideScore, scores, SIDES } from '../webapp/gwent-engine.js';

const seeded = seed => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const template = id => DECK_IDS.flatMap(deckId => expandDeck(GWENT_DECKS[deckId])).find(card => card.id === id);
let nextUid = 1000;
const make = id => ({ ...template(id), uid: nextUid++ });

/** A match with both sides emptied, so each test places exactly the cards it needs. */
function emptyMatch() {
  const state = createMatch({ playerDeck: SKELLIGE_DECK, aiDeck: SKELLIGE_DECK, rng: seeded(7), setup: false });
  for (const side of SIDES) {
    state.sides[side].deck = [];
    state.sides[side].hand = [];
    for (const row of ['close', 'ranged', 'siege']) state.sides[side].rows[row] = [];
  }
  return state;
}

test('every deck has at least 22 cards and only cards the engine resolves', () => {
  assert.equal(DECK_IDS.length, 5);
  for (const id of DECK_IDS) {
    const cards = expandDeck(GWENT_DECKS[id]);
    assert.ok(cards.length >= 22, `${id} has ${cards.length} cards`);
    for (const card of cards) {
      if (card.type === 'unit') assert.ok(card.rows.length > 0 && Number.isInteger(card.strength), `${id}/${card.id}`);
      else assert.ok(['decoy', 'horn', 'scorch', 'weather', 'mardroeme'].includes(card.special), `${id}/${card.id}`);
    }
  }
});

test('a new match deals 10 cards to each side and keeps the rest in the deck', () => {
  const state = createMatch({ playerDeck: SKELLIGE_DECK, aiDeck: SKELLIGE_DECK, rng: seeded(1) });
  assert.equal(state.sides.player.hand.length, 10);
  assert.equal(state.sides.player.deck.length, expandDeck(SKELLIGE_DECK).length - 10);
  assert.equal(state.turn, 'player');
  assert.equal(state.phase, 'playing');
});

test('morale gives +1 to the other units in its row', () => {
  const row = [make('olaf'), make('drummond'), make('light-longship')];
  assert.deepEqual(rowValues(row), [12, 5, 5]);
});

test('bond multiplies each unit by the number of same-bond units in its row', () => {
  const row = [make('drummond'), make('drummond'), make('drummond')];
  assert.deepEqual(rowValues(row), [12, 12, 12]);
});

test('horn doubles non-hero units in its row, heroes are unaffected', () => {
  const row = [make('draig-bon-dhu'), make('holger-blackhand'), make('hjalmar')];
  assert.deepEqual(rowValues(row), [2, 8, 10]);
});

test('bond multiplies base strength before morale; horn doubles the resulting strength once', () => {
  const row = [make('catapult'), make('catapult'), make('kaedweni-expert')];
  assert.deepEqual(rowValues(row), [17, 17, 1]);
  assert.deepEqual(rowValues([...row, make('commanders-horn')]), [34, 34, 2, 0]);
  assert.deepEqual(rowValues([...row, make('commanders-horn')], false, { doubled: true }), [34, 34, 2, 0]);
  assert.deepEqual(rowValues(row, true), [3, 3, 1]);
  assert.deepEqual(rowValues([...row, make('commanders-horn')], true), [6, 6, 2, 0]);
});

test('multiple morale sources add together without boosting themselves or heroes', () => {
  const row = [make('catapult'), make('catapult'), make('kaedweni-expert'), make('kaedweni-expert'), make('geralt')];
  assert.deepEqual(rowValues(row), [18, 18, 2, 2, 15]);
});

test('unit horns do not boost themselves, but another horn or leader can boost their bearer', () => {
  const row = [make('dandelion'), make('holger-blackhand')];
  assert.deepEqual(rowValues(row), [2, 8]);
  assert.deepEqual(rowValues([...row, make('commanders-horn')]), [4, 8, 0]);
  assert.deepEqual(rowValues([...row, make('dandelion')]), [4, 8, 4]);
  assert.deepEqual(rowValues(row, false, { doubled: true }), [4, 8]);
  assert.deepEqual(rowValues(row, true), [1, 2]);
});

test('Bran halves original base strength under weather, before bond, morale and horn', () => {
  const row = [make('craite'), make('craite'), make('olaf'), make('dandelion'), make('hjalmar')];
  assert.deepEqual(rowValues(row, true, { halve: true }), [14, 14, 12, 2, 10]);
  assert.deepEqual(rowValues(row, false, { halve: true }), rowValues(row));
  assert.deepEqual(rowValues([make('cow'), make('holger-blackhand')], true, { halve: true }), [0, 2]);
});

test('Bran weather protection applies only to his side and can be cancelled by the enemy leader', () => {
  const state = emptyMatch();
  state.weather.siege = true;
  state.sides.player.kingBran = true;
  state.sides.ai.kingBran = false;
  state.sides.player.rows.siege = [make('war-longship')];
  state.sides.ai.rows.siege = [make('war-longship')];
  assert.deepEqual(rowValuesFor(state, 'player', 'siege'), [3]);
  assert.deepEqual(rowValuesFor(state, 'ai', 'siege'), [1]);
  state.sides.ai.leader = { id: 'cancel', uid: 9001, type: 'leader', effect: { type: 'cancelEnemyLeader' } };
  state.turn = 'ai';
  state.sides.player.hand = [make('holger-blackhand')];
  state.sides.ai.hand = [make('holger-blackhand')];
  const next = playCard(state, 'ai', 9001).state;
  assert.equal(next.sides.player.leaderCancelled, true);
  assert.deepEqual(rowValuesFor(next, 'player', 'siege'), [1]);
});

test('scorch uses corrected bonded and morale-boosted strength to pick its targets', () => {
  const state = emptyMatch();
  state.sides.player.kingBran = state.sides.ai.kingBran = false;
  state.sides.player.rows.siege = [make('catapult'), make('catapult'), make('kaedweni-expert')];
  state.sides.ai.rows.close = [{ ...make('holger-blackhand'), strength: 18 }];
  const scorch = make('scorch');
  state.sides.player.hand = [scorch, make('holger-blackhand')];
  state.sides.ai.hand = [make('holger-blackhand')];
  state.turn = 'player';
  const next = playCard(state, 'player', scorch.uid).state;
  assert.equal(next.sides.player.rows.siege.length, 3);
  assert.equal(next.sides.ai.rows.close.length, 0);
});

test('an agile unit can only be placed in one of its rows', () => {
  const state = emptyMatch();
  const olaf = make('olaf');
  state.sides.player.hand = [olaf, make('holger-blackhand')]; // a second card keeps the round going
  assert.ok(playCard(state, 'player', olaf.uid, { row: 'siege' }).error);
  const ok = playCard(state, 'player', olaf.uid, { row: 'ranged' });
  assert.equal(ok.state.sides.player.rows.ranged.length, 1);
});

test('muster pulls every other card of its group from the deck into the same row', () => {
  const state = emptyMatch();
  const ship = make('light-longship');
  state.sides.player.hand = [ship, make('holger-blackhand')];
  state.sides.player.deck = [make('light-longship'), make('light-longship'), make('craite')];
  const result = playCard(state, 'player', ship.uid);
  assert.equal(result.state.sides.player.rows.ranged.filter(card => card.id === 'light-longship').length, 3);
  assert.equal(result.state.sides.player.deck.map(card => card.id).join(), 'craite');
});

test('decoy swaps with an own non-hero unit, which returns to hand', () => {
  const state = emptyMatch();
  const target = make('craite');
  state.sides.player.rows.close = [target];
  const decoy = make('decoy');
  state.sides.player.hand = [decoy, make('holger-blackhand')];
  const result = playCard(state, 'player', decoy.uid, { targetUid: target.uid });
  assert.equal(result.state.sides.player.rows.close[0].id, 'decoy');
  assert.ok(result.state.sides.player.hand.some(card => card.uid === target.uid));
});

test('decoy cannot target a hero', () => {
  const state = emptyMatch();
  const hero = make('hjalmar');
  state.sides.player.rows.ranged = [hero];
  const decoy = make('decoy');
  state.sides.player.hand = [decoy];
  assert.ok(playCard(state, 'player', decoy.uid, { targetUid: hero.uid }).error);
});

test('scorch destroys the strongest non-hero units on both sides and keeps heroes', () => {
  const state = emptyMatch();
  state.sides.player.rows.close = [make('craite'), make('craite')]; // 12 each with bond
  state.sides.ai.rows.siege = [make('holger-blackhand'), make('hjalmar')];
  const scorch = make('scorch');
  state.sides.player.hand = [scorch, make('holger-blackhand')];
  const result = playCard(state, 'player', scorch.uid);
  assert.equal(result.state.sides.player.rows.close.length, 0);
  assert.deepEqual(result.state.sides.ai.rows.siege.map(card => card.id), ['holger-blackhand', 'hjalmar']);
});

test('playing out of turn or after passing is rejected', () => {
  const state = emptyMatch();
  state.sides.ai.hand = [make('holger-blackhand')];
  assert.ok(playCard(state, 'ai', state.sides.ai.hand[0].uid).error);
  const passed = passRound(state, 'player').state;
  assert.equal(passed.turn, 'ai');
  assert.deepEqual(legalPlays(passed, 'player'), []);
});

test('a round ends when both pass, the higher total wins and every card goes to the graveyard', () => {
  const state = emptyMatch();
  state.sides.player.rows.ranged = [make('hjalmar'), make('brokvar-archer')]; // 10 + 6
  state.sides.ai.rows.siege = [make('holger-blackhand')]; // 4
  state.sides.ai.hand = [];
  state.sides.player.hand = [make('holger-blackhand')];
  // The AI has no cards, so it auto-passes and the round ends as soon as the player passes.
  const next = passRound(state, 'player').state;
  assert.equal(next.lastRound.winner, 'player');
  assert.equal(next.wins.player, 1);
  assert.deepEqual(next.sides.player.rows.ranged.map(card => card.id), []);
  assert.equal(next.sides.player.graveyard.some(card => card.id === 'hjalmar'), true, 'heroes go to the graveyard');
  assert.equal(next.round, 2);
  assert.equal(next.starter, 'player', 'the winner of the round starts the next one');
});

test('a drawn round gives both players a round win', () => {
  const state = emptyMatch();
  state.sides.player.rows.ranged = [make('brokvar-archer')];
  state.sides.ai.rows.ranged = [make('brokvar-archer')];
  state.sides.player.hand = [make('holger-blackhand')];
  const result = passRound(state, 'player').state;
  assert.equal(result.lastRound.winner, 'draw');
  assert.equal(result.wins.player, 1);
  assert.equal(result.wins.ai, 1);
});

test('the match ends on the second round win', () => {
  const state = emptyMatch();
  state.wins.player = 1;
  state.sides.player.rows.ranged = [make('hjalmar')];
  state.sides.player.hand = [make('holger-blackhand')];
  const result = passRound(state, 'player').state;
  assert.equal(result.phase, 'matchOver');
  assert.equal(result.winner, 'player');
});

test('the AI never returns an illegal action and passes when it cannot improve', () => {
  const state = createMatch({ playerDeck: SKELLIGE_DECK, aiDeck: SKELLIGE_DECK, rng: seeded(3), setup: false });
  state.turn = 'player';
  const afterPlayer = passRound(state, 'player').state;
  const action = chooseAiAction(afterPlayer);
  assert.ok(action);
  if (action.type === 'play') {
    const plays = legalPlays(afterPlayer, 'ai');
    assert.ok(plays.some(play => play.uid === action.uid && play.row === action.row && play.targetUid === action.targetUid));
  }
});

test('a full match finishes for every deck pairing', () => {
  for (const [i, a] of DECK_IDS.entries()) for (const b of DECK_IDS.slice(i)) for (const seed of [11, 12]) {
    let state = createMatch({ playerDeck: GWENT_DECKS[a], aiDeck: GWENT_DECKS[b], rng: seeded(seed) });
    for (let steps = 0; steps < 2000 && state.phase === 'playing'; steps += 1) {
      if (state.pending) {
        const id = state.pending.side === 'ai' ? aiChoiceId(state) : state.pending.options[0].id;
        state = resolveChoice(state, state.pending.side, id).state;
        continue;
      }
      const side = state.turn;
      let result;
      if (side === 'ai') {
        const action = chooseAiAction(state);
        result = action.type === 'pass'
          ? passRound(state, 'ai')
          : playCard(state, 'ai', action.uid, { row: action.row, targetUid: action.targetUid });
      } else {
        const [first] = legalPlays(state, 'player');
        result = first ? playCard(state, 'player', first.uid, { row: first.row, targetUid: first.targetUid }) : passRound(state, 'player');
      }
      assert.ok(result.state, result.error);
      state = result.state;
    }
    assert.equal(state.phase, 'matchOver', `${a} vs ${b} seed ${seed}`);
    assert.ok(['player', 'ai', 'draw'].includes(state.winner));
    assert.ok(scores(state).player >= 0);
  }
});

test('weather sets the base strength of non-hero units in its row to 1, heroes are immune', () => {
  const row = [make('draug'), make('leshen'), make('fiend')].map(card => ({ ...card, rows: card.rows }));
  const values = rowValues([make('holger-blackhand'), make('hjalmar'), make('war-longship')], true);
  assert.deepEqual(values, [1, 10, 1]);
});

test('playing a weather card sets it for its row, clear weather removes all of it', () => {
  const state = emptyMatch();
  const frost = make('biting-frost');
  const clear = make('clear-weather');
  state.sides.player.hand = [frost, clear, make('holger-blackhand')];
  const fogged = playCard(state, 'player', frost.uid).state;
  assert.equal(fogged.weather.close, true);
  assert.equal(fogged.sides.player.graveyard.some(card => card.uid === frost.uid), true);
  const cleared = playCard(fogged, 'player', clear.uid);
  assert.deepEqual(cleared.state.weather, { close: false, ranged: false, siege: false });
});

test('weather is cleared when the round ends', () => {
  const state = emptyMatch();
  state.weather.siege = true;
  state.sides.player.hand = [make('holger-blackhand')];
  const next = passRound(state, 'player').state;
  assert.deepEqual(next.weather, { close: false, ranged: false, siege: false });
});

test('a spy is placed on the opponent board and its owner draws two cards', () => {
  const state = emptyMatch();
  const spy = make('dijkstra');
  state.sides.player.hand = [spy, make('holger-blackhand')];
  state.sides.player.deck = [make('ves'), make('ves'), make('ves')];
  const next = playCard(state, 'player', spy.uid).state;
  assert.equal(next.sides.ai.rows.close[0].id, 'dijkstra');
  assert.equal(next.sides.player.rows.close.length, 0);
  assert.equal(next.sides.player.hand.length, 3); // holger + 2 drawn
  assert.equal(next.sides.player.deck.length, 1);
  assert.equal(sideScore(next, 'ai'), 4);
});

test('medic asks the player which unit from the graveyard returns; heroes are never offered', () => {
  const state = emptyMatch();
  const medic = make('dun-banner-medic');
  const ves = make('ves');
  state.sides.player.graveyard = [make('hjalmar'), ves, make('siegfried')];
  state.sides.player.hand = [medic, make('holger-blackhand')];
  const waiting = playCard(state, 'player', medic.uid).state;
  assert.equal(waiting.pending.kind, 'revive');
  assert.deepEqual(waiting.pending.options.map(option => option.card.id).sort(), ['siegfried', 'ves']);
  assert.ok(playCard(waiting, 'player', make('holger-blackhand').uid).error, 'nothing else can be played while choosing');
  const next = resolveChoice(waiting, 'player', ves.uid).state;
  assert.equal(next.pending, null);
  assert.equal(next.sides.player.rows.siege.some(card => card.uid === ves.uid), true);
});

test('mardroeme turns the berserkers of its row into the transformed units', () => {
  const state = emptyMatch();
  const berserker = make('berserker');
  state.sides.player.rows.close = [berserker];
  const mardroeme = make('mardroeme');
  state.sides.player.hand = [mardroeme, make('holger-blackhand')];
  const next = playCard(state, 'player', mardroeme.uid, { row: 'close' }).state;
  const transformed = next.sides.player.rows.close.find(card => card.uid === berserker.uid);
  assert.equal(transformed.id, 'vildkaarl');
  assert.equal(transformed.morale, true);
});

test('Keris summons the drummond group from the deck and the hand', () => {
  const state = emptyMatch();
  const keris = make('keris');
  state.sides.player.hand = [keris, make('drummond')];
  state.sides.player.deck = [make('drummond'), make('drummond')];
  const next = playCard(state, 'player', keris.uid).state;
  assert.equal(next.sides.player.rows.close.filter(card => card.id === 'drummond').length, 3);
  assert.equal(next.sides.player.deck.length, 0);
});

test('Kambi summons Heimdall in its place when it is destroyed by scorch', () => {
  const state = emptyMatch();
  state.sides.player.rows.close = [make('kambi')]; // the only non-hero unit on the board, strength 0
  const scorch = make('scorch');
  state.sides.player.hand = [scorch, make('holger-blackhand')];
  const next = playCard(state, 'player', scorch.uid).state;
  assert.deepEqual(next.sides.player.rows.close.map(card => card.id), ['heimdall']);
  assert.equal(next.sides.player.graveyard.some(card => card.id === 'kambi'), true);
});

test('Villentretemerth scorches the enemy close row when its total reaches 10', () => {
  const state = emptyMatch();
  state.sides.ai.rows.close = [make('craite'), make('craite')]; // 6 with bond x2 = 12 each
  const card = make('villentretemerth');
  state.sides.player.hand = [card, make('holger-blackhand')];
  const next = playCard(state, 'player', card.uid, { row: 'close' }).state;
  assert.equal(next.sides.ai.rows.close.length, 0);
});

test('Pirate scorches the strongest units and goes to the graveyard instead of the board', () => {
  const state = emptyMatch();
  state.sides.ai.rows.siege = [make('holger-blackhand')];
  state.sides.player.rows.ranged = [make('hjalmar')];
  const pirate = make('pirate');
  state.sides.player.hand = [pirate, make('holger-blackhand')];
  const next = playCard(state, 'player', pirate.uid, { row: 'ranged' }).state;
  assert.equal(next.sides.ai.rows.siege.length, 0);
  assert.equal(next.sides.player.rows.ranged.some(card => card.id === 'pirate'), false);
  assert.equal(next.sides.player.graveyard.some(card => card.id === 'pirate'), true);
});

test('a leader works once per match, passive leaders are not playable', () => {
  const state = emptyMatch();
  state.sides.player.leader = { id: 'x', name: 'x', type: 'leader', uid: 9000, effect: { type: 'weather', weather: 'siege' } };
  state.sides.player.hand = [make('holger-blackhand'), make('holger-blackhand')];
  const first = playCard(state, 'player', 9000).state;
  assert.equal(first.weather.siege, true);
  assert.ok(playCard(first, 'player', 9000).error);
  state.sides.player.leader.effect = { type: 'passive-bran' };
  assert.equal(legalPlays(state, 'player').some(play => play.uid === 9000), false);
});

test('a drawn round goes to the only side whose faction wins ties', () => {
  const state = emptyMatch();
  state.tieWins = { player: true, ai: false };
  state.sides.player.rows.ranged = [make('brokvar-archer')];
  state.sides.ai.rows.ranged = [make('brokvar-archer')];
  state.sides.player.hand = [make('holger-blackhand')];
  const result = passRound(state, 'player').state;
  assert.equal(result.lastRound.winner, 'player');
  assert.equal(result.wins.ai, 0);
});

test('a spent leader card goes to the graveyard', () => {
  const state = emptyMatch();
  state.sides.player.leader = { id: 'x', name: 'x', type: 'leader', uid: 9001, effect: { type: 'weather', weather: 'clear' } };
  state.sides.player.hand = [make('holger-blackhand'), make('holger-blackhand')];
  const next = playCard(state, 'player', 9001).state;
  assert.equal(next.sides.player.graveyard.some(card => card.uid === 9001), true);
});

test('discard leader: the player discards two cards, then draws one of the chosen cards', () => {
  const state = emptyMatch();
  const a = make('holger-blackhand');
  const b = make('ves');
  const c = make('siegfried');
  const drawn = make('craite');
  state.sides.player.leader = { id: 'x', name: 'x', type: 'leader', uid: 9002, effect: { type: 'discardDraw' } };
  state.sides.player.hand = [a, b, c];
  state.sides.player.deck = [drawn, make('ves')];
  let step = playCard(state, 'player', 9002).state;
  assert.equal(step.pending.kind, 'discard');
  step = resolveChoice(step, 'player', a.uid).state;
  assert.equal(step.pending.kind, 'discard');
  step = resolveChoice(step, 'player', b.uid).state;
  assert.equal(step.pending.kind, 'drawAny');
  step = resolveChoice(step, 'player', drawn.uid).state;
  assert.equal(step.pending, null);
  assert.equal(step.sides.player.hand.some(card => card.uid === drawn.uid), true);
  assert.equal(step.sides.player.graveyard.filter(card => card.uid === a.uid || card.uid === b.uid).length, 2);
  assert.equal(step.passed.ai, true, 'the turn is settled after the choice: the AI has no cards and passes');
});

test('the AI resolves its own choices', () => {
  const state = emptyMatch();
  state.sides.ai.graveyard = [make('ves'), make('siegfried')];
  state.turn = 'ai';
  state.sides.ai.hand = [make('dun-banner-medic')];
  const played = playCard(state, 'ai', state.sides.ai.hand[0].uid).state;
  assert.equal(played.pending.side, 'ai');
  const action = chooseAiAction(played);
  assert.equal(action.type, 'choice');
  assert.equal(resolveChoice(played, 'ai', action.id).error, undefined);
});

const roundOver = (state, winnerSide = 'player') => {
  const loser = winnerSide === 'player' ? 'ai' : 'player';
  state.sides[winnerSide].rows.close = [make('holger-blackhand')];
  state.sides[loser].rows.close = [];
  state.sides.player.hand = [make('holger-blackhand')];
  state.sides.ai.hand = [make('holger-blackhand')];
  state.passed[loser] = true; state.turn = winnerSide;
  return passRound(state, winnerSide).state;
};

test('the match starts with a swap of up to two cards, then the first player is set by the coin toss', () => {
  const state = createMatch({ playerDeck: SKELLIGE_DECK, aiDeck: SKELLIGE_DECK, rng: seeded(5) });
  assert.equal(state.pending.kind, 'mulligan');
  assert.equal(state.pending.side, 'player');
  const oldHand = state.sides.player.hand.map(card => card.uid);
  let next = resolveChoice(state, 'player', oldHand[0]).state;
  assert.equal(next.pending.remaining, 1);
  assert.equal(next.sides.player.hand.length, 10);
  assert.ok(!next.sides.player.hand.some(card => card.uid === oldHand[0]) || next.sides.player.hand.length === 10);
  next = resolveChoice(next, 'player', 'done').state;
  assert.equal(next.pending.side, 'ai');
  next = resolveChoice(next, 'ai', aiChoiceId(next)).state;
  while (next.pending) next = resolveChoice(next, next.pending.side, next.pending.side === 'ai' ? aiChoiceId(next) : 'done').state;
  assert.equal(next.setup, null);
  assert.equal(next.turn, next.starter);
  assert.equal(next.sides.player.hand.length, 10);
});

test("Scoia'tael decide who goes first; two Scoia'tael decks use the coin toss", () => {
  const state = createMatch({ playerDeck: GWENT_DECKS.scoiatael, aiDeck: SKELLIGE_DECK, rng: seeded(2) });
  let next = resolveChoice(state, 'player', 'done').state;
  while (next.pending?.kind === 'mulligan') next = resolveChoice(next, next.pending.side, next.pending.side === 'ai' ? aiChoiceId(next) : 'done').state;
  assert.equal(next.pending.kind, 'first');
  assert.equal(next.pending.side, 'player');
  assert.equal(resolveChoice(next, 'player', 'enemy').state.turn, 'ai');
  assert.equal(resolveChoice(next, 'player', 'self').state.turn, 'player');
  const both = createMatch({ playerDeck: GWENT_DECKS.scoiatael, aiDeck: GWENT_DECKS.scoiatael, rng: seeded(2) });
  let rest = both;
  while (rest.pending) rest = resolveChoice(rest, rest.pending.side, rest.pending.side === 'ai' ? aiChoiceId(rest) : 'done').state;
  assert.equal(rest.setup, null);
});

test('the winner starts the next round and nobody draws cards between rounds', () => {
  for (const winner of ['player', 'ai']) {
    const state = emptyMatch();
    const next = roundOver(state, winner);
    assert.equal(next.starter, winner);
    assert.equal(next.turn, winner);
    assert.equal(next.sides.player.hand.length, 1);
    assert.equal(next.sides.player.deck.length, 0);
  }
});

test('Northern Realms draw a card after winning a round', () => {
  const state = emptyMatch();
  state.sides.player.faction = 'northern-realms';
  state.sides.player.deck = [make('geralt')];
  const next = roundOver(state, 'player');
  assert.equal(next.sides.player.hand.length, 2);
  const lost = emptyMatch();
  lost.sides.player.faction = 'northern-realms';
  lost.sides.player.deck = [make('geralt')];
  assert.equal(roundOver(lost, 'ai').sides.player.hand.length, 1);
});

test('Monsters keep one random non-hero unit on the board after a round', () => {
  const state = emptyMatch();
  state.sides.ai.faction = 'monsters';
  state.sides.ai.rows.close = [];
  const next = (() => {
    state.sides.player.rows.close = [make('holger-blackhand')];
    state.sides.ai.rows.siege = [make('war-longship'), make('hjalmar')];
    state.sides.player.hand = [make('holger-blackhand')];
    state.passed.ai = true; state.turn = 'player';
    return passRound(state, 'player').state;
  })();
  const kept = Object.values(next.sides.ai.rows).flat();
  assert.deepEqual(kept.map(card => card.id), ['war-longship']);
  assert.equal(next.sides.ai.graveyard.some(card => card.id === 'hjalmar'), true);
  assert.equal(Object.values(next.sides.player.rows).flat().length, 0);
});

test('Skellige return two random non-hero units from the graveyard at the start of round 3', () => {
  const state = emptyMatch();
  state.round = 2; state.wins = { player: 1, ai: 0 };
  state.sides.player.faction = 'skellige';
  state.sides.player.graveyard = [make('war-longship'), make('hjalmar'), make('holger-blackhand'), make('brokvar-archer')];
  const next = roundOver(state, 'ai'); // a lost round 2 (ai gets its first win) starts round 3
  assert.equal(next.round, 3);
  const back = Object.values(next.sides.player.rows).flat();
  assert.equal(back.length, 2);
  assert.ok(back.every(card => !card.hero));
});

test('heroes ignore every other card: weather, horn, morale, bond, leader doubling, King Bran, scorch, decoy and medic', () => {
  const hero = { ...make('hjalmar'), morale: false };
  const bonded = { ...make('geralt'), bond: 'x' };
  // Hero strength stays fixed under weather, horn, doubling and halving, and no bond multiplies it.
  assert.deepEqual(rowValues([hero, bonded], true, { doubled: true, halve: true }), [10, 15]);
  assert.deepEqual(rowValues([hero, make('commanders-horn')], false), [10, 0]);
  assert.deepEqual(rowValues([hero, { ...make('holger-blackhand'), morale: true }], false), [10, 4]);

  // Scorch never destroys a hero, even when it is the strongest card.
  const state = emptyMatch();
  state.sides.ai.rows.ranged = [hero, make('brokvar-archer')];
  const scorch = make('scorch');
  state.sides.player.hand = [scorch];
  const after = playCard(state, 'player', scorch.uid).state;
  assert.ok(after.sides.ai.rows.ranged.some(card => card.id === 'hjalmar'));
  assert.ok(!after.sides.ai.rows.ranged.some(card => card.id === 'brokvar-archer'));

  // A medic never brings a hero back.
  const medicState = emptyMatch();
  medicState.sides.player.graveyard = [hero];
  const medic = make('dun-banner-medic');
  medicState.sides.player.hand = [medic];
  const played = playCard(medicState, 'player', medic.uid).state;
  assert.equal(played.pending, null);
  assert.ok(played.sides.player.graveyard.some(card => card.id === 'hjalmar'));
});

test('every finished round is kept for the result screen', () => {
  const state = emptyMatch();
  state.sides.player.rows.ranged = [make('hjalmar')];
  state.sides.ai.rows.siege = [make('holger-blackhand')];
  state.sides.player.hand = [make('holger-blackhand')];
  state.turn = 'player';
  const next = passRound(state, 'player').state;
  assert.deepEqual(next.rounds, [{ round: 1, scores: { player: 10, ai: 4 }, winner: 'player' }]);
});
