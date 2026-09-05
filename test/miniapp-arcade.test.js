import test from 'node:test';
import assert from 'node:assert/strict';
import { getArcadeState, startArcadeGame, rollArcadeGame } from '../miniapp/arcade.js';
import { getResettableArcadeGames, resetArcadeGame } from '../miniapp/arcadeReset.js';

function session(gold = 10_000) {
  return { game: { inventory: { gold, crystals: 0, ironOre: 0 } } };
}

test('arcade initializes all six legacy mini-games', () => {
  const state = getArcadeState(session());
  assert.deepEqual(state.games.map(game => game.id), ['dice', 'bowling', 'darts', 'football', 'basketball', 'slots']);
  assert.equal(state.games.every(game => game.active === false), true);
});

test('arcade rejects invalid and unaffordable bets', () => {
  const s = session(500);
  assert.equal(startArcadeGame(s, 'dice', -1).reason, 'invalid_bet');
  assert.equal(startArcadeGame(s, 'dice', 501).reason, 'not_enough_gold');
  assert.equal(startArcadeGame(s, 'dice', 1.5).reason, 'invalid_bet');
  assert.equal(startArcadeGame(s, 'slots', 501).reason, 'not_enough_gold');
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

test('score games keep legacy economy: bet is not deducted on loss', () => {
  const s = session(1000);
  startArcadeGame(s, 'dice', 900);
  rollArcadeGame(s, 'dice', { randomInt: () => 1 });
  rollArcadeGame(s, 'dice', { randomInt: () => 1 });
  const final = rollArcadeGame(s, 'dice', { randomInt: () => 1 });

  assert.equal(final.result.won, false);
  assert.equal(final.result.reward, 0);
  assert.equal(s.game.inventory.gold, 1000);
});

test('legacy reset commands map to the five score games without changing gold', () => {
  assert.deepEqual(getResettableArcadeGames(), ['dice', 'bowling', 'darts', 'football', 'basketball']);

  for (const gameId of getResettableArcadeGames()) {
    const s = session(1000);
    startArcadeGame(s, gameId, 700);
    rollArcadeGame(s, gameId, { randomInt: () => 1 });
    const beforeGold = s.game.inventory.gold;

    const reset = resetArcadeGame(s, gameId);
    const game = reset.arcade.games.find(item => item.id === gameId);

    assert.equal(reset.ok, true, gameId);
    assert.equal(reset.action, 'reset', gameId);
    assert.equal(game.active, false, gameId);
    assert.equal(game.bet, 0, gameId);
    assert.equal(game.rolls, 0, gameId);
    assert.equal(s.game.inventory.gold, beforeGold, gameId);

    // Legacy reset commands were safe to call even after the state was clear.
    assert.equal(resetArcadeGame(s, gameId).ok, true, gameId);
  }
});

test('Mini App reset refuses slots so a deducted slot bet cannot be silently refunded or erased', () => {
  const s = session(1000);
  startArcadeGame(s, 'slots', 100);
  const before = structuredClone(s.game.slotsMiniApp);

  const reset = resetArcadeGame(s, 'slots');

  assert.equal(reset.ok, false);
  assert.equal(reset.reason, 'reset_not_supported');
  assert.equal(s.game.inventory.gold, 900);
  assert.deepEqual(s.game.slotsMiniApp, before);
});

test('slots preserve legacy 20% jackpot path, deduct the bet and pay x1.5', () => {
  const s = session(1000);
  const started = startArcadeGame(s, 'slots', 100);

  assert.equal(started.ok, true);
  assert.equal(s.game.inventory.gold, 900);
  assert.equal(s.game.slotsMiniApp.isStart, true);

  const values = [0, 3]; // 0/4 => win, then symbol index.
  const final = rollArcadeGame(s, 'slots', { randomInt: () => values.shift() });

  assert.equal(final.finished, true);
  assert.equal(final.result.mode, 'slots');
  assert.equal(final.result.won, true);
  assert.deepEqual(final.result.reels, ['🤏', '🤏', '🤏']);
  assert.equal(final.result.multiplier, 1.5);
  assert.equal(final.result.reward, 150);
  assert.equal(final.result.net, 50);
  assert.equal(s.game.inventory.gold, 1050);
  assert.equal(s.game.slotsMiniApp.isStart, false);
});

test('slots loss keeps the deducted bet and never returns three equal symbols', () => {
  const s = session(1000);
  startArcadeGame(s, 'slots', 100);

  const values = [1, 2, 2, 2]; // lose branch, then an accidental triple to normalize.
  const final = rollArcadeGame(s, 'slots', { randomInt: () => values.shift() });

  assert.equal(final.result.won, false);
  assert.equal(final.result.reward, 0);
  assert.equal(final.result.net, -100);
  assert.equal(new Set(final.result.reels).size > 1, true);
  assert.equal(s.game.inventory.gold, 900);
});

test('Mini App slots state does not overwrite an in-progress legacy slots session', () => {
  const s = session(1000);
  s.game.slots = { state: 'bets', bet: 500, startedAt: 123 };

  startArcadeGame(s, 'slots', 100);
  rollArcadeGame(s, 'slots', { randomInt: (() => {
    const values = [1, 0, 1, 2];
    return () => values.shift();
  })() });

  assert.deepEqual(s.game.slots, { state: 'bets', bet: 500, startedAt: 123 });
  assert.equal(s.game.slotsMiniApp.isStart, false);
});
