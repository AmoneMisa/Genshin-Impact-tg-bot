import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatch } from '../webapp/gwent-engine.js';
import { chooseAiAction, seededRandom, unseenCards } from '../webapp/gwent-ai.js';
import { DECK_IDS, GWENT_DECKS, expandDeck } from '../webapp/gwent-decks.js';

// How the AI uses special cards, the graveyard, spies and faction rules, on hand-built positions.

const catalogue = id => DECK_IDS.flatMap(deck => expandDeck(GWENT_DECKS[deck])).find(card => card.id === id);
let nextUid = 5000;
const make = id => {
  const card = catalogue(id);
  assert.ok(card, `unknown card ${id}`);
  return { ...card, uid: nextUid++ };
};
const leaderOf = id => {
  const leader = DECK_IDS.flatMap(deck => GWENT_DECKS[deck].leaders).find(item => item.id === id);
  return { ...leader, type: 'leader', uid: nextUid++ };
};
const cards = (...ids) => ids.map(make);
const rows = (close = [], ranged = [], siege = []) => ({ close, ranged, siege });

/** An empty board where the AI is to move and each side holds exactly what a test gives it. */
function scene({ ai = {}, player = {} } = {}) {
  const state = createMatch({ playerDeck: GWENT_DECKS.skellige, aiDeck: GWENT_DECKS.skellige, rng: seededRandom(9), setup: false });
  state.turn = 'ai'; state.starter = 'ai';
  for (const [side, extra] of [['ai', ai], ['player', player]]) {
    Object.assign(state.sides[side], { deck: [], hand: [], graveyard: [], leader: null, rows: rows() }, extra);
  }
  return state;
}
const everyLevel = ['easy', 'medium', 'hard'];
// A fixed 0.2 makes the beginner AI take its "look for a special card" branch.
const act = (state, level) => chooseAiAction(state, { level, rng: () => 0.2, budgetMs: 40 });

test('every level plays a decoy to use a medic again when a strong unit waits in the graveyard', () => {
  const medic = make('dun-banner-medic'), decoy = make('decoy');
  for (const level of ['easy', 'medium']) {
    const state = scene({ ai: { rows: rows([], [], [medic]), hand: [decoy], graveyard: [make('war-longship'), make('hjalmar')] },
      player: { rows: rows([make('holger-blackhand')]) } });
    state.wins.player = 1; // the round cannot be given up
    const action = act(state, level);
    assert.equal(action.uid, decoy.uid, level);
    assert.equal(action.targetUid, medic.uid, level);
  }
});

test("every level plays a decoy on the opponent's spy standing on its side, to play it again", () => {
  const spy = make('thaler'), decoy = make('decoy');
  for (const level of everyLevel) {
    const state = scene({ ai: { rows: rows([make('holger-blackhand')], [], [spy]), hand: [decoy], deck: cards('holger-blackhand', 'holger-blackhand', 'holger-blackhand') },
      player: { rows: rows([make('geralt')]), hand: cards('holger-blackhand', 'brokvar-archer'), deck: cards('war-longship') } });
    state.wins.player = 1;
    const action = act(state, level);
    assert.equal(action.uid, decoy.uid, level);
    assert.equal(action.targetUid, spy.uid, level);
  }
  const noDeck = scene({ ai: { rows: rows([make('holger-blackhand')], [], [make('thaler')]), hand: [make('decoy')] },
    player: { rows: rows([make('geralt')]), hand: cards('holger-blackhand'), deck: cards('war-longship') } });
  noDeck.wins.player = 1;
  for (const level of ['medium', 'hard']) assert.notEqual(act(noDeck, level).targetUid, noDeck.sides.ai.rows.siege[0].uid, `${level} does not decoy a spy it cannot profit from`);
});

test('every level plays a decoy on a unit with a scorch to fire it again', () => {
  const ville = make('villentretemerth'), decoy = make('decoy');
  for (const level of everyLevel) {
    const state = scene({ ai: { rows: rows([ville]), hand: [decoy] },
      player: { rows: rows([make('draug'), make('leshen'), make('fiend')].map(card => ({ ...card, hero: false }))), hand: cards('holger-blackhand') } });
    state.wins.player = 1;
    const action = act(state, level);
    assert.equal(action.uid, decoy.uid, level);
    assert.equal(action.targetUid, ville.uid, level);
  }
});

test('every level uses the leader when it adds a lot (a doubled row)', () => {
  const leader = leaderOf('foltest-siegemaster');
  for (const level of everyLevel) {
    const state = scene({ ai: { leader, rows: rows([], [], [make('war-longship'), make('war-longship')]), hand: [make('holger-blackhand')] },
      player: { rows: rows([make('geralt'), make('hjalmar')]) } });
    state.wins.player = 1;
    assert.equal(act(state, level).uid, leader.uid, level);
  }
});

