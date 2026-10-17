import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultLoadout } from '../webapp/gwent-builder.js';
import { gwentState, gwentAction, TURN_PUSH_COOLDOWN } from '../miniapp/gwent.js';
import { gwentEntry, parseGwentEntry, gwentAppLink } from '../webapp/gwent-links.js';
import { legalPlays } from '../webapp/gwent-engine.js';
import { pushGwentPlay } from '../miniapp/gwent-sharing.js';

const NOW = 1_000_000;
const friendsOf = id => [1, 2, 3].filter(other => other !== id).map(String);
const setup = (seen = {}) => ({ game: {}, members: [1, 2, 3].map(userId => ({ userId, game: { friends: friendsOf(userId), lastSeenAt: seen[userId] } })) });
const act = (chat, id, body, now = NOW) => gwentAction(chat, id, body, now, () => 0.4);
const deck = defaultLoadout();

/** Players 1 and 2 in a started match, setup choices done and player one to move. */
function started(chat) {
  act(chat, 1, { action: 'join', loadout: deck });
  act(chat, 2, { action: 'join', loadout: defaultLoadout('nilfgaard') });
  const match = chat.game.gwent.matches[0];
  for (let guard = 0; match.state.pending && guard < 4; guard += 1) {
    act(chat, match.state.pending.side === 'player' ? 1 : 2, { action: 'choice', matchId: match.id, revision: match.revision, choiceId: 'done' });
  }
  match.state.starter = match.state.turn = 'player';
  return match;
}
/** A plain unit play that needs no follow-up choice. */
const plainPlay = (match, side) => legalPlays(match.state, side).find(item => {
  const card = match.state.sides[side].hand.find(c => c.uid === item.uid);
  return item.row && card?.type === 'unit' && !card.medic && !card.agile && !card.onPlay;
});
const finish = (chat, match) => act(chat, 1, { action: 'surrender', matchId: match.id, revision: match.revision });

test('a rematch needs both players, keeps both decks and replaces the finished match', () => {
  const chat = setup(), match = started(chat);
  assert.equal(act(chat, 1, { action: 'rematch', matchId: match.id }).ok, false, 'not before the match is over');
  finish(chat, match);
  const first = act(chat, 1, { action: 'rematch', matchId: match.id });
  assert.equal(first.ok, true);
  assert.deepEqual(first.match.rematch, { requested: true, offered: false, closed: false, declined: false });
  assert.deepEqual(gwentState(chat, 2, NOW).match.rematch, { requested: false, offered: true, closed: false, declined: false });
  assert.equal(act(chat, 3, { action: 'rematch', matchId: match.id }).ok, false, 'strangers cannot join');
  const second = act(chat, 2, { action: 'rematch', matchId: match.id });
  assert.equal(second.ok, true);
  assert.notEqual(second.match.id, match.id);
  assert.equal(second.match.state.phase, 'playing');
  assert.equal(second.match.faction, 'nilfgaard', 'player two keeps the deck faction');
  assert.equal(gwentState(chat, 1, NOW).match.id, second.match.id);
  assert.equal(chat.game.gwent.matches.length, 2);
  assert.equal(act(chat, 1, { action: 'rematch', matchId: match.id }).ok, false, 'the old match is closed for good');
});

test('a rematch cannot be forced on a player who left', () => {
  const chat = setup(), match = started(chat);
  finish(chat, match);
  act(chat, 2, { action: 'dismiss', matchId: match.id });
  assert.equal(gwentState(chat, 1, NOW).match.rematch.closed, true);
  assert.equal(act(chat, 1, { action: 'rematch', matchId: match.id }).ok, false);
});

test('a player who is not in the app gets one message per turn window, an online player none', () => {
  const chat = setup({ 1: NOW, 2: undefined }), match = started(chat);
  const play = plainPlay(match, 'player');
  const first = act(chat, 1, { action: 'play', matchId: match.id, revision: match.revision, uid: play.uid, row: play.row }, NOW + 200_000);
  assert.deepEqual(first.notifyPlay && { kind: first.notifyPlay.kind, userId: first.notifyPlay.userId }, { kind: 'turn', userId: '2' });
  // Player two moves back: player one is online, so nothing is sent.
  const reply = plainPlay(match, 'ai');
  const back = act(chat, 2, { action: 'play', matchId: match.id, revision: match.revision, uid: reply.uid, row: reply.row }, NOW + 201_000);
  assert.equal(back.notifyPlay, undefined);
  // Player one moves again quickly: still inside the cooldown for player two.
  const again = plainPlay(match, 'player');
  const second = act(chat, 1, { action: 'play', matchId: match.id, revision: match.revision, uid: again.uid, row: again.row }, NOW + 202_000);
  assert.equal(second.notifyPlay, undefined, 'throttled');
  assert.ok(TURN_PUSH_COOLDOWN >= 60_000);
});

