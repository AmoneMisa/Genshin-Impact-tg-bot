import test from 'node:test';
import assert from 'node:assert/strict';
import useHealPotion from '../functions/game/player/useHealPotion.js';

function fixture(hp = 400, power = 250, count = 2) {
  const potion = { bottleType: 'hp', name: 'test potion', power, count };
  const session = {
    game: {
      equipmentStats: {},
      gameClass: { stats: { hp, maxHp: 1000 } },
      inventory: { potions: { items: [potion] } },
    },
  };
  return { session, potion };
}

test('heal potion adds healing to current HP', () => {
  const { session, potion } = fixture(400, 250, 2);

  assert.equal(useHealPotion(session, potion), 0);
  assert.equal(session.game.gameClass.stats.hp, 650);
  assert.equal(potion.count, 1);
});

test('heal potion caps HP at max and consumes one potion', () => {
  const { session, potion } = fixture(900, 250, 2);

  assert.equal(useHealPotion(session, potion), 0);
  assert.equal(session.game.gameClass.stats.hp, 1000);
  assert.equal(potion.count, 1);
});

test('heal potion does not consume at full HP or while dead', () => {
  const full = fixture(1000, 250, 2);
  assert.equal(useHealPotion(full.session, full.potion), 2);
  assert.equal(full.potion.count, 2);

  const dead = fixture(0, 250, 2);
  assert.equal(useHealPotion(dead.session, dead.potion), 1);
  assert.equal(dead.potion.count, 2);
});
