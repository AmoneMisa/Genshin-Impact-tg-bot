import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlayerCard, getSocialState, presence, setFriend, stampLastSeen, ONLINE_WINDOW_MS } from '../miniapp/social.js';

const NOW = 1_700_000_000_000;
const member = (userId, name, extra = {}) => ({
  userId,
  gender: extra.gender || 'male',
  isHided: extra.isHided || false,
  userChatData: { user: { id: userId, first_name: name, username: extra.username, is_bot: extra.bot || false } },
  game: { stats: { lvl: extra.lvl || 10 }, gameClass: { stats: { name: extra.cls || 'warrior', hp: 100, maxHp: 120, damage: 30, defence: 12 } }, lastSeenAt: extra.seen, friends: extra.friends },
});

function chat() {
  return {
    members: [
      member(1, 'Me', { friends: ['2'] }),
      member(2, 'Lana', { cls: 'mage', gender: 'female', lvl: 31, seen: NOW - 60_000, username: 'lana' }),
      member(3, 'Kira', { lvl: 28, seen: NOW - 3 * 3600_000 }),
      member(4, 'Hidden', { isHided: true }),
      member(5, 'Bot', { bot: true }),
    ],
  };
}

test('presence says "В игре" inside the online window and how long ago otherwise', () => {
  assert.deepEqual(presence(NOW - 1000, NOW), { online: true, text: 'В игре' });
  assert.equal(presence(NOW - ONLINE_WINDOW_MS - 60_000, NOW).text, 'Был(а) 6 мин назад');
  assert.equal(presence(NOW - 4 * 3600_000, NOW).text, 'Был(а) 4ч назад');
  assert.equal(presence(NOW - 3 * 86400_000, NOW).text, 'Был(а) 3 дн назад');
  assert.equal(presence(0, NOW).text, 'Не в сети');
});

test('last seen is stamped at most once a minute', () => {
  const m = member(9, 'X');
  assert.equal(stampLastSeen(m, NOW), true);
  assert.equal(m.game.lastSeenAt, NOW);
  assert.equal(stampLastSeen(m, NOW + 30_000), false);
  assert.equal(stampLastSeen(m, NOW + 61_000), true);
});

test('social state lists friends, clanmates and candidates without hidden members or bots', () => {
  const state = getSocialState(chat(), 1, { clanMemberIds: [2, 3], clanName: 'WhiteOrder', now: NOW });
  assert.deepEqual(state.friends.map(f => f.name), ['Lana']);
  assert.equal(state.friends[0].online, true);
  assert.equal(state.friends[0].className, 'mage');
  assert.deepEqual(state.clanmates.map(f => [f.name, f.isFriend]), [['Lana', true], ['Kira', false]]);
  assert.deepEqual(state.candidates.map(f => f.name), ['Kira']);
  assert.equal(state.clanName, 'WhiteOrder');
});

test('friends can be added and removed only for listed chat members', () => {
  const c = chat();
  assert.deepEqual(setFriend(c, 1, '3', 'add'), { ok: true });
  assert.deepEqual(c.members[0].game.friends, ['2', '3']);
  assert.equal(setFriend(c, 1, '3', 'add').reason, 'already_friend');
  assert.equal(setFriend(c, 1, '1', 'add').reason, 'self');
  assert.equal(setFriend(c, 1, '4', 'add').reason, 'unknown_player');
  assert.equal(setFriend(c, 1, '5', 'add').reason, 'unknown_player');
  assert.equal(setFriend(c, 1, '99', 'add').reason, 'unknown_player');
  assert.deepEqual(setFriend(c, 1, '2', 'remove'), { ok: true });
  assert.deepEqual(c.members[0].game.friends, ['3']);
  assert.equal(setFriend(c, 1, '2', 'remove').reason, 'not_friend');
});

test('player card shows public stats and gear, never private inventory', () => {
  const card = getPlayerCard(chat(), 2, 1, { clanName: 'WhiteOrder', now: NOW });
  assert.equal(card.name, 'Lana');
  assert.equal(card.username, 'lana');
  assert.equal(card.clanName, 'WhiteOrder');
  assert.equal(card.isFriend, true);
  assert.equal(card.isSelf, false);
  assert.equal(card.stats.hp, 120);
  assert.equal(card.stats.attack, 30);
  assert.ok(Array.isArray(card.items));
  assert.equal('gold' in card, false);
  assert.equal(getPlayerCard(chat(), 4, 1), null);
  assert.equal(getPlayerCard(chat(), 1, 1).isSelf, true);
});
