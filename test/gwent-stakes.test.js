import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultLoadout } from '../webapp/gwent-builder.js';
import { gwentAction, gwentState, gwentFingerprint, INVITE_TTL } from '../miniapp/gwent.js';
import { parseStake, cannotPay } from '../miniapp/gwentStakes.js';
import { collectCredits, takeStake, walletOf } from '../miniapp/gwentWallet.js';

const setup = (count = 4) => ({ game: {}, members: Array.from({ length: count }, (_, i) => i + 1).map(userId => ({ userId, game: { friends: Array.from({ length: count }, (_, i) => i + 1).filter(i => i !== userId).map(String) } })) });
const classic = defaultLoadout();
const extended = defaultLoadout('monsters', 'extended');
const rich = { gold: 100_000, luckCoins: 50, goldLock: null };
const act = (chat, id, body, { time = 100_000, wallet = rich } = {}) => gwentAction(chat, id, body, time, () => .4, { wallet });
const gold = amount => ({ currency: 'gold', amount });
const col = amount => ({ currency: 'luckCoins', amount });
const owed = (chat, id) => (chat.game.gwent.credits || []).filter(entry => entry.userId === String(id));
const sum = list => list.reduce((total, entry) => total + entry.amount, 0);

test('a stake is a whole number in a known currency within its limit', () => {
  assert.deepEqual(parseStake(undefined), { ok: true, stake: null });
  assert.deepEqual(parseStake(gold(500)), { ok: true, stake: gold(500) });
  for (const bad of [{ currency: 'moonDew', amount: 5 }, gold(0), gold(-1), gold(1.5), gold('x'), col(1001), gold(10_000_001), 'gold', []]) assert.equal(parseStake(bad).ok, false, JSON.stringify(bad));
  assert.match(cannotPay(gold(500), { gold: 100, luckCoins: 0 }), /Недостаточно/);
  assert.equal(cannotPay(gold(500), { gold: 500 }), null);
  assert.equal(cannotPay(gold(5), { gold: 500, goldLock: 'Вы в игре' }), 'Вы в игре');
  assert.equal(cannotPay(col(5), { gold: 0, luckCoins: 5, goldLock: 'Вы в игре' }), null);
  assert.ok(cannotPay(gold(5), null));
});

test('a staked duel charges both players, pays the winner the whole pot and nothing else is created', () => {
  const chat = setup();
  const sent = act(chat, 1, { action: 'invite', targetId: 2, loadout: classic, stake: col(5) });
  assert.deepEqual(sent.charge, col(5));
  assert.equal(sent.invitation.stake.amount, 5);
  assert.equal(act(chat, 1, { action: 'invite', targetId: 2, loadout: classic, stake: col(5) }).charge, undefined);
  assert.equal(act(chat, 2, { action: 'accept_invite', inviteId: sent.invitation.id, loadout: classic }, { wallet: { luckCoins: 4 } }).ok, false);
  const accepted = act(chat, 2, { action: 'accept_invite', inviteId: sent.invitation.id, loadout: classic });
  assert.deepEqual(accepted.charge, col(5));
  assert.equal(accepted.match.stake.pot, 10);
  const match = chat.game.gwent.matches[0];
  act(chat, 1, { action: 'surrender', matchId: match.id, revision: 0 });
  assert.equal(sum(owed(chat, 2)), 9);
  assert.equal(owed(chat, 1).length, 0);
  const view = gwentState(chat, 2, 100_001).match.stake;
  assert.deepEqual(view.result, { kind: 'won', payout: 9, delta: 4 });
  assert.equal(gwentState(chat, 1, 100_001).match.stake.result.kind, 'lost');
  act(chat, 2, { action: 'dismiss', matchId: match.id });
  gwentState(chat, 2, 100_002);
  assert.equal(sum(owed(chat, 2)), 9, 'the pot is paid once');
});

test('a draw gives both stakes back, a timeout loses the stake', () => {
  const chat = setup();
  const id = act(chat, 1, { action: 'invite', targetId: 2, loadout: classic, stake: gold(300) }).invitation.id;
  act(chat, 2, { action: 'accept_invite', inviteId: id, loadout: classic });
  const match = chat.game.gwent.matches[0];
  match.state.phase = 'matchOver'; match.state.winner = 'draw'; match.endedAt = 100_000;
  gwentState(chat, 1, 100_001);
  assert.equal(sum(owed(chat, 1)), 300);
  assert.equal(sum(owed(chat, 2)), 300);

  const late = setup();
  const lateId = act(late, 1, { action: 'invite', targetId: 2, loadout: classic, stake: gold(300) }).invitation.id;
  act(late, 2, { action: 'accept_invite', inviteId: lateId, loadout: classic });
  gwentState(late, 1, 100_000 + 6 * 60_000);
  // the first player to move ran out of time and lost
  assert.equal(sum(owed(late, 1)) + sum(owed(late, 2)), 540);
  assert.equal(owed(late, 1).length + owed(late, 2).length, 1);
});

