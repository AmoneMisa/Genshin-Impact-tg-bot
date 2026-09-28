import test from 'node:test';
import assert from 'node:assert/strict';
import { CRYSTAL_PRICE, parseCrystalAmount, getExchangeState, buyCrystalsForMiniApp } from '../miniapp/exchange.js';

function session(gold = 10000, crystals = 2) {
  return { game: { inventory: { gold, crystals } } };
}

test('crystal amount parser accepts only positive safe integers', () => {
  assert.equal(parseCrystalAmount('1'), 1);
  assert.equal(parseCrystalAmount(' 7 '), 7);
  assert.equal(parseCrystalAmount(3), 3);
  assert.equal(parseCrystalAmount('0'), null);
  assert.equal(parseCrystalAmount('-1'), null);
  assert.equal(parseCrystalAmount('1.5'), null);
  assert.equal(parseCrystalAmount('2abc'), null);
  assert.equal(parseCrystalAmount(Number.MAX_SAFE_INTEGER), null);
});

test('exchange state reports legacy 1500 gold price and max affordable amount', () => {
  const state = getExchangeState(session(7600, 4));
  assert.equal(state.price, CRYSTAL_PRICE);
  assert.equal(state.price, 1500);
  assert.equal(state.gold, 7600);
  assert.equal(state.crystals, 4);
  assert.equal(state.maxAffordable, 5);
});

test('exchange buys exact crystal amount and subtracts exact gold cost', () => {
  const player = session(10000, 2);
  const result = buyCrystalsForMiniApp(player, '4');

  assert.equal(result.ok, true);
  assert.equal(result.amount, 4);
  assert.equal(result.cost, 6000);
  assert.equal(player.game.inventory.gold, 4000);
  assert.equal(player.game.inventory.crystals, 6);
  assert.equal(result.exchange.maxAffordable, 2);
});

test('exchange rejects insufficient funds without mutation', () => {
  const player = session(1499, 3);
  const result = buyCrystalsForMiniApp(player, 1);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'not_enough_gold');
  assert.equal(result.missingGold, 1);
  assert.equal(player.game.inventory.gold, 1499);
  assert.equal(player.game.inventory.crystals, 3);
});

test('exchange rejects malformed and overflow amounts without mutation', () => {
  const player = session(10000, 2);
  for (const value of ['-5', '1.2', '10x', 0, Number.MAX_SAFE_INTEGER]) {
    const result = buyCrystalsForMiniApp(player, value);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'invalid_amount');
  }
  assert.equal(player.game.inventory.gold, 10000);
  assert.equal(player.game.inventory.crystals, 2);
});
