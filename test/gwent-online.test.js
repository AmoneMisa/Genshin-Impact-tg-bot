import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultLoadout } from '../webapp/gwent-builder.js';
import { legalPlays } from '../webapp/gwent-engine.js';
import { gwentState, gwentAction, QUEUE_TTL, TURN_TTL } from '../miniapp/gwent.js';
const setup = () => ({ game: {}, members: [{ userId: 1 }, { userId: 2 }, { userId: 3 }] });
const pair = chat => {
  assert.ok(gwentAction(chat, 1, { action: 'join', loadout: defaultLoadout() }, 100).searching);
  const joined = gwentAction(chat, 2, { action: 'join', loadout: defaultLoadout('nilfgaard') }, 101, () => .4);
  // Keep both starting hands, then fix the coin toss so player one starts.
  const match = chat.game.gwent.matches[0];
  for (let guard = 0; match.state.pending && guard < 4; guard += 1) {
    const user = match.state.pending.side === 'player' ? 1 : 2;
    assert.ok(gwentAction(chat, user, { action: 'choice', matchId: match.id, revision: match.revision, choiceId: 'done' }, 101).ok);
  }
  match.state.starter = match.state.turn = 'player';
  return joined;
};
test('matching is persistent, rejects duplicate/self pairing, and redacts hidden information', () => {
  const chat = setup(); pair(chat);
  const one = gwentState(chat, 1, 102), two = gwentState(chat, 2, 102);
  assert.equal(one.match.id, two.match.id); assert.equal(one.match.state.turn, 'player'); assert.equal(two.match.state.turn, 'ai');
  for (const view of [one, two]) {
    assert.equal(view.match.state.sides.player.hand.length, 10);
    assert.equal(view.match.state.sides.ai.hand.length, 0);
    assert.equal(view.match.state.sides.ai.handCount, 10);
    assert.equal(view.match.state.sides.player.deck.length, 0);
    assert.equal(view.match.state.rngState, undefined);
  }
  const copy = JSON.parse(JSON.stringify(chat));
  assert.equal(gwentState(copy, 2, 103).match.id, two.match.id);
  assert.equal(gwentAction(chat, 1, { action: 'join', loadout: defaultLoadout() }, 104).ok, false);
  assert.equal(gwentState(chat, 3, 104).match, null);
});
test('online moves enforce actor, legal UID, match id, revision and replay protection', () => {
  const chat = setup(); pair(chat);
  const match = chat.game.gwent.matches[0], play = legalPlays(match.state, 'player').find(play => play.row);
  const command = { action: 'play', matchId: match.id, revision: match.revision, uid: play.uid, row: play.row };
  assert.equal(gwentAction(chat, 2, command, 105).ok, false);
  assert.equal(gwentAction(chat, 3, command, 105).ok, false);
  assert.equal(gwentAction(chat, 1, { ...command, uid: -100 }, 105).ok, false);
  assert.equal(gwentAction(chat, 1, command, 105).ok, true);
  assert.equal(gwentAction(chat, 1, command, 106).ok, false);
  assert.equal(gwentState(chat, 2, 107).match.state.turn, 'player');
});
test('queue cancellation, expiry, pairing race and timeout are authoritative', () => {
  const chat = setup();
  gwentAction(chat, 1, { action: 'join', loadout: defaultLoadout() }, 0);
  gwentAction(chat, 1, { action: 'join', loadout: defaultLoadout() }, 1);
  assert.equal(chat.game.gwent.queue.length, 1);
  assert.equal(gwentState(chat, 1, QUEUE_TTL + 1).searching, false);
  pair(chat);
  const cancel = gwentAction(chat, 2, { action: 'cancel' }, 102);
  assert.ok(cancel.match);
  const after = gwentState(chat, 1, TURN_TTL + 102);
  assert.equal(after.match.state.phase, 'matchOver'); assert.equal(after.match.state.winner, 'ai');
  assert.ok(gwentAction(chat, 1, { action: 'dismiss', matchId: after.match.id }, TURN_TTL + 103).ok);
  assert.equal(gwentState(chat, 1, TURN_TTL + 104).match, null);
});
test('server validates and saves loadouts, and rejects malformed actions', () => {
  const chat = setup(), config = defaultLoadout();
  config.arts = {geralt:1,'foltest-temeria':0};
  assert.equal(gwentAction(chat, 1, { action: 'save', loadout: { ...config, counts: {} } }).ok, false);
  assert.ok(gwentAction(chat, 1, { action: 'save', loadout: config }).ok);
  const saved = gwentState(chat, 1).loadouts[config.faction];
  assert.deepEqual(saved, config); saved.counts.geralt = 10;
  assert.equal(gwentState(chat, 1).loadouts[config.faction].arts.geralt,1);
  assert.equal(gwentAction(chat,1,{action:'save',loadout:{...config,arts:{geralt:99}}}).ok,false);
  assert.equal(gwentState(chat, 1).loadouts[config.faction].counts.geralt, 1);
  for (const value of [null, [], 1, 'play']) assert.equal(gwentAction(chat, 1, value).ok, false);
});

test('all factions finish server-authoritative matches from either player perspective, including choices', () => {
  for(const faction of ['northern-realms','nilfgaard','scoiatael','monsters','skellige']) {
    const chat=setup();
    gwentAction(chat,1,{action:'join',loadout:defaultLoadout(faction)},100);
    gwentAction(chat,2,{action:'join',loadout:defaultLoadout('monsters')},101,()=>.51);
    const match=chat.game.gwent.matches[0]; let moves=0;
    while(match.state.phase==='playing' && moves<300) {
      const side=match.state.pending?.side || match.state.turn, userId=side==='player'?1:2;
      const view=gwentState(chat,userId,102+moves).match;
      assert.equal(view.state.sides.ai.hand.length,0);
      assert.deepEqual(legalPlays(view.state,'player'),legalPlays(match.state,side));
      const pending=match.state.pending;
      const play=legalPlays(match.state,side)[0];
      const command=pending ? {action:'choice',choiceId:pending.options[0].id} : play ? {action:'play',...play} : {action:'pass'};
      assert.ok(gwentAction(chat,userId,{...command,matchId:match.id,revision:match.revision},102+moves).ok,faction);
      moves++;
    }
    assert.equal(match.state.phase,'matchOver',faction);
  }
});
test('a plain read does not change what is stored, except for a rare heartbeat', async () => {
  const { gwentFingerprint } = await import('../miniapp/gwent.js');
  const chat = setup();
  assert.equal(gwentFingerprint(chat), '', 'an untouched chat has nothing to store');
  gwentAction(chat, 1, { action: 'join', loadout: defaultLoadout() }, 1000);
  const stored = gwentFingerprint(chat);
  gwentState(chat, 1, 1000 + 4000); gwentState(chat, 2, 1000 + 4000); gwentState(chat, 1, 1000 + 8000);
  assert.equal(gwentFingerprint(chat), stored, 'polls every few seconds store nothing');
  gwentState(chat, 1, 1000 + 12_000);
  assert.notEqual(gwentFingerprint(chat), stored, 'the heartbeat is renewed every 10 s');
  const paired = pair(setup());
  assert.ok(paired.ok);
});
