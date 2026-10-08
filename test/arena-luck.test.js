import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_LUCK_COINS, arenaLuckCoinsForPlace, mailArenaLuckCoins } from '../functions/game/arena/arenaLuckRewards.js';
import { claimMail, getMailbox } from '../miniapp/promo.js';

const NOW = Date.UTC(2026, 9, 12);
const member = (userId, extra = {}) => ({ userId, userChatData: { user: { is_bot: Boolean(extra.bot) } }, isHided: Boolean(extra.hidden), game: { inventory: { luckCoins: 0 } } });

test('places 1-10 pay 15, 10, 7, then 5 and 3', () => {
  assert.deepEqual(ARENA_LUCK_COINS, [15, 10, 7, 5, 5, 5, 3, 3, 3, 3]);
  assert.equal(arenaLuckCoinsForPlace(1), 15);
  assert.equal(arenaLuckCoinsForPlace(3), 7);
  assert.equal(arenaLuckCoinsForPlace(6), 5);
  assert.equal(arenaLuckCoinsForPlace(10), 3);
  assert.equal(arenaLuckCoinsForPlace(11), 0);
  assert.equal(arenaLuckCoinsForPlace(0), 0);
  assert.deepEqual([...new Set(ARENA_LUCK_COINS)].sort((a, b) => a - b), [3, 5, 7, 10, 15]);
});

test('the top ten of the ladder get a mail with the coins, each prize only once per week', () => {
  const chat = { members: Array.from({ length: 12 }, (_, index) => member(index + 1)) };
  const ladder = chat.members.map(entry => ({ userId: entry.userId, rating: 2000 - entry.userId }));
  const awards = mailArenaLuckCoins(chat, ladder, '2026-10-12', NOW);
  assert.equal(awards.length, 10);
  assert.deepEqual(awards.map(award => award.amount), ARENA_LUCK_COINS);
  assert.equal(chat.members[10].game.mailbox, undefined, '11th place gets nothing');

  const first = chat.members[0];
  assert.equal(getMailbox(first, NOW).pending, 1);
  assert.equal(claimMail(first, 'arena:2026-10-12', NOW).ok, true);
  assert.equal(first.game.inventory.luckCoins, 15);

  assert.equal(mailArenaLuckCoins(chat, ladder, '2026-10-12', NOW).length, 0, 'a rerun pays nobody twice');
  assert.equal(mailArenaLuckCoins(chat, ladder, '2026-10-19', NOW).length, 10, 'the next week pays again');
});

test('bots, hidden players and people who left the chat are skipped', () => {
  const chat = { members: [member(1, { bot: true }), member(2, { hidden: true }), member(3)] };
  const ladder = [{ userId: 1 }, { userId: 2 }, { userId: 3 }, { userId: 99 }];
  const awards = mailArenaLuckCoins(chat, ladder, 'w', NOW);
  assert.deepEqual(awards.map(award => [award.userId, award.place]), [[3, 3]]);
});
