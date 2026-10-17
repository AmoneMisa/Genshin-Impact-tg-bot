import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultLoadout } from '../webapp/gwent-builder.js';
import { legalPlays } from '../webapp/gwent-engine.js';
import { gwentEntry, parseGwentEntry, gwentAppLink } from '../webapp/gwent-links.js';
import { runGwent, emptyLobby, lobbyBusy } from '../miniapp/gwentLobby.js';

// The lobby is shared by every chat: friends, invitations, matches and the search queue are not tied
// to a chat. Players are only known by their user id here; where they chat does not matter.

const NOW = 5_000_000;
const deck = defaultLoadout();
// Hero records: friendships are mutual and shared by all chats (1 is friends with 4 and 5).
const heroes = {
  1: { name: 'Анна', friends: ['4', '5'] }, 4: { name: 'Борис', friends: ['1'] }, 5: { name: 'Вера', friends: ['1'] },
  2: { name: 'Глеб', friends: [] }, 3: { name: 'Дина', friends: [] },
};
const world = () => ({ lobby: emptyLobby(), saved: {} });
const peopleOf = user => Object.fromEntries(heroes[user].friends.map(friend => [friend, { ...heroes[friend], lastSeenAt: 0 }]));

function ask(w, user, mutation, body = null, now = NOW, extra = {}) {
  return runGwent({ lobby: w.lobby, userId: user, name: heroes[user].name, people: { ...peopleOf(user), [user]: { ...heroes[user] }, ...extra.people }, loadouts: w.saved[user] || {},
    saveLoadout: loadout => { (w.saved[user] ||= {})[loadout.faction] = loadout; }, mutation, body, now, rng: () => 0.4, ...extra });
}
const act = (w, user, body, now, extra) => ask(w, user, true, body, now, extra);
const read = (w, user, now, extra) => ask(w, user, false, null, now, extra);

/** Players 1 and 2 matched through the queue, setup choices done, player one to move. */
function matched() {
  const w = world();
  assert.equal(act(w, 1, { action: 'join', loadout: deck }).result.searching, true);
  const second = act(w, 2, { action: 'join', loadout: defaultLoadout('nilfgaard') });
  assert.ok(second.result.match, 'the second player is matched at once');
  const match = w.lobby.gwent.matches[0];
  for (let guard = 0; match.state.pending && guard < 4; guard += 1) {
    const user = match.state.pending.side === 'player' ? 1 : 2;
    assert.ok(act(w, user, { action: 'choice', matchId: match.id, revision: match.revision, choiceId: 'done' }).result.ok);
  }
  match.state.starter = match.state.turn = 'player';
  return { w, match };
}

test('anyone can meet anyone through the queue and each sees the match', () => {
  const { w, match } = matched();
  const one = read(w, 1, NOW + 1000).result, two = read(w, 2, NOW + 1000).result;
  assert.equal(one.match.id, two.match.id);
  assert.equal(one.match.opponent, 'Глеб');
  assert.equal(two.match.opponent, 'Анна');
  assert.equal(one.match.faction, 'northern-realms');
  assert.equal(two.match.faction, 'nilfgaard');
  assert.equal(one.match.state.sides.ai.hand.length, 0, "the opponent's hand stays hidden");
  const play = legalPlays(match.state, 'player').find(item => item.row);
  assert.equal(act(w, 2, { action: 'play', matchId: match.id, revision: match.revision, uid: play.uid, row: play.row }).result.ok, false, 'only the player to move can play');
  assert.equal(act(w, 1, { action: 'pass', matchId: match.id, revision: match.revision }).result.ok, true);
});

