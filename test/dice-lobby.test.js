import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyDice, diceAction, diceState, INVITE_TTL, THROW_TTL, RESULT_TTL } from '../miniapp/diceLobby.js';

const people = { 1: { name: 'Anna', friends: ['2'], lastSeenAt: 0 }, 2: { name: 'Boris', friends: ['1'], lastSeenAt: 0 }, 3: { name: 'Vera', friends: [], lastSeenAt: 0 } };
const wallet = { gold: 100_000, luckCoins: 50, goldLock: null };
const faces = list => { let i = 0; return () => (list[i++ % list.length] + 0.5) / 6; };
let activeRng;
const act = (data, id, body, { time = 1000, rng = activeRng, strangers = [], w = wallet } = {}) => diceAction(data, String(id), body, time, rng, { people, strangers, wallet: w });
const owed = (data, id) => data.credits.filter(entry => entry.userId === String(id)).reduce((total, entry) => total + entry.amount, 0);
// The first seat throws 9,9,9,9,9 (poker) and the second 9,10,J,Q,A (a high card), round after round.
const rigged = faces([0, 0, 0, 0, 0, 0, 1, 2, 3, 5]);
function started(stake, rng = rigged) {
  activeRng = rng;
  const data = emptyDice();
  const sent = act(data, 1, { action: 'invite', targetId: 2, ...(stake ? { stake } : {}) });
  const accepted = act(data, 2, { action: 'accept_invite', inviteId: data.invites[0].id }, { rng });
  return { data, sent, accepted, match: data.matches[0] };
}
const stand = (data, id, match, time = 1000) => act(data, id, { action: 'stand', matchId: match.id, round: match.game.round, rolls: match.game.rolls[match.players.indexOf(String(id))] }, { time });

test('only friends or a player found by nickname can be invited, and not while busy', () => {
  const data = emptyDice();
  assert.equal(act(data, 1, { action: 'invite', targetId: 3 }).ok, false);
  assert.equal(act(data, 1, { action: 'invite', targetId: 1 }).ok, false);
  assert.equal(act(data, 1, { action: 'invite', targetId: 3 }, { strangers: ['3'] }).ok, true);
  assert.equal(act(data, 1, { action: 'invite', targetId: 2 }).ok, true);
  assert.equal(act(data, 1, { action: 'invite', targetId: 2 }).outgoing.length, 2, 'the same invitation is not duplicated');
  const { accepted } = started();
  assert.equal(accepted.match.opponent, 'Anna');
});

test('a staked match charges both, hides the dice during the throw and shows them when the round is settled', () => {
  const { data, sent, accepted, match } = started({ currency: 'gold', amount: 500 });
  assert.deepEqual(sent.charge, { currency: 'gold', amount: 500 });
  assert.deepEqual(accepted.charge, { currency: 'gold', amount: 500 });
  assert.equal(accepted.match.opponentDice, null);
  assert.equal(accepted.match.stake.pot, 1000);
  stand(data, 1, match);
  assert.equal(diceState(data, 2, 1000, { people }).match.opponentDone, true);
  assert.equal(diceState(data, 2, 1000, { people }).match.opponentDice, null);
  const after = stand(data, 2, match);
  assert.equal(after.match.phase, 'result');
  assert.equal(after.match.opponentDice.length, 5);
  assert.equal(after.match.result.winner, 'opponent');
  assert.equal(after.match.result.opponent, 'Покер');
});

test('three rounds win the match and the whole pot goes to the winner', () => {
  const { data, match } = started({ currency: 'luckCoins', amount: 5 });
  for (let round = 1; round <= 3; round += 1) {
    stand(data, 1, match); stand(data, 2, match);
    if (round < 3) { act(data, 1, { action: 'ready', matchId: match.id }); act(data, 2, { action: 'ready', matchId: match.id }); }
  }
  assert.equal(match.state.phase, 'matchOver');
  const winner = match.state.winner === 'player' ? 1 : 2;
  assert.equal(owed(data, winner), 9, 'a pot of 10 pays 90%');
  assert.equal(owed(data, 3 - winner), 0);
  const view = diceState(data, winner, 2000, { people }).match;
  assert.equal(view.winner, 'me');
  assert.deepEqual(view.stake.result, { kind: 'won', payout: 9, delta: 4 });
  diceState(data, winner, 3000, { people });
  assert.equal(owed(data, winner), 9, 'paid once');
});

