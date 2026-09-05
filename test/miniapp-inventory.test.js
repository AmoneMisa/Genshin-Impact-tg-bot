import test from 'node:test';
import assert from 'node:assert/strict';
import { getInventoryState, useInventoryPotion } from '../miniapp/inventory.js';

function player() {
  return {
    game: {
      equipmentStats: {},
      gameClass: {
        stats: {
          name: 'warrior',
          hp: 1000,
          maxHp: 5000,
          mp: 100,
          maxMp: 400,
        },
        skills: [],
      },
      inventory: {
        gold: 1234,
        crystals: 56,
        ironOre: 78,
        arena: { name: 'Предметы арены', items: [{ tokens: 9 }, { pvpSign: 'bronze' }] },
        equipment: { name: 'Экипировка', items: [{ name: 'Sword' }] },
        gacha: { name: 'Предметы гачи', items: [{ shards: 1 }, { shards: 2 }] },
        potions: {
          name: 'Зелья',
          items: [
            { type: 'hp', bottleType: 'potion', count: 2, power: 1000, name: 'HP 1000', description: '' },
            { type: 'hp', bottleType: 'elixir', count: 1, power: 45, name: 'HP 45%', description: '' },
            { type: 'mp', bottleType: 'potion', count: 1, power: 180, name: 'MP 180', description: '' },
          ],
        },
      },
    },
  };
}

test('inventory state exposes resources, arena items and migrated category counts', () => {
  const session = player();
  const state = getInventoryState(session);

  assert.deepEqual(state.resources, { gold: 1234, crystals: 56, ironOre: 78 });
  assert.deepEqual(state.arena, { tokens: 9, pvpSign: 'bronze' });
  assert.deepEqual(state.counts, { equipment: 1, gacha: 2, potions: 4 });
  assert.equal(state.player.hp, 1000);
  assert.equal(state.player.maxHp, 5000);
  assert.equal(state.player.mp, 100);
  assert.equal(state.player.maxMp, 400);
});

test('HP potion restores additively and decrements only its own stack', () => {
  const session = player();
  const result = useInventoryPotion(session, '0');

  assert.equal(result.ok, true);
  assert.equal(result.resource, 'hp');
  assert.equal(result.restored, 1000);
  assert.equal(session.game.gameClass.stats.hp, 2000);
  assert.equal(session.game.inventory.potions.items[0].count, 1);
});

test('HP elixir restores a percentage of max HP', () => {
  const session = player();
  const result = useInventoryPotion(session, '1');

  assert.equal(result.ok, true);
  assert.equal(result.restored, 2250);
  assert.equal(session.game.gameClass.stats.hp, 3250);
  assert.equal(session.game.inventory.potions.items[1].count, 0);
});

test('MP potion restores MP instead of HP', () => {
  const session = player();
  const result = useInventoryPotion(session, '2');

  assert.equal(result.ok, true);
  assert.equal(result.resource, 'mp');
  assert.equal(result.restored, 180);
  assert.equal(session.game.gameClass.stats.mp, 280);
  assert.equal(session.game.gameClass.stats.hp, 1000);
});

test('inventory rejects invalid, empty, dead and unnecessary potion use without consuming items', () => {
  const session = player();
  assert.equal(useInventoryPotion(session, '99').reason, 'potion_not_found');

  session.game.inventory.potions.items[0].count = 0;
  assert.equal(useInventoryPotion(session, '0').reason, 'potion_empty');

  session.game.inventory.potions.items[0].count = 1;
  session.game.gameClass.stats.hp = 0;
  assert.equal(useInventoryPotion(session, '0').reason, 'player_dead');
  assert.equal(session.game.inventory.potions.items[0].count, 1);

  session.game.gameClass.stats.hp = 5000;
  assert.equal(useInventoryPotion(session, '0').reason, 'hp_full');
  assert.equal(session.game.inventory.potions.items[0].count, 1);

  session.game.gameClass.stats.hp = 1000;
  session.game.gameClass.stats.mp = 400;
  assert.equal(useInventoryPotion(session, '2').reason, 'mp_full');
  assert.equal(session.game.inventory.potions.items[2].count, 1);
});
