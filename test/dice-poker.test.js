import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, compareHands, aiKeep, aiSteps, newMatch, playerThrow, settleRound, nextRound, rollDice, REROLLS, ROUNDS_TO_WIN, COMBINATIONS } from '../webapp/dice-poker.js';

const seq = (...faces) => { let i = 0; return () => (faces[i++ % faces.length] + 0.5) / 6; };
const hand = dice => evaluate(dice);

test('every combination is recognised and ranked as in the Witcher: a full house beats the straights, a poker beats all', () => {
  // faces are 0..5 for the dice showing 1..6
  const names = [[[0, 2, 3, 4, 5], 'Ничего'], [[2, 2, 0, 1, 5], 'Пара'], [[2, 2, 4, 4, 0], 'Две пары'], [[3, 3, 3, 0, 5], 'Сет'],
    [[0, 1, 2, 3, 4], 'Малый стрейт'], [[5, 4, 3, 2, 1], 'Большой стрейт'], [[1, 1, 4, 4, 4], 'Фул-хаус'], [[5, 5, 5, 5, 0], 'Каре'], [[2, 2, 2, 2, 2], 'Покер']];
  names.forEach(([dice, name], rank) => { assert.equal(hand(dice).name, name); assert.equal(hand(dice).rank, rank); });
  assert.equal(COMBINATIONS.length, 9);
  assert.equal(hand([0, 1, 2, 3, 5]).name, 'Ничего', 'four in a row with a gap is nothing');
});

test('equal combinations are decided by the points of the combination; the other dice do not count', () => {
  assert.ok(compareHands(hand([5, 5, 0, 1, 2]), hand([4, 4, 3, 2, 1])) > 0, 'a pair of sixes beats a pair of fives');
  assert.equal(compareHands(hand([3, 3, 5, 1, 0]), hand([3, 3, 4, 2, 0])), 0, 'the same pair with other leftovers is a draw');
  assert.ok(compareHands(hand([5, 5, 1, 1, 0]), hand([5, 5, 0, 0, 4])) > 0, 'two pairs go by their sum');
  assert.ok(compareHands(hand([4, 4, 4, 1, 1]), hand([3, 3, 3, 5, 5])) < 0, 'a full house is counted by all five dice');
  assert.ok(compareHands(hand([1, 2, 3, 4, 5]), hand([0, 1, 2, 3, 4])) > 0, 'the big straight beats the small one');
  assert.equal(compareHands(hand([0, 1, 2, 3, 4]), hand([4, 3, 2, 1, 0])), 0, 'equal straights are a draw');
  assert.ok(compareHands(hand([2, 2, 2, 2, 0]), hand([1, 1, 1, 1, 5])) > 0);
  assert.ok(compareHands(hand([0, 0, 0, 0, 0]), hand([5, 5, 5, 5, 4])) > 0, 'poker beats four of a kind');
  assert.ok(compareHands(hand([0, 2, 3, 4, 5]), hand([0, 1, 3, 4, 5])) > 0, 'nothing is counted by all five dice');
  assert.equal(hand([2, 2, 4, 4, 0]).points, 16, 'two pairs: 3+3+5+5');
});

test('the dice are fair faces from 0 to 5 and a throw uses every die', () => {
  const dice = rollDice(1000, Math.random);
  assert.ok(dice.every(value => value >= 0 && value <= 5));
  assert.equal(new Set(dice).size, 6);
  assert.deepEqual(rollDice(5, () => 0.9999999), [5, 5, 5, 5, 5]);
});

test('the AI keeps what makes its hand better and stands on a finished hand', () => {
  assert.deepEqual(aiKeep([2, 2, 3, 0, 5], 'hard').sort(), [0, 1]);
  assert.deepEqual(aiKeep([4, 4, 4, 4, 1], 'hard'), [0, 1, 2, 3]);
  assert.equal(aiKeep([1, 2, 3, 4, 5], 'hard').length, 5, 'a big straight is never thrown away');
  assert.equal(aiKeep([2, 2, 5, 5, 1], 'hard').length >= 4, true);
  assert.deepEqual(aiKeep([2, 2, 3, 0, 5], 'easy').sort(), [0, 1]);
  assert.deepEqual(aiKeep([0, 1, 2, 3, 5], 'easy'), [], 'the easy opponent throws everything when nothing repeats');
});

test('the player re-throws once, keeping the chosen dice', () => {
  const match = newMatch(seq(0, 1, 2, 3, 4, 5, 5, 4, 3, 2), 'hard');
  assert.deepEqual(match.dice.player, [0, 1, 2, 3, 4]);
  const first = playerThrow(match, [0, 1, 2], seq(5, 5));
  assert.deepEqual(first.match.dice.player, [0, 1, 2, 5, 5]);
  assert.equal(first.match.rolls.player, 1);
  assert.equal(playerThrow(first.match, [], seq(0)).error, 'Перебросов не осталось');
  assert.equal(REROLLS, 1);
});

test('the AI re-throws once and only the dice it did not keep change', () => {
  const match = { ...newMatch(seq(0), 'hard'), dice: { player: [0, 0, 0, 0, 0], ai: [2, 2, 3, 0, 5] } };
  const steps = aiSteps(match, seq(4, 4, 4, 4, 4, 4));
  assert.equal(steps.length, 1);
  assert.deepEqual(steps[0].dice.slice(0, 2), [2, 2]);
  assert.deepEqual(aiSteps({ ...match, dice: { ...match.dice, ai: [1, 2, 3, 4, 5] } }), []);
});

test('a round gives a point to the better hand, a draw is thrown again, two wins end the match', () => {
  const base = newMatch(seq(0), 'hard');
  const win = settleRound({ ...base, dice: { player: [5, 5, 1, 2, 3], ai: [0, 2, 3, 4, 5] } });
  assert.equal(win.result.winner, 'player');
  assert.deepEqual(win.wins, { player: 1, ai: 0 });
  assert.equal(win.phase, 'result');
  assert.equal(nextRound(win, seq(0)).match.round, 2);

  const draw = settleRound({ ...base, dice: { player: [0, 2, 3, 4, 5], ai: [5, 4, 3, 2, 0] } });
  assert.equal(draw.result.winner, 'draw');
  assert.deepEqual(draw.wins, { player: 0, ai: 0 });
  assert.equal(nextRound(draw, seq(0)).match.round, 1, 'a drawn round keeps its number');
  assert.equal(nextRound(base).error, 'Раунд ещё не закончен');

  let match = { ...base, wins: { player: ROUNDS_TO_WIN - 1, ai: 1 } };
  match = settleRound({ ...match, dice: { player: [2, 2, 2, 2, 2], ai: [0, 2, 3, 4, 5] } });
  assert.equal(match.phase, 'over');
  assert.equal(match.winner, 'player');
  const lost = settleRound({ ...base, wins: { player: 0, ai: ROUNDS_TO_WIN - 1 }, dice: { player: [0, 2, 3, 4, 5], ai: [3, 3, 1, 0, 5] } });
  assert.equal(lost.winner, 'ai');
  assert.equal(lost.history.at(-1).winner, 'ai');
});