test('a friend who never used Gwent can be invited, from any chat, and accepts with their own deck', () => {
  const w = world();
  const sent = act(w, 1, { action: 'invite', targetId: '5', loadout: deck });
  assert.equal(sent.result.ok, true);
  assert.equal(sent.result.invitation.toName, 'Вера');
  assert.equal(w.lobby.profiles['5'], undefined, 'the friend has no profile yet');
  const view = read(w, 5, NOW + 1000).result;
  assert.equal(view.incoming.length, 1, 'the friend sees the invitation although they never used the lobby');
  assert.equal(view.incoming[0].fromName, 'Анна');
  assert.equal(act(w, 4, { action: 'accept_invite', inviteId: view.incoming[0].id, loadout: deck }).result.ok, false, 'another friend cannot take it');
  const accepted = act(w, 5, { action: 'accept_invite', inviteId: view.incoming[0].id, loadout: defaultLoadout('monsters') }, NOW + 2000);
  assert.equal(accepted.result.ok, true);
  assert.equal(accepted.result.match.opponent, 'Анна');
  assert.equal(accepted.result.match.faction, 'monsters');
  assert.equal(read(w, 1, NOW + 3000).result.match.opponent, 'Вера');
  assert.equal(lobbyBusy(w.lobby, 1), true);
});

test('a player can be invited by nickname even without being a friend, but only after the server found them', () => {
  const w = world();
  // Without a server-side lookup a stranger is refused.
  assert.equal(act(w, 1, { action: 'invite', targetId: '2', loadout: deck }, NOW, { people: { 2: { ...heroes[2] } } }).result.ok, false);
  const lookup = { people: { 2: { ...heroes[2], lastSeenAt: 0 } }, strangers: ['2'] };
  const sent = act(w, 1, { action: 'invite', targetId: '2', loadout: deck }, NOW, lookup);
  assert.equal(sent.result.ok, true);
  assert.equal(sent.result.invitation.open, true);
  assert.equal(sent.result.invitation.toName, 'Глеб');
  const id = sent.result.invitation.id;
  // No Telegram message for a stranger: only friends can be notified.
  assert.equal(act(w, 1, { action: 'push_invite', inviteId: id }).result.ok, false);
  assert.equal(read(w, 3, NOW + 500).result.incoming.length, 0, 'a third player does not see it');
  assert.equal(read(w, 2, NOW + 1000).result.incoming[0].fromName, 'Анна');
  const accepted = act(w, 2, { action: 'accept_invite', inviteId: id, loadout: deck }, NOW + 2000);
  assert.equal(accepted.result.ok, true);
  assert.ok(accepted.result.match);
});

test('players who search or play cannot start invitations, and a friend who plays cannot be invited', () => {
  const { w } = matched();
  assert.equal(act(w, 4, { action: 'invite', targetId: '1', loadout: deck }).result.ok, false, 'player one is in a match');
  const w2 = world();
  act(w2, 1, { action: 'join', loadout: deck });
  assert.equal(act(w2, 1, { action: 'invite', targetId: '4', loadout: deck }).result.ok, false, 'searching players cannot invite');
  assert.equal(act(w2, 4, { action: 'invite', targetId: '1', loadout: deck }).result.ok, false, 'a searching friend cannot be invited');
  assert.equal(act(w2, 1, { action: 'cancel' }).result.searching, false);
  assert.equal(act(w2, 1, { action: 'join', loadout: deck }).result.ok, true);
});

test('a link invitation opens for the first other player whatever their chat', () => {
  const w = world();
  const link = act(w, 1, { action: 'invite', targetId: null, loadout: deck }).result.invitation;
  assert.equal(link.to, null);
  assert.equal(read(w, 3, NOW + 1000, { invite: link.id }).result.invitation.fromName, 'Анна');
  assert.equal(act(w, 1, { action: 'accept_invite', inviteId: link.id, loadout: deck }).result.ok, false, 'not by the author');
  assert.equal(act(w, 3, { action: 'accept_invite', inviteId: link.id, loadout: deck }).result.ok, true);
});