test('every level plays a weather card against a strong enemy row', () => {
  const frost = make('biting-frost');
  for (const level of everyLevel) {
    const state = scene({ ai: { hand: [frost, make('holger-blackhand')] },
      player: { rows: rows([make('geralt'), make('hjalmar')].map(card => ({ ...card, hero: false }))) } });
    state.wins.player = 1;
    assert.equal(act(state, level).uid, frost.uid, level);
  }
});

test("every level plays a commander's horn on a full row", () => {
  const horn = make('commanders-horn');
  for (const level of everyLevel) {
    const state = scene({ ai: { hand: [horn, make('holger-blackhand')], rows: rows([], [], [make('war-longship'), make('war-longship')]) },
      player: { rows: rows([make('geralt'), make('hjalmar')]) } });
    state.wins.player = 1;
    const action = act(state, level);
    assert.equal(action.uid, horn.uid, level);
    assert.equal(action.row, 'siege', level);
  }
});

test('medium and hard play a spy for free when the round is already won, only while the deck can pay for it', () => {
  const spy = make('thaler');
  for (const level of ['medium', 'hard']) {
    const state = scene({ ai: { hand: [spy], deck: cards('holger-blackhand', 'holger-blackhand', 'holger-blackhand'), rows: rows([make('geralt')]) },
      player: { hand: cards('holger-blackhand', 'brokvar-archer'), deck: cards('war-longship', 'war-longship') } });
    state.passed.player = true;
    assert.equal(act(state, level).uid, spy.uid, `${level} draws with the spy`);
    const empty = scene({ ai: { hand: [make('thaler')], rows: rows([make('geralt')]) },
      player: { hand: cards('holger-blackhand', 'brokvar-archer'), deck: cards('war-longship', 'war-longship') } });
    empty.passed.player = true;
    assert.deepEqual(act(empty, level), { type: 'pass' }, `${level} keeps passing without a deck`);
  }
});

test('a medic revive picks the unit that helps the board most', () => {
  const weak = make('holger-blackhand'), strong = make('war-longship'), middle = make('brokvar-archer');
  for (const level of ['medium', 'hard']) {
    const state = scene({ ai: { graveyard: [weak, strong, middle] } });
    state.pending = { side: 'ai', kind: 'revive', row: 'siege', options: [weak, strong, middle].map(card => ({ id: card.uid, card })) };
    assert.equal(chooseAiAction(state, { level }).id, strong.uid, level);
  }
});

test('a faction that wins ties does not spend cards to beat a tie, and its opponent still has to', () => {
  const extra = make('war-longship');
  const tied = scene({ ai: { hand: [extra, make('hjalmar')], rows: rows([], [], [make('holger-blackhand')]) },
    player: { rows: rows([], [], [make('holger-blackhand')]), hand: cards('holger-blackhand', 'brokvar-archer'), deck: cards('war-longship', 'war-longship') } });
  tied.passed.player = true; tied.tieWins.ai = true;
  for (const level of ['medium', 'hard']) assert.deepEqual(act(tied, level), { type: 'pass' }, `${level} as Nilfgaard passes on a tie`);
  const plain = structuredClone(tied); plain.tieWins.ai = false;
  for (const level of ['medium', 'hard']) assert.equal(act(plain, level).type, 'play', `${level} must beat the tie`);
  const foeWins = structuredClone(tied); foeWins.tieWins.ai = false; foeWins.tieWins.player = true;
  for (const level of ['medium', 'hard']) assert.equal(act(foeWins, level).type, 'play', `${level} must beat a Nilfgaard tie`);
});

test("Scoia'tael decide who goes first: medium and hard let the opponent move first", () => {
  const state = scene();
  state.pending = { side: 'ai', kind: 'first', options: [{ id: 'self' }, { id: 'enemy' }] };
  for (const level of ['medium', 'hard']) assert.equal(chooseAiAction(state, { level }).id, 'enemy');
});

test("the AI counts the discard pile: cards already played are not expected in the opponent's hand", () => {
  const state = scene();
  state.sides.player.faction = 'northern-realms';
  const all = unseenCards(state, 'player');
  state.sides.player.graveyard = [make('dijkstra')];
  state.sides.player.rows.close = [make('geralt')];
  const after = unseenCards(state, 'player');
  assert.equal(after.length, all.length - 2);
  assert.equal(after.filter(card => card.id === 'dijkstra').length, all.filter(card => card.id === 'dijkstra').length - 1);
});
