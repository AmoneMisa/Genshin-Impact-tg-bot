import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAYER_TOOLS, CHAT_TOOLS, GLOBAL_TOOLS, parseAmount } from '../miniapp/adminTools.js';

const tool = id => PLAYER_TOOLS.find(item => item.id === id);
const member = () => ({
  userId: 1,
  game: {
    inventory: { gold: 10, crystals: 0, ironOre: 5 },
    bonusChances: 1,
    chanceToSteal: 0,
    stats: { lvl: 1, currentExp: 0, needExp: 100 },
    gameClass: { stats: { hp: 1 } },
  },
  timerSwordCallback: 99,
  timerTitleCallback: 99,
  chestCounter: 3,
  chosenChests: [1],
  chestButtons: [1],
  chestTries: 0,
});

test('amounts must be whole, non-zero and bounded', () => {
  assert.equal(parseAmount(5), 5);
  assert.equal(parseAmount('-7'), -7);
  assert.equal(parseAmount(0), null);
  assert.equal(parseAmount(1.5), null);
  assert.equal(parseAmount('12abc'), null);
  assert.equal(parseAmount(1_000_000_001), null);
  assert.equal(parseAmount(undefined), null);
});

test('resource tools add, subtract and never go below zero', () => {
  const m = member();
  tool('add_gold').apply(m, 90);
  tool('add_crystals').apply(m, 3);
  tool('add_iron_ore').apply(m, -50);
  tool('add_bonus_chance').apply(m, 2);
  tool('add_steal_chance').apply(m, 4);
  assert.deepEqual(m.game.inventory, { gold: 100, crystals: 3, ironOre: 0 });
  assert.equal(m.game.bonusChances, 3);
  assert.equal(m.game.chanceToSteal, 4);
});

test('timer tools reset exactly their own cooldowns', () => {
  const m = member();
  tool('reset_sword_timer').apply(m);
  assert.equal(m.timerSwordCallback, 0);
  assert.equal(m.timerTitleCallback, 99);
  tool('reset_title_timer').apply(m);
  assert.equal(m.timerTitleCallback, 0);
  tool('reset_chest_timer').apply(m);
  assert.deepEqual([m.chestCounter, m.chosenChests, m.chestButtons, m.chestTries], [0, [], [], 1]);
});

test('every old owner command has a tool and ids are unique', () => {
  const ids = [...PLAYER_TOOLS, ...CHAT_TOOLS, ...GLOBAL_TOOLS].map(item => item.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ['add_gold', 'add_luck_coins', 'add_crystals', 'add_iron_ore', 'add_experience', 'add_bonus_chance', 'add_steal_chance',
    'respawn', 'recalc_stats', 'reset_chest_timer', 'reset_sword_timer', 'reset_title_timer', 'reset_arcade',
    'kill_boss', 'reset_point', 'reset_elements', 'update_all_stats', 'update_all_skills', 'restore_chests',
    'reset_sword_timers', 'clear_boss_sessions', 'update_boss_model', 'hide_dead_souls', 'debug_log', 'broadcast']) {
    assert.ok(ids.includes(id), id);
  }
  assert.ok(PLAYER_TOOLS.filter(item => item.amountLabel).every(item => ['add_gold', 'add_luck_coins', 'add_crystals', 'add_iron_ore', 'add_experience', 'add_bonus_chance', 'add_steal_chance'].includes(item.id)));
});