test('a stake that cannot be paid stops the invitation, the acceptance and the table seat', () => {
  const chat = setup();
  assert.equal(act(chat, 1, { action: 'invite', targetId: 2, loadout: classic, stake: gold(500) }, { wallet: { gold: 499 } }).ok, false);
  assert.equal(act(chat, 1, { action: 'invite', targetId: 2, loadout: classic, stake: gold(500) }, { wallet: { gold: 900, goldLock: 'Стихии' } }).ok, false);
  assert.equal(act(chat, 1, { action: 'invite', targetId: 2, loadout: classic, stake: gold(500) }, { wallet: null }).ok, false);
  assert.equal(act(chat, 1, { action: 'invite', targetId: 2, loadout: classic, stake: gold(0) }).ok, false);
  assert.equal(chat.game.gwent.invites.length, 0);
});

test('a closed invitation gives the stake back once: cancel, decline, expiry and a match that starts elsewhere', () => {
  for (const [who, action] of [[1, 'cancel_invite'], [2, 'decline_invite']]) {
    const chat = setup();
    const id = act(chat, 1, { action: 'invite', targetId: 2, loadout: classic, stake: gold(200) }).invitation.id;
    assert.equal(act(chat, who, { action, inviteId: id }).ok, true);
    assert.equal(sum(owed(chat, 1)), 200);
    assert.equal(act(chat, who, { action, inviteId: id }).ok, false);
    assert.equal(sum(owed(chat, 1)), 200);
  }
  const expired = setup();
  act(expired, 1, { action: 'invite', targetId: 2, loadout: classic, stake: gold(200) });
  gwentState(expired, 3, 100_000 + INVITE_TTL + 1);
  gwentState(expired, 3, 100_000 + INVITE_TTL + 2);
  assert.equal(sum(owed(expired, 1)), 200);

  const busy = setup();
  act(busy, 1, { action: 'invite', targetId: 2, loadout: classic, stake: gold(200) });
  const plain = act(busy, 1, { action: 'invite', targetId: 3, loadout: classic }).invitation.id;
  act(busy, 3, { action: 'accept_invite', inviteId: plain, loadout: classic });
  assert.equal(sum(owed(busy, 1)), 200, 'the staked invitation of a player who started another match is refunded');
});

test('a table collects every seat\'s stake and the winners share the pot; leavers forfeit', () => {
  const chat = setup();
  const room = act(chat, 1, { action: 'invite', table: 3, loadout: extended, stake: gold(100) });
  assert.deepEqual(room.charge, gold(100));
  const id = room.invitation.id;
  assert.deepEqual(act(chat, 2, { action: 'accept_invite', inviteId: id, loadout: defaultLoadout('nilfgaard', 'extended') }).charge, gold(100));
  assert.equal(act(chat, 3, { action: 'accept_invite', inviteId: id, loadout: defaultLoadout('scoiatael', 'extended') }, { wallet: { gold: 99 } }).ok, false);
  act(chat, 3, { action: 'leave_table', inviteId: id });
  const started = act(chat, 1, { action: 'start_table', inviteId: id });
  assert.equal(started.ok, true);
  const match = chat.game.gwent.matches[0];
  assert.equal(match.stake.holders.length, 2);
  assert.equal(started.match.stake.pot, 200);
  // seat 2 leaves (forfeits), seat 1 wins
  match.players[1] = 'bot:left1';
  match.state.phase = 'matchOver'; match.state.winners = ['player']; match.state.winner = 'player'; match.endedAt = 100_001;
  gwentState(chat, 1, 100_002);
  assert.equal(sum(owed(chat, 1)), 180);
  assert.equal(owed(chat, 2).length, 0);
});

test('table pots split evenly (the remainder to the first winner); nobody left means refunds', () => {
  const chat = setup();
  const id = act(chat, 1, { action: 'invite', table: 4, loadout: extended, stake: gold(101) }).invitation.id;
  for (const user of [2, 3]) act(chat, user, { action: 'accept_invite', inviteId: id, loadout: defaultLoadout(user === 2 ? 'nilfgaard' : 'scoiatael', 'extended') });
  act(chat, 1, { action: 'start_table', inviteId: id });
  const match = chat.game.gwent.matches[0];
  match.state.phase = 'matchOver'; match.state.winners = ['player', 'ai']; match.endedAt = 100_001;
  gwentState(chat, 1, 100_002);
  assert.deepEqual([sum(owed(chat, 1)), sum(owed(chat, 2)), sum(owed(chat, 3))], [137, 136, 0]);

  const gone = setup();
  const room = act(gone, 1, { action: 'invite', table: 3, loadout: extended, stake: gold(50) }).invitation.id;
  act(gone, 2, { action: 'accept_invite', inviteId: room, loadout: defaultLoadout('nilfgaard', 'extended') });
  act(gone, 1, { action: 'start_table', inviteId: room });
  const abandoned = gone.game.gwent.matches[0];
  abandoned.players = abandoned.players.map((_, i) => `bot:left${i}`);
  abandoned.state.phase = 'matchOver'; abandoned.state.winners = []; abandoned.endedAt = 100_001;
  gwentState(gone, 1, 100_002);
  assert.deepEqual([sum(owed(gone, 1)), sum(owed(gone, 2))], [50, 50]);
});

