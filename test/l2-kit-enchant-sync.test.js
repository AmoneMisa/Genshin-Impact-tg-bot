import test from 'node:test';
import assert from 'node:assert/strict';
import {syncKitEnchants} from '../functions/game/player/l2SkillEnchant.js';

test('syncKitEnchants tolerates a reset character whose skills are not a list', () => {
  for (const skills of [{}, {basic: 1}, undefined, null]) {
    assert.doesNotThrow(() => syncKitEnchants({game: {gameClass: {skills}}}));
  }
});
