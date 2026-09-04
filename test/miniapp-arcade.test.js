import test from 'node:test';
import assert from 'node:assert/strict';
import { getArcadeState, startArcadeGame, rollArcadeGame } from '../miniapp/arcade.js';

function session(gold = 10_000) {
  return { game: { inventory: { gold, crystals: 0, ironOre: 0 } } };
}

test('arcade initializes all five legacy mini-games', () => {
  const state = getArcadeState(session());
  assert.deepEqual(state.games.map(game => game.id), ['dice', 'bowling', 'darts', 'football', 'basketball']);
  assert.equal(state.games.every(game => game.active === false), true);
});

test('arcade rejects invalid and unaffordable bets', () => {
  const s = session(500);
  assert.equal(startArcadeGame(s, 'dice', -1).reason, 'invalid_bet');
  assert.equal(startArcadeGame(s, 'dice', 501).reason, 'not_enough_gold');
  assert.equal(startArcadeGame(s, 'dice', 1.5).reason, 'invalid_bet');
});

test('dice preserves legacy win range and 1.2 reward modifier', () => {
  const s = session(10_000);
  assert.equal(startArcadeGame(s, 'dice', 1000).ok, true);
  const rolls = [4, 4, 4];
  const randomInt = () => rolls.shift();

  assert.equal(rollArcadeGame(s, 'dice', { randomInt }).finished, false);
  assert.equal(rollArcadeGame(s, 'dice', { randomInt }).finished, false);
  const final = rollArcadeGame(s, 'dice', { randomInt });

  assert.equal(final.finished, true);
  assert.equal(final.result.score, 12);
  assert.equal(final.result.won, true);
  assert.equal(final.result.multiplier, 1.2);
  assert.equal(final.result.reward, 1200);
  assert.equal(s.game.inventory.gold, 11_200);
  assert.equal(s.game.dice.isStart, false);
});

test('bowling perfect score keeps legacy x3 payout', () => {
  const s = session(1000);
  startArcadeGame(s, 'bowling', 1000);
  rollArcadeGame(s, 'bowling', { randomInt: () => 6 });
  const final = rollArcadeGame(s, 'bowling', { randomInt: () => 6 });

  assert.equal(final.result.score, 12);
  assert.equal(final.result.multiplier, 3);
  assert.equal(final.result.reward, 3000);
  assert.equal(s.game.inventory.gold, 4000);
});

test('darts perfect score keeps legacy x2 payout', () => {
  const s = session(1000);
  startArcadeGame(s, 'darts', 500);
  rollArcadeGame(s, 'darts', { randomInt: () => 6 });
  rollArcadeGame(s, 'darts', { randomInt: () => 6 });
  const final = rollArcadeGame(s, 'darts', { randomInt: () => 6 });

  assert.equal(final.result.score, 18);
  assert.equal(final.result.multiplier, 2);
  assert.equal(final.result.reward, 1000);
});

test('football and basketball use five-point rolls and perfect x1.7 payout', () => {
  for (const gameId of ['football', 'basketball']) {
    const s = session(1000);
    startArcadeGame(s, gameId, 100);
    rollArcadeGame(s, gameId, { randomInt: () => 5 });
    rollArcadeGame(s, gameId, { randomInt: () => 5 });
    const final = rollArcadeGame(s, gameId, { randomInt: () => 5 });
    assert.equal(final.result.score, 15);
    assert.equal(final.result.multiplier, 1.7);
    assert.equal(final.result.reward, 170);
  }
});

test('loss keeps legacy economy: bet is not deducted', () => {
  const s = session(1000);
  startArcadeGame(s, 'dice', 900);
  rollArcadeGame(s, 'dice', { randomInt: () => 1 });
  rollArcadeGame(s, 'dice', { randomInt: () => 1 });
  const final = rollArcadeGame(s, 'dice', { randomInt: () => 1 });

  assert.equal(final.result.won, false);
  assert.equal(final.result.reward, 0);
  assert.equal(s.game.inventory.gold, 1000);
});