test('an unfilled table that expires or is closed returns every stake', () => {
  const chat = setup();
  const id = act(chat, 1, { action: 'invite', table: 3, loadout: extended, stake: col(3) }).invitation.id;
  act(chat, 2, { action: 'accept_invite', inviteId: id, loadout: defaultLoadout('nilfgaard', 'extended') });
  act(chat, 1, { action: 'cancel_invite', inviteId: id });
  assert.equal(sum(owed(chat, 1)), 3);
  assert.equal(sum(owed(chat, 2)), 3);
});

test('rematches are played without a stake', () => {
  const chat = setup();
  const id = act(chat, 1, { action: 'invite', targetId: 2, loadout: classic, stake: gold(200) }).invitation.id;
  act(chat, 2, { action: 'accept_invite', inviteId: id, loadout: classic });
  const match = chat.game.gwent.matches[0];
  act(chat, 1, { action: 'surrender', matchId: match.id, revision: 0 });
  act(chat, 1, { action: 'rematch', matchId: match.id });
  act(chat, 2, { action: 'rematch', matchId: match.id });
  const next = chat.game.gwent.matches.at(-1);
  assert.notEqual(next.id, match.id);
  assert.equal(next.stake, null);
});

test('the lobby fingerprint changes when a stake is paid out', () => {
  const chat = setup();
  const id = act(chat, 1, { action: 'invite', targetId: 2, loadout: classic, stake: gold(200) }).invitation.id;
  act(chat, 2, { action: 'accept_invite', inviteId: id, loadout: classic });
  const before = gwentFingerprint(chat);
  chat.game.gwent.matches[0].state.phase = 'matchOver'; chat.game.gwent.matches[0].state.winner = 'player';
  gwentState(chat, 1, 100_001);
  assert.notEqual(gwentFingerprint(chat), before);
});

test('the hero is paid what the lobby owes once, and a stake is taken only when it is covered', () => {
  const lobby = { gwent: { credits: [{ id: 'a', userId: '7', currency: 'gold', amount: 40, reason: 'win' }, { id: 'b', userId: '8', currency: 'gold', amount: 9, reason: 'win' }, { id: 'c', userId: '7', currency: 'luckCoins', amount: 2, reason: 'refund' }] } };
  const session = { userId: 7, game: { inventory: { gold: 10 } } };
  assert.deepEqual(collectCredits(lobby, session).map(entry => entry.amount), [40, 2]);
  assert.deepEqual(session.game.inventory, { gold: 50, luckCoins: 2 });
  assert.deepEqual(lobby.gwent.credits.map(entry => entry.id), ['b']);
  lobby.gwent.credits.push({ id: 'a', userId: '7', currency: 'gold', amount: 40, reason: 'win' });
  assert.deepEqual(collectCredits(lobby, session), [], 'a credit that was already paid is dropped, not paid again');
  assert.equal(session.game.inventory.gold, 50);
  assert.equal(takeStake(session, gold(51)), false);
  assert.equal(takeStake(session, gold(50)), true);
  assert.equal(session.game.inventory.gold, 0);
  assert.equal(walletOf({ game: { inventory: { gold: 5.9, luckCoins: -3 } } }).luckCoins, 0);
});

test('the winner of a duel gets 1.8 stakes, a refund is never reduced, and the prize is shown up front', () => {
  const chat = setup();
  const id = act(chat, 1, { action: 'invite', targetId: 2, loadout: classic, stake: gold(100) }).invitation.id;
  const accepted = act(chat, 2, { action: 'accept_invite', inviteId: id, loadout: classic });
  assert.equal(accepted.match.stake.pot, 200);
  assert.equal(accepted.match.stake.prize, 180);
  act(chat, 1, { action: 'surrender', matchId: chat.game.gwent.matches[0].id, revision: 0 });
  assert.equal(sum(owed(chat, 2)), 180);
  assert.equal(sum(owed(chat, 1)), 0);
  const draw = setup();
  const drawId = act(draw, 1, { action: 'invite', targetId: 2, loadout: classic, stake: gold(100) }).invitation.id;
  act(draw, 2, { action: 'accept_invite', inviteId: drawId, loadout: classic });
  const match = draw.game.gwent.matches[0];
  match.state.phase = 'matchOver'; match.state.winner = 'draw'; match.endedAt = 100_000;
  gwentState(draw, 1, 100_001);
  assert.deepEqual([sum(owed(draw, 1)), sum(owed(draw, 2))], [100, 100]);
});
