import test from 'node:test';
import assert from 'node:assert/strict';
import { enchantSkillForMiniApp, getSkillsState } from '../miniapp/skills.js';

function makeSession(overrides = {}) {
  return {
    game: {
      stats: { lvl: 20 },
      inventory: { gold: 10000, crystals: 100, ironOre: 100, sp: 100 },
      gameClass: {
        stats: { name: 'mage', translateName: 'Маг' },
        skills: [{
          slot: 1,
          name: 'Грозовая стужа',
          description: 'Тестовый навык',
          effect: 'magic_attack',
          damageModifier: 5,
          cooldown: 18,
          isDealDamage: true,
          isHeal: false,
          isShield: false,
          needLvl: 10,
          cost: 43,
          costHp: 0,
          enchantLevel: 0,
        }],
      },
      ...overrides.game,
    },
    ...overrides,
  };
}

test('skills state exposes server-calculated current and next values', () => {
  const state = getSkillsState(makeSession());
  assert.equal(state.classTitle, 'Маг');
  assert.equal(state.inventory.sp, 100);
  assert.equal(state.skills.length, 1);
  assert.equal(state.skills[0].power.value, 500);
  assert.equal(state.skills[0].next.power.value, 525);
  assert.equal(state.skills[0].usage.mp, 43);
  assert.equal(state.skills[0].next.usage.mp, 42);
  assert.equal(state.skills[0].next.usage.cooldownSeconds, 17.6);
  assert.deepEqual(state.skills[0].upgradeCost, { gold: 2000, crystals: 5, ironOre: 15, sp: 20 });
  assert.equal(state.skills[0].canUpgrade, true);
});

test('Mini App enchant deducts resources and raises only the selected skill', () => {
  const session = makeSession();
  const result = enchantSkillForMiniApp(session, 1);

  assert.equal(result.ok, true);
  assert.equal(result.level, 1);
  assert.equal(session.game.gameClass.skills[0].enchantLevel, 1);
  assert.equal(session.game.inventory.gold, 8000);
  assert.equal(session.game.inventory.crystals, 95);
  assert.equal(session.game.inventory.ironOre, 85);
  assert.equal(session.game.inventory.sp, 80);
  assert.equal(result.skills.skills[0].power.value, 525);
});

test('failed Mini App enchant does not mutate resources or level', () => {
  const session = makeSession();
  session.game.inventory.sp = 19;
  const before = structuredClone(session.game);
  const result = enchantSkillForMiniApp(session, 1);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'not_enough_sp');
  assert.deepEqual(session.game, before);
});

test('Mini App enchant rejects unknown slots without mutation', () => {
  const session = makeSession();
  const before = structuredClone(session.game);
  const result = enchantSkillForMiniApp(session, 99);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'invalid_skill');
  assert.deepEqual(session.game, before);
});
