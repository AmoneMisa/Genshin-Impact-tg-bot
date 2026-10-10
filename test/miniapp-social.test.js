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
  assert.deepEqual(setFriend(c, 1, '3', 'add'), { ok: true, status: 'requested' });
  assert.deepEqual(c.members[0].game.friends, ['2']);
  assert.equal(setFriend(c, 1, '3', 'add').reason, 'already_requested');
  assert.deepEqual(setFriend(c, 3, '1', 'accept'), { ok: true, status: 'friends' });
  assert.deepEqual(c.members[0].game.friends, ['2', '3']);
  assert.equal(setFriend(c, 1, '3', 'add').reason, 'already_friend');
  assert.equal(setFriend(c, 1, '1', 'add').reason, 'self');
  assert.equal(setFriend(c, 1, '4', 'add').reason, 'unknown_player');
  assert.equal(setFriend(c, 1, '5', 'add').reason, 'unknown_player');
  assert.equal(setFriend(c, 1, '99', 'add').reason, 'unknown_player');
  assert.deepEqual(setFriend(c, 1, '2', 'remove'), { ok: true, status: 'removed' });
  assert.deepEqual(c.members[0].game.friends, ['3']);
  assert.equal(setFriend(c, 1, '2', 'remove').reason, 'not_friend');
});

test('player card never reveals stats, gear or private inventory', () => {
  const card = getPlayerCard(chat(), 2, 1, { clanName: 'WhiteOrder', now: NOW });
  assert.equal(card.name, 'Lana');
  assert.equal(card.username, 'lana');
  assert.equal(card.clanName, 'WhiteOrder');
  assert.equal(card.isFriend, true);
  assert.equal(card.isSelf, false);
  for(const key of ['stats','items','equippedSlots'])assert.equal(key in card,false);
  assert.equal('gold' in card, false);
  assert.equal(getPlayerCard(chat(), 4, 1), null);
  assert.equal(getPlayerCard(chat(), 1, 1).isSelf, true);
});
test('interaction buttons respect clan privileges, party leadership and shared-clan duels',()=>{
 const c=chat(),clan={members:[{userId:1,role:'owner'}]};
 assert.equal(getPlayerCard(c,3,1,{viewerClan:clan}).canInviteClan,true);
 clan.members[0].role='member';assert.equal(getPlayerCard(c,3,1,{viewerClan:clan}).canInviteClan,false);
 clan.members[0].role='officer';assert.equal(getPlayerCard(c,3,1,{viewerClan:clan,clanName:'Other'}).canInviteClan,false);
 assert.equal(getPlayerCard(c,3,1,{viewerClan:clan,targetInClan:true,clanName:null}).canInviteClan,false);
 clan.members.push({userId:3,role:'member'});assert.equal(getPlayerCard(c,3,1,{viewerClan:clan}).canInviteClan,false);
 const viewer=c.members[0];viewer.game.party={id:'p1',leaderId:'2'};
 assert.equal(getPlayerCard(c,3,1).canInviteParty,false);
 viewer.game.party.leaderId='1';assert.equal(getPlayerCard(c,3,1).canInviteParty,true);
 assert.equal(getPlayerCard(c,2,1,{viewerClan:clan}).canDuel,false);
 clan.members.push({userId:2,role:'member'});assert.equal(getPlayerCard(c,2,1,{viewerClan:clan}).canDuel,true);
});

import { damageMeter, partyStrip } from '../webapp/boss-hud.js';
test('raid party and damage rows open other players’ cards, not your own', () => {
  const rows = [{ userId: 2, name: 'Lana', damage: 10, share: 60, className: 'mage', isYou: false }, { userId: 1, name: 'Me', damage: 5, share: 40, className: 'warrior', isYou: true }];
  const party = partyStrip(rows);
  const meter = damageMeter(rows);
  for (const html of [party, meter]) {
    assert.match(html, /data-player-card="2"/);
    assert.doesNotMatch(html, /data-player-card="1"/);
  }
});

test('friend requests are mutual: decline, cancel and remove clean up both sides', () => {
  const c = chat();
  setFriend(c, 1, '3', 'add');
  assert.deepEqual(c.members.find(m => m.userId === 3).game.friendRequestsIn, ['1']);
  assert.equal(getSocialState(c, 3).incoming.length, 1);
  assert.equal(setFriend(c, 1, '3', 'decline').reason, 'no_request');
  assert.equal(setFriend(c, 3, '1', 'decline').status, 'declined');
  assert.deepEqual(c.members[0].game.friendRequestsOut, []);

  setFriend(c, 1, '3', 'add');
  assert.equal(setFriend(c, 1, '3', 'cancel').status, 'cancelled');
  assert.deepEqual(c.members.find(m => m.userId === 3).game.friendRequestsIn, []);

  setFriend(c, 3, '1', 'add');
  assert.equal(setFriend(c, 1, '3', 'add').status, 'friends');
  assert.equal(setFriend(c, 3, '1', 'remove').status, 'removed');
  assert.equal(c.members[0].game.friends.includes('3'), false);
});