test('friends see the live game of a friend and can watch it, and so can anybody from the list', () => {
  const { w, match } = matched();
  const friend = read(w, 4, NOW + 1000).result.friends.find(row => row.userId === '1');
  assert.equal(friend.busy, true);
  assert.equal(friend.watchId, match.id);
  const visit = read(w, 3, NOW + 1000);
  assert.equal(visit.result.games.find(game => game.id === match.id).finished, false);
  assert.equal(visit.lobbyChanged, false, 'looking at the list stores nothing');
  const watched = read(w, 3, NOW + 1000, { watch: match.id }).result;
  assert.equal(watched.spectating.state.sides.player.hand.length, 0, 'no hands for spectators');
  assert.equal(read(w, 3, NOW + 1000, { watch: 'missing' }).result.ok, false);
});

test('decks are saved on the hero, not in the shared lobby', () => {
  const w = world();
  const bad = act(w, 1, { action: 'save', loadout: { ...deck, counts: {} } });
  assert.equal(bad.result.ok, false);
  assert.equal(w.saved[1], undefined);
  const good = act(w, 1, { action: 'save', loadout: deck });
  assert.equal(good.result.ok, true);
  assert.deepEqual(w.saved[1][deck.faction], deck);
  assert.deepEqual(Object.keys(w.lobby.gwent.loadouts), [], 'the lobby holds no decks');
  assert.equal(read(w, 1, NOW + 1000, { loadouts: w.saved[1] }).result.loadouts[deck.faction].leaderId, deck.leaderId);
});

test('a rematch works between players of any chats and a message goes to a player who left', () => {
  const { w, match } = matched();
  assert.ok(act(w, 1, { action: 'surrender', matchId: match.id, revision: match.revision }).result.ok);
  w.lobby.profiles['2'].lastSeenAt = NOW - 3_600_000; // player two closed the app an hour ago
  const offer = act(w, 1, { action: 'rematch', matchId: match.id }, NOW + 1000);
  assert.equal(offer.result.notifyPlay.kind, 'rematch');
  assert.equal(offer.result.notifyPlay.userId, '2');
  const accepted = act(w, 2, { action: 'rematch', matchId: match.id }, NOW + 2000);
  assert.equal(accepted.result.ok, true);
  assert.notEqual(accepted.result.match.id, match.id);
  const next = w.lobby.gwent.matches[1];
  act(w, 1, { action: 'surrender', matchId: next.id, revision: next.revision }, NOW + 3000);
  for (const user of [1, 2]) act(w, user, { action: 'dismiss', matchId: next.id }, NOW + 4000);
  assert.equal(lobbyBusy(w.lobby, 1) || lobbyBusy(w.lobby, 2), false);
});

test('polling stores nothing until the profile heartbeat is due, and idle profiles are forgotten', () => {
  const { w } = matched();
  read(w, 1, NOW + 1000);
  assert.equal(read(w, 1, NOW + 2000).lobbyChanged, false, 'two quick polls change nothing');
  assert.equal(read(w, 1, NOW + 25_000).lobbyChanged, true, 'the profile is refreshed every 20 s');
  const old = world();
  act(old, 1, { action: 'join', loadout: deck }); act(old, 1, { action: 'cancel' });
  read(old, 3, NOW + 3 * 24 * 60 * 60_000);
  assert.equal(Object.keys(old.lobby.profiles).length, 0);
});

test('links belong to the app, not to a chat', () => {
  const token = '12345678-1234-1234-1234-123456789abc';
  assert.equal(gwentEntry(null, 'invite', token), `gwent_g_i_${token}`);
  assert.deepEqual(parseGwentEntry(`gwent_g_i_${token}`), { chatId: null, kind: 'invite', token });
  assert.deepEqual(parseGwentEntry(`gwent_g_p_${token}`), { chatId: null, kind: 'play', token });
  assert.equal(gwentAppLink('https://t.me/bot', null, 'watch', token), `https://t.me/bot?startapp=gwent_g_w_${token}`);
  assert.deepEqual(parseGwentEntry(`gwent_-100_w_${token}`), { chatId: -100, kind: 'watch', token }, 'older links still open');
  assert.equal(parseGwentEntry(`gwent_x_w_${token}`), null);
});
