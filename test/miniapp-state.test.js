import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GROUP_ONLY_FEATURE_IDS,
  createMiniAppFeatures,
  createMiniAppState,
  isPrivateMiniAppContext,
} from '../miniapp/state.js';

const session = {
  game: {
    stats: { lvl: 12, currentExp: 40, needExp: 100 },
    inventory: { gold: 50, crystals: 3, ironOre: 7 },
    gameClass: { stats: { name: 'mage', damage: 9, defense: 4, hp: 20 } },
  },
};

test('private Mini App context is detected only when chat and user ids match', () => {
  assert.equal(isPrivateMiniAppContext({ chatId: 7, user: { id: 7 } }), true);
  assert.equal(isPrivateMiniAppContext({ chatId: '7', user: { id: 7 } }), true);
  assert.equal(isPrivateMiniAppContext({ chatId: -1007, user: { id: 7 } }), false);
  assert.equal(isPrivateMiniAppContext({ chatId: null, user: { id: null } }), false);
});

test('feature catalog marks the exact group-only feature set', () => {
  const features = createMiniAppFeatures({ chatId: -1007, user: { id: 7 } });
  const groupOnlyIds = features.filter(feature => feature.groupOnly).map(feature => feature.id).sort();

  assert.deepEqual(groupOnlyIds, [...GROUP_ONLY_FEATURE_IDS].sort());
  assert.equal(features.every(feature => feature.available), true);
  assert.equal(features.every(feature => feature.unavailableReason === null), true);
});

test('private bootstrap disables group-only cards but keeps private-capable features active', () => {
  const state = createMiniAppState(session, {
    chatId: 7,
    chatType: 'private',
    user: { id: 7, first_name: 'Rita' },
  });
  const byId = Object.fromEntries(state.features.map(feature => [feature.id, feature]));

  for (const id of GROUP_ONLY_FEATURE_IDS) {
    assert.equal(byId[id].available, false, id);
    assert.equal(byId[id].unavailableReason, 'group_only', id);
  }

  for (const id of ['profile', 'skills', 'inventory', 'equipment', 'builds', 'arena', 'chest', 'point21', 'elements', 'clan', 'horoscope', 'arcade', 'updates', 'feedback', 'help']) {
    assert.equal(byId[id].available, true, id);
    assert.equal(byId[id].unavailableReason, null, id);
  }

  assert.equal(byId.profile.groupOnly, false);
  assert.equal(state.context.chatType, 'private');
  assert.equal(state.context.user.id, 7);
});
