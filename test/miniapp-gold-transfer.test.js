import test from 'node:test';
import assert from 'node:assert/strict';
import { getGoldTransferState, transferGoldForMiniApp } from '../miniapp/goldTransfer.js';

function member(userId, gold, overrides = {}) {
  return {
    userId,
    isHided: false,
    userChatData: {
      status: 'member',
      user: {
        id: userId,
        first_name: `Player ${userId}`,
        username: `player${userId}`,
        is_bot: false,
      },
    },
    game: { inventory: { gold } },
    ...overrides,
  };
}

function chat() {
  return {
    members: [
      member(1, 1000),
      member(2, 50, { userChatData: { status: 'member', user: { id: 2, first_name: 'Beta', username: 'beta', is_bot: false } } }),
      member(3, 75, { isHided: true }),
      member(4, 100, { userChatData: { status: 'member', user: { id: 4, first_name: 'Bot', is_bot: true } } }),
      member(5, 100, { userChatData: { status: 'left', user: { id: 5, first_name: 'Left', is_bot: false } } }),
    ],
  };
}

test('Mini App transfer state exposes only eligible recipients', () => {
  const state = getGoldTransferState(chat(), 1);
  assert.equal(state.gold, 1000);
  assert.deepEqual(state.recipients, [{ id: '2', name: 'Beta', username: 'beta' }]);
});

test('Mini App transfer returns updated sender balance and recipient list', () => {
  const state = chat();
  const result = transferGoldForMiniApp(state, 1, 2, '250');

  assert.equal(result.ok, true);
  assert.equal(result.amount, 250);
  assert.equal(result.recipientId, '2');
  assert.equal(result.senderGold, 750);
  assert.equal(result.transfer.gold, 750);
  assert.equal(state.members[1].game.inventory.gold, 300);
});

test('Mini App transfer surfaces validation failure without mutation', () => {
  const state = chat();
  const result = transferGoldForMiniApp(state, 1, 2, '-10');

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'invalid_amount');
  assert.equal(result.transfer.gold, 1000);
  assert.equal(state.members[0].game.inventory.gold, 1000);
  assert.equal(state.members[1].game.inventory.gold, 50);
});
