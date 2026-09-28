import test from 'node:test';
import assert from 'node:assert/strict';
import calculatePoints from '../functions/game/arena/calculatePoints.js';
import getPvpSign from '../functions/game/arena/getPvpSign.js';

function stats(overrides = {}) {
  return {
    attack: 10,
    defence: 10,
    hp: 1000,
    criticalChance: 5,
    criticalDamage: 1.5,
    speed: 10,
    cp: 100,
    additionalDamageMul: 1,
    incomingDamageModifier: 1,
    block: 1,
    accuracy: 1,
    evasion: 1,
    ...overrides,
  };
}

function player(level, statOverrides = {}) {
  return {
    game: {
      stats: { lvl: level },
      gameClass: { stats: stats(statOverrides), skills: [] },
      effects: [],
      inventory: { arena: { items: [{ tokens: 0 }, { pvpSign: null }] } },
    },
  };
}

test('arena points stay within 5..30 and reward stronger opponent', () => {
  const attacker = player(20);
  const defender = player(35, { attack: 30, defence: 30 });

  const points = calculatePoints(attacker, defender, 'common', -1, false, {
    attacker: 1000,
    defender: 1200,
  });

  assert.equal(points, 30);
});

test('arena points never exceed cap for extreme mismatch', () => {
  const attacker = player(1);
  const defender = player(100, { attack: 10000, defence: 10000, hp: 100000 });

  const points = calculatePoints(attacker, defender, 'expansion', -1, false, {
    attacker: 1000,
    defender: 5000,
  });

  assert.equal(points, 30);
});

test('PvP medal reads direct arena format', () => {
  const session = player(20);
  session.game.inventory.arena.pvpSign = {
    effects: [
      { name: 'increasePvpDamage', value: 1.12 },
      { name: 'decreaseIncomingPvpDamage', value: 0.08 },
    ],
  };

  assert.deepEqual(getPvpSign(session), {
    increasePvpDamage: 1.12,
    decreaseIncomingPvpDamage: 0.08,
  });
});

test('PvP medal reads legacy wrapped inventory format and defaults safely', () => {
  const session = player(20);
  session.game.inventory.arena.items[1] = {
    pvpSign: {
      effects: [
        { name: 'increasePvpDamage', value: 1.05 },
        { name: 'decreaseIncomingPvpDamage', value: 0.03 },
      ],
    },
  };

  assert.deepEqual(getPvpSign(session), {
    increasePvpDamage: 1.05,
    decreaseIncomingPvpDamage: 0.03,
  });
  assert.deepEqual(getPvpSign(player(20)), {
    increasePvpDamage: 1,
    decreaseIncomingPvpDamage: 0,
  });
});