test('the throw follows its own rules: two re-throws, kept dice stay, stale requests are refused', () => {
  const { data, match } = started(null, faces([0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 5, 5, 5]));
  const first = act(data, 1, { action: 'throw', matchId: match.id, round: 1, rolls: 0, keep: [0, 1] });
  assert.deepEqual(first.match.dice.slice(0, 2), match.game.dice[0].slice(0, 2));
  assert.equal(first.match.rolls, 1);
  assert.equal(act(data, 1, { action: 'throw', matchId: match.id, round: 1, rolls: 0, keep: [] }).ok, false, 'a repeated request is refused');
  const second = act(data, 1, { action: 'throw', matchId: match.id, round: 1, rolls: 1, keep: [0, 1, 2] });
  assert.equal(second.match.done, true, 'the last throw stands automatically');
  assert.equal(act(data, 1, { action: 'throw', matchId: match.id, round: 1, rolls: 2, keep: [] }).ok, false);
  assert.equal(act(data, 3, { action: 'stand', matchId: match.id, round: 1, rolls: 0 }).ok, false);
});

test('a player who does not answer is made to stand, and the next round starts on time', () => {
  const { data, match } = started();
  stand(data, 1, match);
  const late = diceState(data, 2, 1000 + THROW_TTL, { people });
  assert.equal(late.match.phase, 'result');
  const next = diceState(data, 2, 1000 + THROW_TTL + RESULT_TTL, { people });
  assert.equal(next.match.phase, 'throw');
  assert.equal(next.match.result, null);
});

test('two empty rounds in a row abandon the match and return the stakes', () => {
  const { data, match } = started({ currency: 'gold', amount: 300 });
  let time = 1000;
  for (let i = 0; i < 6 && match.state.phase === 'playing'; i += 1) { time += THROW_TTL + RESULT_TTL; diceState(data, 1, time, { people }); }
  assert.equal(match.state.phase, 'matchOver');
  assert.equal(match.endKind, 'abandoned');
  assert.equal(owed(data, 1), 300);
  assert.equal(owed(data, 2), 300);
});

test('surrender gives the pot to the other player; a closed or expired invitation returns the stake once', () => {
  const { data, match } = started({ currency: 'gold', amount: 200 });
  act(data, 1, { action: 'surrender', matchId: match.id });
  assert.equal(owed(data, 2), 360, 'the winner gets 1.8 stakes');
  assert.equal(owed(data, 1), 0);
  assert.equal(diceState(data, 1, 2000, { people }).match.endReason, 'Вы сдались');

  const closed = emptyDice();
  act(closed, 1, { action: 'invite', targetId: 2, stake: { currency: 'gold', amount: 200 } });
  const id = closed.invites[0].id;
  assert.equal(act(closed, 1, { action: 'decline_invite', inviteId: id }).ok, false);
  assert.equal(act(closed, 2, { action: 'decline_invite', inviteId: id }).ok, true);
  assert.equal(owed(closed, 1), 200);
  assert.equal(act(closed, 2, { action: 'decline_invite', inviteId: id }).ok, false);

  const expired = emptyDice();
  act(expired, 1, { action: 'invite', targetId: 2, stake: { currency: 'luckCoins', amount: 3 } });
  diceState(expired, 2, 1000 + INVITE_TTL + 1, { people });
  diceState(expired, 2, 1000 + INVITE_TTL + 2, { people });
  assert.equal(owed(expired, 1), 3);
});

