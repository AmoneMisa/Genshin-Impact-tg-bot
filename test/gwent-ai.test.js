import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, legalPlays, playCard, passRound, resolveChoice } from '../webapp/gwent-engine.js';
import { chooseAiAction, seededRandom, AI_LEVELS, normalizeAiLevel } from '../webapp/gwent-ai.js';
import { aiLoadout, buildDeck, defaultLoadout, inspectLoadout } from '../webapp/gwent-builder.js';
import { DECK_IDS } from '../webapp/gwent-decks.js';

/** Plays a whole match with an AI level in each seat. Returns the winning seat. */
function simulate(playerLevel, aiLevel, factionA, factionB, seed, budgetMs, smartDecks = false) {
  const rng = seededRandom(seed);
  const deck = (faction, level) => buildDeck(smartDecks ? aiLoadout(faction, level, rng) : defaultLoadout(faction));
  let state = createMatch({ playerDeck: deck(factionA, playerLevel), aiDeck: deck(factionB, aiLevel), rng });
  for (let steps = 0; steps < 600 && state.phase === 'playing'; steps += 1) {
    const side = state.pending ? state.pending.side : state.turn;
    const action = chooseAiAction(state, { level: side === 'player' ? playerLevel : aiLevel, side, rng, budgetMs });
    assert.ok(action, 'the side to move always has an action');
    const result = action.type === 'choice' ? resolveChoice(state, side, action.id)
      : action.type === 'pass' ? passRound(state, side) : playCard(state, side, action.uid, action);
    assert.ok(result.state, result.error);
    state = result.state;
  }
  assert.equal(state.phase, 'matchOver');
  return state.winner;
}

/** Wins of level `a` against level `b`, alternating seats and decks. */
function duel(a, b, games, budgetMs, smartDecks) {
  let wins = 0, losses = 0;
  for (let i = 0; i < games; i += 1) {
    const first = DECK_IDS[i % 5], second = DECK_IDS[(i + 2) % 5];
    const flip = i % 2 === 1;
    const winner = flip ? simulate(b, a, second, first, 100 + i, budgetMs, smartDecks) : simulate(a, b, first, second, 100 + i, budgetMs, smartDecks);
    if (winner === 'draw') continue;
    if ((winner === 'player') !== flip) wins += 1; else losses += 1;
  }
  return { wins, losses };
}

test('unknown levels fall back to medium', () => {
  assert.deepEqual(AI_LEVELS, ['easy', 'medium', 'hard']);
  assert.equal(normalizeAiLevel('nightmare'), 'medium');
  assert.equal(normalizeAiLevel('hard'), 'hard');
});

test('every level returns only legal actions and resolves its own choices', () => {
  for (const level of AI_LEVELS) for (const [index, id] of DECK_IDS.entries()) {
    const rng = seededRandom(index + 3);
    let state = createMatch({ playerDeck: buildDeck(defaultLoadout(id)), aiDeck: buildDeck(defaultLoadout(DECK_IDS[(index + 1) % 5])), rng });
    for (let steps = 0; steps < 400 && state.phase === 'playing'; steps += 1) {
      const side = state.pending ? state.pending.side : state.turn;
      if (side === 'ai') {
        const action = chooseAiAction(state, { level, rng, budgetMs: 10 });
        if (action.type === 'play') assert.ok(legalPlays(state, 'ai').some(play => play.uid === action.uid && play.row === action.row && play.targetUid === action.targetUid), `${level} played an illegal move`);
        if (action.type === 'choice') assert.ok(state.pending.options.some(option => option.id === action.id));
      }
      const action = chooseAiAction(state, { level, side, rng, budgetMs: 10 });
      const result = action.type === 'choice' ? resolveChoice(state, side, action.id)
        : action.type === 'pass' ? passRound(state, side) : playCard(state, side, action.uid, action);
      assert.ok(result.state, result.error);
      state = result.state;
    }
    assert.equal(state.phase, 'matchOver');
  }
});

test('the AI is not asked to move when it is not its turn', () => {
  const state = createMatch({ playerDeck: buildDeck(defaultLoadout()), aiDeck: buildDeck(defaultLoadout()), rng: seededRandom(1), setup: false });
  state.turn = 'player';
  for (const level of AI_LEVELS) assert.equal(chooseAiAction(state, { level }), null);
});

test('AI decks are valid for every faction and level', () => {
  for (const id of DECK_IDS) for (const level of AI_LEVELS) {
    const loadout = aiLoadout(id, level, seededRandom(4));
    const stats = inspectLoadout(loadout);
    assert.ok(stats.valid, `${id}/${level}: ${stats.errors.join('; ')}`);
    if (level === 'hard') assert.ok(stats.units <= 26 && stats.specials <= 9, `${id} hard deck is tight`);
  }
});

test('medium beats easy more often than not', () => {
  const { wins, losses } = duel('medium', 'easy', 60, 0, false);
  assert.ok(wins > losses * 1.3, `medium ${wins} : ${losses} easy`);
});

test('hard beats medium by a wide margin', () => {
  const { wins, losses } = duel('hard', 'medium', 10, 30, true);
  assert.ok(wins >= 7 && wins > losses * 2, `hard ${wins} : ${losses} medium`);
});
