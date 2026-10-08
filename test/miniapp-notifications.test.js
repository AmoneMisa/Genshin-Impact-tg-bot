import test from 'node:test';
import assert from 'node:assert/strict';
import { bossSpawnRecipients, getBadges, pushAll, pushTo } from '../miniapp/notifications.js';
import { setFriend } from '../miniapp/social.js';
import { rejectClanApplication, transferClanOwnership } from '../miniapp/clanManagement.js';
import { badgeHtml, tabBadgeCount, NAV_TABS } from '../webapp/nav.js';

const member = (userId, name) => ({ userId, userChatData: { user: { id: userId, first_name: name } }, game: {} });
const chat = () => ({ members: [member(1, 'A'), member(2, 'B')] });

test('pushTo sends once per 30s per text and swallows send failures', async () => {
  const sent = [];
  const send = async (id, text) => { sent.push([id, text]); };
  assert.equal(await pushTo(7, 'hello', { send, now: 1_000_000 }), true);
  assert.equal(await pushTo(7, 'hello', { send, now: 1_010_000 }), false);
  assert.equal(await pushTo(7, 'hello', { send, now: 1_040_000 }), true);
  assert.equal(sent.length, 2);
  assert.equal(await pushTo(8, 'boom', { send: async () => { throw new Error('blocked'); }, now: 2_000_000 }), false);
  assert.deepEqual(await pushAll(undefined), []);
});

test('badges count incoming friend requests, manager applications and claimable clan tasks', () => {
  const c = chat();
  setFriend(c, 1, '2', 'add');
  const first = getBadges(c, 2, null);
  assert.deepEqual([first.friends, first.clan, first.total], [1, 0, 1]);
  assert.equal(getBadges(c, 1, null).friends, 0);

  const clan = {
    owner: 1,
    members: [{ userId: 1, role: 'owner' }, { userId: 2, role: 'member' }],
    applications: [9, 10],
    tasks: { lastResetAt: 1, progress: { 1: { contribute: true } }, claimed: {} },
    quiz: { participants: { 1: { correct: true } } },
  };
  const owner = getBadges(c, 1, clan);
  assert.ok(owner.clan >= 3);
  const plain = getBadges(c, 2, clan);
  assert.ok(plain.clan < owner.clan);
});

test('clan management results carry pushes for the affected player', () => {
  const clan = { name: 'Wolves', owner: 1, members: [{ userId: 1, role: 'owner' }, { userId: 2, role: 'member' }], applications: [9] };
  const rejected = rejectClanApplication(clan, 1, 9);
  assert.deepEqual(rejected.notify.map(n => n.userId), ['9']);
  assert.match(rejected.notify[0].text, /Wolves/);
  assert.deepEqual(transferClanOwnership(clan, 1, 2).notify.map(n => n.userId), ['2']);
});

test('red dot html is empty for zero and caps at 9+; tabs sum their features', () => {
  assert.equal(badgeHtml(0), '');
  assert.match(badgeHtml(12), />9\+</);
  const clanTab = NAV_TABS.find(tab => tab.id === 'clan');
  assert.equal(tabBadgeCount(clanTab, { friends: 2, clan: 3, boss: 5 }), 5);
});

test('personal badges flag ready bonus, chest, arena and free gacha spins; boss comes from the caller', () => {
  const c = chat();
  const idle = { chestTries: 0, chosenChests: [], chestCounter: 0, game: { bonusChances: 0, arenaChances: 0, gacha: [{ name: 'a', freeSpins: 0 }] } };
  assert.equal(getBadges(c, 1, null, { session: idle }).total, 0);

  const ready = { chestTries: 1, chosenChests: [], chestCounter: 0, game: { bonusChances: 2, arenaChances: 3, gacha: [{ name: 'a', freeSpins: 1 }] } };
  const badges = getBadges(c, 1, null, { session: ready, bossAlive: true });
  assert.deepEqual([badges.bonus, badges.chest, badges.arena, badges.gacha, badges.boss], [1, 1, 1, 1, 1]);
  assert.equal(badges.total, 5);
});

test('boss spawn recipients are recently seen humans except the summoner', () => {
  const now = 10 * 24 * 3600_000;
  const seen = (userId, extra = {}) => ({ userId, ...extra, userChatData: { user: { is_bot: extra.bot } }, game: { lastSeenAt: extra.at ?? now - 1000 } });
  const c = { members: [seen(1), seen(2), seen(3, { at: 0 }), seen(4, { bot: true }), seen(5, { isHided: true }), seen(6)] };
  assert.deepEqual(bossSpawnRecipients(c, 1, now), ['2', '6']);
});