test('the inviter is told when the invitation is accepted and the opponent is told about a rematch', () => {
  const chat = setup({ 2: NOW });
  const invite = act(chat, 1, { action: 'invite', targetId: 2, loadout: deck }).invitation;
  const accepted = act(chat, 2, { action: 'accept_invite', inviteId: invite.id, loadout: deck });
  assert.equal(accepted.notifyPlay.kind, 'start');
  assert.equal(accepted.notifyPlay.userId, '1');
  const match = chat.game.gwent.matches[0];
  finish(chat, match);
  const offer = act(chat, 2, { action: 'rematch', matchId: match.id });
  assert.equal(offer.notifyPlay.kind, 'rematch');
});

test('open and recently finished games are listed with friends first, and a friend row can open a live match', () => {
  const chat = setup(), match = started(chat);
  const spectator = gwentState(chat, 3, NOW);
  assert.equal(spectator.friends.find(friend => friend.userId === '1').watchId, match.id);
  assert.equal(spectator.games[0].friend, true);
  assert.equal(spectator.games[0].finished, false);
  assert.ok(gwentState(chat, 3, NOW, { watch: match.id }).spectating);
  finish(chat, match);
  const later = gwentState(chat, 3, NOW + 60_000);
  assert.equal(later.games[0].finished, true);
  assert.equal(later.games[0].winnerName === null, false);
  assert.ok(gwentState(chat, 3, NOW + 60_000, { watch: match.id }).spectating.state.phase === 'matchOver');
  assert.equal(gwentState(chat, 3, NOW + 31 * 60_000).games.length, 0, 'finished games disappear after half an hour');
  assert.equal(gwentState(chat, 3, NOW + 60_000).friends.find(friend => friend.userId === '1').watchId, null);
});

test('a play link opens the game from a message and is validated like the other links', () => {
  const token = '12345678-1234-1234-1234-123456789abc';
  assert.equal(gwentEntry(-100, 'play', token), `gwent_-100_p_${token}`);
  assert.deepEqual(parseGwentEntry(`gwent_-100_p_${token}`), { chatId: -100, kind: 'play', token });
  assert.equal(gwentAppLink('https://t.me/bot', -100, 'play', token), `https://t.me/bot?startapp=gwent_-100_p_${token}`);
  assert.equal(gwentAppLink('https://example.com/bot', -100, 'play', token), null);
  assert.equal(parseGwentEntry('gwent_-100_x_' + token), null);
});

test('the message uses an injected transport, a translated button and the right text for each reason', async () => {
  const sent = [];
  const push = (userId, text, { send }) => Promise.resolve(send(userId, text)).then(() => true);
  const send = (id, message, markup) => sent.push({ id, message, markup });
  const translate = async (id, text) => text;
  for (const kind of ['turn', 'start', 'rematch']) {
    await pushGwentPlay({ kind, userId: '7', fromName: 'Анна' }, 'https://t.me/bot?startapp=x', { send, push, translate });
  }
  assert.equal(sent.length, 3);
  assert.match(sent[0].message, /Ваш ход/);
  assert.match(sent[1].message, /начинает/);
  assert.match(sent[2].message, /реванш/);
  assert.equal(sent[0].markup.reply_markup.inline_keyboard[0][0].url, 'https://t.me/bot?startapp=x');
});

test('the player view carries the round history from the player\'s own side, and a rematch can be declined', () => {
  const chat = setup(), match = started(chat);
  // Two finished rounds: player one wins the first, player two the second; then the match ends by surrender.
  match.state.rounds = [{ round: 1, scores: { player: 30, ai: 20 }, winner: 'player' }, { round: 2, scores: { player: 12, ai: 18 }, winner: 'ai' }];
  finish(chat, match);
  const one = gwentState(chat, 1, NOW).match.state, two = gwentState(chat, 2, NOW).match.state;
  assert.deepEqual(one.rounds.map(round => [round.scores.player, round.scores.ai, round.winner]), [[30, 20, 'player'], [12, 18, 'ai']]);
  assert.deepEqual(two.rounds.map(round => [round.scores.player, round.scores.ai, round.winner]), [[20, 30, 'ai'], [18, 12, 'player']]);
  act(chat, 1, { action: 'rematch', matchId: match.id });
  assert.equal(act(chat, 3, { action: 'rematch_decline', matchId: match.id }).ok, false);
  const declined = act(chat, 2, { action: 'rematch_decline', matchId: match.id });
  assert.equal(declined.ok, true);
  assert.equal(gwentState(chat, 1, NOW).match.rematch.declined, true);
  assert.equal(act(chat, 1, { action: 'rematch', matchId: match.id }).ok, false, 'no rematch after a refusal');
});
