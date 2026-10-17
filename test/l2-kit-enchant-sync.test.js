import test from 'node:test';
import assert from 'node:assert/strict';
import {syncKitEnchants} from '../functions/game/player/l2SkillEnchant.js';

test('syncKitEnchants tolerates a reset character whose skills are not a list', () => {
  for (const skills of [{}, {basic: 1}, undefined, null]) {
    assert.doesNotThrow(() => syncKitEnchants({game: {gameClass: {skills}}}));
  }
});

test('defaults give a list of skills and repair an object left by the old defaults', async () => {
  const {default: defaults} = await import('../functions/getters/getLostFieldsInSession.js');
  const fresh = {game: {}};
  defaults(fresh);
  assert.ok(Array.isArray(fresh.game.gameClass.skills));
  const saved = {game: {gameClass: {stats: fresh.game.gameClass.stats, skills: {...fresh.game.gameClass.skills}}}};
  defaults(saved);
  assert.ok(Array.isArray(saved.game.gameClass.skills));
  assert.equal(saved.game.gameClass.skills.length, fresh.game.gameClass.skills.length);
});
