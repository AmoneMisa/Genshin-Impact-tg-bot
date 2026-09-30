import test from 'node:test';
import assert from 'node:assert/strict';
import { goldLockForMember, goldSpendCallback, LEGACY_LOCK_MS, tableLockFor } from '../functions/game/general/goldLock.js';
import { transferGoldInChat } from '../functions/game/gold/transferGold.js';
import { joinPoint21, setPoint21Bet, startPoint21 } from '../miniapp/point21.js';
import { startElements } from '../miniapp/elements.js';
import { STALE_MS } from '../miniapp/tableGames.js';

function makeChat(gold = 10_000) {
  return {
    game: {},
    members: [1, 2].map(id => ({ userId: id, userChatData: { user: { id, username: `u${id}` } }, game: { inventory: { gold } } })),
  };
}

test('a Mini App seat locks gold until the table finishes or stalls', () => {
  const chat = makeChat();
  startPoint21(chat, 1, { now: 1_000 });
  assert.equal(tableLockFor(chat, 1, 2_000), '21 очко');
  assert.equal(tableLockFor(chat, 2, 2_000), null);
  assert.equal(tableLockFor(chat, 1, 2_000, 'pointsMiniApp'), null);
  assert.equal(tableLockFor(chat, 1, 1_000 + 25_000 + STALE_MS + 1), null);
  chat.game.pointsMiniApp.phase = 'finished';
  assert.equal(tableLockFor(chat, 1, 2_000), null);
});

test('a chat-table seat locks gold while the game is fresh', () => {
  const chat = makeChat();
  chat.game.elements = { players: { 2: { bet: 0 } }, gameSessionLastUpdateAt: 5_000 };
  assert.equal(tableLockFor(chat, 2, 6_000), 'Стихии');
  assert.equal(tableLockFor(chat, 2, 5_001 + LEGACY_LOCK_MS), null);
  assert.equal(tableLockFor(chat, 2, 6_000, 'elements'), null);
  assert.match(goldLockForMember(chat.members[1], chat, 6_000), /«Стихии»/);
  assert.equal(goldLockForMember(chat.members[0], chat, 6_000), null);
});

test('transfers are refused while the sender is seated', () => {
  const chat = makeChat();
  startElements(chat, 1, { now: Date.now() });
  const result = transferGoldInChat(chat, 1, 2, '500');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'in_table_game');
  assert.equal(chat.members[0].game.inventory.gold, 10_000);
  assert.equal(transferGoldInChat(chat, 2, 1, '500').ok, true);
});

test('betting at one Mini App table while seated at another is refused', () => {
  const chat = makeChat();
  const now = 1_000;
  startElements(chat, 1, { now });
  startPoint21(chat, 2, { now });
  joinPoint21(chat, 1, { now });
  assert.equal(setPoint21Bet(chat, 1, 500, { now }).reason, 'in_table_game');
  assert.equal(setPoint21Bet(chat, 1, 0, { now }).ok, true);
  assert.equal(setPoint21Bet(chat, 2, 500, { now }).ok, true);
});

test('gold-spending bot buttons are recognised with their game chat', () => {
  assert.deepEqual(goldSpendCallback('shop.-100123.potions.hp.buy'), { chatId: '-100123', except: null });
  assert.deepEqual(goldSpendCallback('builds.-100123.forge.craft_rare.0'), { chatId: '-100123', except: null });
  assert.deepEqual(goldSpendCallback('sendGoldRecipient.-100123.42'), { chatId: '-100123', except: null });
  assert.deepEqual(goldSpendCallback('dice_allin_bet'), { chatId: null, except: null });
  assert.deepEqual(goldSpendCallback('clan.contribute_gold'), { chatId: null, except: null });
  assert.deepEqual(goldSpendCallback('points_x2_bet'), null);
  assert.deepEqual(goldSpendCallback('points_double_bet'), { chatId: null, except: 'points' });
  assert.equal(goldSpendCallback('clan.contribute_crystals'), null);
  assert.equal(goldSpendCallback('shop.-100123.potions'), null);
  assert.equal(goldSpendCallback('builds.-100123.forge.craft_rare'), null);
});
