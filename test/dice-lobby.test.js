import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyDice, diceAction, diceState, raiseOptions, INVITE_TTL, THROW_TTL, RESULT_TTL } from '../miniapp/diceLobby.js';

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

test('two won rounds win the match and the winner gets 1.8 stakes', () => {
  const { data, match } = started({ currency: 'luckCoins', amount: 5 });
  for (let round = 1; round <= 2; round += 1) {
    stand(data, 1, match); stand(data, 2, match);
    if (round < 2) { act(data, 1, { action: 'ready', matchId: match.id }); act(data, 2, { action: 'ready', matchId: match.id }); }
  }
  assert.equal(match.state.phase, 'matchOver');
  const winner = match.state.winner === 'player' ? 1 : 2;
  assert.equal(owed(data, winner), 9, 'a pot of 10 pays 90%');
  assert.equal(owed(data, 3 - winner), 0);
  const view = diceState(data, winner, 2000, { people }).match;
  assert.equal(view.winner, 'me');
  assert.deepEqual(view.stake.result, { kind: 'won', payout: 9, delta: 4, paid: 5 });
  diceState(data, winner, 3000, { people });
  assert.equal(owed(data, winner), 9, 'paid once');
});

test('the throw follows its own rules: one re-throw, kept dice stay, stale requests are refused', () => {
  const { data, match } = started(null, faces([0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 5, 5, 5]));
  const first = act(data, 1, { action: 'throw', matchId: match.id, round: 1, rolls: 1, keep: [0, 1] });
  assert.equal(first.ok, false, 'a stale count of throws is refused');
  const thrown = act(data, 1, { action: 'throw', matchId: match.id, round: 1, rolls: 0, keep: [0, 1] });
  assert.deepEqual(thrown.match.dice.slice(0, 2), match.game.dice[0].slice(0, 2));
  assert.equal(thrown.match.rolls, 1);
  assert.equal(thrown.match.done, true, 'the only re-throw stands automatically');
  assert.equal(act(data, 1, { action: 'throw', matchId: match.id, round: 1, rolls: 1, keep: [] }).ok, false);
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

/** A started staked match with the first round settled (the first seat has a poker, so it wins). */
function afterFirstRound(stake = { currency: 'gold', amount: 100 }) {
  const ctx = started(stake);
  stand(ctx.data, 1, ctx.match); stand(ctx.data, 2, ctx.match);
  return ctx;
}
const paidTotal = match => Object.values(match.stake.paid).reduce((total, value) => total + value, 0);

test('between rounds a player can raise, the opponent calls, and the pot of both goes to the winner', () => {
  const { data, match } = afterFirstRound();
  assert.deepEqual(diceState(data, 1, 1000, { people }).match.canRaise, [100, 200]);
  assert.equal(act(data, 1, { action: 'raise', matchId: match.id, amount: 150 }).ok, false, 'only whole stakes');
  assert.equal(act(data, 1, { action: 'raise', matchId: match.id, amount: 100 }, { w: { gold: 50 } }).ok, false, 'must be able to pay');
  const raised = act(data, 1, { action: 'raise', matchId: match.id, amount: 100 });
  assert.deepEqual(raised.charge, { currency: 'gold', amount: 100 });
  assert.equal(raised.notify.userId, '2');
  assert.deepEqual(raised.match.raise, { by: 'me', amount: 100 });
  assert.equal(diceState(data, 2, 1000, { people }).match.raise.by, 'opponent');
  assert.equal(act(data, 2, { action: 'ready', matchId: match.id }).ok, false, 'the raise must be answered first');
  assert.equal(act(data, 1, { action: 'raise', matchId: match.id, amount: 100 }).ok, false, 'one raise at a time');
  assert.equal(act(data, 1, { action: 'call', matchId: match.id }).ok, false, 'the raiser cannot call their own raise');
  assert.equal(act(data, 2, { action: 'call', matchId: match.id }, { w: { gold: 10 } }).ok, false);
  const called = act(data, 2, { action: 'call', matchId: match.id });
  assert.deepEqual(called.charge, { currency: 'gold', amount: 100 });
  assert.equal(called.match.phase, 'throw');
  assert.equal(paidTotal(match), 400);
  // the second round is also won by the first seat: it takes the whole pot, 90% of 400
  stand(data, 1, match); stand(data, 2, match);
  assert.equal(match.state.phase, 'matchOver');
  assert.equal(owed(data, 1), 360);
  assert.equal(owed(data, 2), 0);
  const view = diceState(data, 2, 2000, { people }).match.stake;
  assert.deepEqual([view.pot, view.prize, view.result.paid, view.result.delta], [400, 360, 200, -200]);
});

test('a raise that is not called is refunded and the raiser wins the round, also when the opponent is silent', () => {
  const { data, match } = afterFirstRound();
  act(data, 2, { action: 'raise', matchId: match.id, amount: 200 });
  const folded = act(data, 1, { action: 'fold', matchId: match.id });
  assert.equal(owed(data, 2), 200, 'the raise comes back');
  assert.equal(match.stake.paid['2'], 100);
  assert.deepEqual(match.game.wins, [1, 1], 'the folded round goes to the raiser');
  assert.equal(folded.match.phase, 'throw');
  assert.equal(folded.match.round, 3);
  assert.deepEqual(folded.match.event, { kind: 'fold', winner: 'opponent' });
  assert.equal(diceState(data, 2, 1000, { people }).match.event.winner, 'me');
  // the first seat raised, the second stays silent: at the deadline the round goes to the raiser, who has a second win
  const quiet = afterFirstRound();
  act(quiet.data, 1, { action: 'raise', matchId: quiet.match.id, amount: 100 }, { time: 2000 });
  diceState(quiet.data, 2, 2000 + RESULT_TTL, { people });
  assert.equal(quiet.match.state.phase, 'matchOver');
  assert.equal(owed(quiet.data, 1), 100 + 180, 'the raise back, and 90% of the two base stakes');
  assert.equal(owed(quiet.data, 2), 0);
});

test('raises are limited to four stakes in all and need a stake', () => {
  const stake = paid => ({ currency: 'gold', amount: 100, paid: { 1: paid } });
  assert.deepEqual(raiseOptions(stake(100), 1), [100, 200]);
  assert.deepEqual(raiseOptions(stake(300), 1), [100], 'three stakes are in: one more fits, two do not');
  assert.deepEqual(raiseOptions(stake(400), 1), []);
  assert.deepEqual(raiseOptions({ currency: 'gold', amount: 8_000_000, paid: { 1: 8_000_000 } }, 1), [], 'never above the limit of the currency');
  assert.deepEqual(raiseOptions(null, 1), []);
  const plain = started(null);
  stand(plain.data, 1, plain.match); stand(plain.data, 2, plain.match);
  assert.equal(act(plain.data, 1, { action: 'raise', matchId: plain.match.id, amount: 100 }).ok, false);
  assert.deepEqual(diceState(plain.data, 1, 1000, { people }).match.canRaise, []);
});