test('a stake that cannot be paid stops the invitation and the acceptance', () => {
  const data = emptyDice();
  assert.equal(act(data, 1, { action: 'invite', targetId: 2, stake: { currency: 'gold', amount: 500 } }, { w: { gold: 100 } }).ok, false);
  act(data, 1, { action: 'invite', targetId: 2, stake: { currency: 'gold', amount: 500 } });
  assert.equal(act(data, 2, { action: 'accept_invite', inviteId: data.invites[0].id }, { w: { gold: 100 } }).ok, false);
  assert.equal(data.matches.length, 0);
});

test('a link invitation is open to anyone but its author, shows the stake, and starts the match for the one who accepts', () => {
  const data = emptyDice();
  const made = act(data, 1, { action: 'invite', open: true, stake: { currency: 'gold', amount: 100 } });
  assert.deepEqual(made.charge, { currency: 'gold', amount: 100 });
  assert.equal(made.notify, undefined, 'a link has nobody to notify');
  const id = data.invites[0].id;
  const seen = diceState(data, 3, 1000, { people, invite: id });
  assert.equal(seen.invitation.open, true);
  assert.equal(seen.invitation.mine, false);
  assert.equal(diceState(data, 1, 1000, { people, invite: id }).invitation.mine, true);
  assert.equal(diceState(data, 3, 1000, { people, invite: 'nope' }).ok, false);
  assert.equal(act(data, 1, { action: 'accept_invite', inviteId: id }).ok, false, 'the author cannot take their own invitation');
  assert.equal(act(data, 3, { action: 'decline_invite', inviteId: id }).ok, false, 'an open invitation is not declined, only left');
  const accepted = act(data, 3, { action: 'accept_invite', inviteId: id });
  assert.equal(accepted.match.opponent, 'Anna');
  assert.deepEqual(accepted.charge, { currency: 'gold', amount: 100 });
  assert.equal(accepted.notify.userId, '1');
  assert.equal(act(data, 2, { action: 'accept_invite', inviteId: id }).ok, false, 'taken only once');
});

test('invitations and acceptances name who to notify', () => {
  const data = emptyDice();
  const sent = act(data, 1, { action: 'invite', targetId: 2 });
  assert.deepEqual({ kind: sent.notify.kind, userId: sent.notify.userId, fromName: sent.notify.fromName }, { kind: 'invite', userId: '2', fromName: 'Anna' });
  assert.equal(act(data, 1, { action: 'invite', targetId: 2 }).notify, undefined, 'the same invitation does not notify twice');
});

test('a rematch repeats the stake, goes to the same opponent and needs a finished match', () => {
  const { data, match } = started({ currency: 'gold', amount: 250 });
  assert.equal(act(data, 1, { action: 'rematch', matchId: match.id }).ok, false, 'not while the match is running');
  act(data, 1, { action: 'surrender', matchId: match.id });
  const asked = act(data, 2, { action: 'rematch', matchId: match.id });
  assert.deepEqual(asked.charge, { currency: 'gold', amount: 250 });
  assert.equal(asked.notify.kind, 'rematch');
  assert.equal(asked.match.opponentId, '1');
  assert.equal(act(data, 2, { action: 'rematch', matchId: match.id }).charge, undefined, 'asking twice does not charge twice');
  const view = diceState(data, 1, 1000, { people });
  assert.equal(view.incoming[0].rematch, true);
  assert.equal(act(data, 1, { action: 'accept_invite', inviteId: view.incoming[0].id }, { w: { gold: 10 } }).ok, false, 'the opponent must cover the stake too');
  const taken = act(data, 1, { action: 'accept_invite', inviteId: view.incoming[0].id });
  assert.equal(taken.ok, true);
  assert.equal(taken.match.stake.amount, 250);
  assert.equal(taken.match.phase, 'throw');
  assert.equal(taken.match.id === match.id, false);
  assert.equal(data.matches.length, 2);
  assert.equal(diceState(data, 2, 1000, { people }).match.id, taken.match.id, 'the running match is shown, not the old result');
});
