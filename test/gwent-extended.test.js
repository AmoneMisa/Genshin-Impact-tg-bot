import test from 'node:test';
import assert from 'node:assert/strict';
import { GWENT_DECKS, DECK_IDS, EXTENDED_FACTIONS, RULESETS, rulesetAllows, normalizeRuleset, expandDeck } from '../webapp/gwent-decks.js';
import { defaultLoadout, inspectLoadout, buildDeck } from '../webapp/gwent-builder.js';
import { createMatch, playCard, passRound, resolveChoice, legalPlays, rowValues, scores, SIDES } from '../webapp/gwent-engine.js';
import { chooseAiAction, seededRandom } from '../webapp/gwent-ai.js';

// Extended rules: five factions made for this game, the swap and ambush cards and the leader that moves units.

const catalogue = id => Object.values(GWENT_DECKS).flatMap(deck => expandDeck(deck)).find(card => card.id === id);
let nextUid = 20000;
const make = id => {
  const card = catalogue(id);
  assert.ok(card, `unknown card ${id}`);
  return { ...card, uid: nextUid++ };
};
const rows = (close = [], ranged = [], siege = []) => ({ close, ranged, siege });
function scene(faction = 'wild-hunt', foe = 'redania') {
  const state = createMatch({ playerDeck: GWENT_DECKS[faction], aiDeck: GWENT_DECKS[foe], rng: seededRandom(5), setup: false });
  state.turn = 'player'; state.starter = 'player';
  for (const side of SIDES) Object.assign(state.sides[side], { deck: [], hand: [], graveyard: [], rows: rows(), leader: null });
  return state;
}

test('the rule sets: classic is the five original factions, extended adds five more', () => {
  assert.deepEqual(RULESETS.classic.factions, DECK_IDS);
  assert.equal(RULESETS.extended.factions.length, 10);
  assert.deepEqual(EXTENDED_FACTIONS.filter(id => rulesetAllows('classic', id)), []);
  assert.ok(RULESETS.extended.factions.every(id => rulesetAllows('extended', id)));
  assert.equal(normalizeRuleset('anything'), 'classic');
  assert.equal(rulesetAllows('classic', 'skellige'), true);
});

test('every extended faction has a valid starting deck, at most three copies of a card and its own leaders', () => {
  const seen = new Map();
  for (const id of EXTENDED_FACTIONS) {
    const deck = GWENT_DECKS[id];
    const stats = inspectLoadout(defaultLoadout(id));
    assert.ok(stats.valid, `${id}: ${stats.errors.join('; ')}`);
    assert.ok(stats.units >= 30, `${id} offers a choice of cards`);
    assert.ok(deck.leaders.length >= 3, `${id} has leaders`);
    for (const [card, copies] of deck.cards) {
      assert.ok(copies >= 1 && copies <= 3, `${id}/${card.id}`);
      if (card.id.slice(0, 3) === `${id.slice(0, 2)}-` || !card.id.includes('-')) continue;
    }
    for (const [card] of deck.cards) if (/^(wh|wi|to|ve|re)-/.test(card.id)) {
      assert.equal(seen.has(card.id), false, `${card.id} belongs to one faction`);
      seen.set(card.id, id);
    }
  }
});

test('swap: the unit sends one of its owner\'s ordinary units back to hand, never a hero', () => {
  const state = scene();
  const mage = make('wh-portal-mage'), target = make('wh-ice-warrior'), hero = make('wh-caranthir');
  state.sides.player.rows = rows([target], [hero]);
  state.sides.player.hand = [mage];
  const offered = legalPlays(state, 'player').filter(play => play.uid === mage.uid);
  assert.ok(offered.some(play => play.targetUid === undefined), 'a swap is optional');
  assert.ok(offered.some(play => play.targetUid === target.uid));
  assert.equal(offered.some(play => play.targetUid === hero.uid), false);
  const swapped = playCard(state, 'player', mage.uid, { row: 'ranged', targetUid: target.uid }).state;
  assert.ok(swapped.sides.player.hand.some(card => card.uid === target.uid), 'the unit returns to hand');
  assert.ok(swapped.sides.player.rows.ranged.some(card => card.uid === mage.uid), 'the swap unit stays on the board');
  assert.equal(swapped.sides.player.rows.close.length, 0);
  assert.ok(playCard(state, 'player', mage.uid, { row: 'ranged', targetUid: hero.uid }).error, 'a hero cannot be swapped');
  const plain = playCard(state, 'player', mage.uid, { row: 'ranged' }).state;
  assert.equal(plain.sides.player.hand.length, 0);
});

test('ambush: laid hidden in an enemy row, springs when the enemy plays a unit there, then squirrels appear for its owner', () => {
  const state = scene('redania', 'wild-hunt');
  const ambush = make('ambush');
  state.sides.player.hand = [ambush];
  state.sides.ai.hand = [make('wh-ice-warrior'), make('wh-aen-elle-archer')];
  const places = legalPlays(state, 'player').filter(play => play.uid === ambush.uid).map(play => play.row);
  assert.deepEqual(places.sort(), ['close', 'ranged', 'siege']);
  const laid = playCard(state, 'player', ambush.uid, { row: 'close' }).state;
  assert.equal(laid.sides.ai.traps.close.id, 'ambush');
  assert.equal(scores(laid).player, 0, 'an ambush has no strength of its own');
  assert.equal(legalPlays({ ...laid, turn: 'player' }, 'player').filter(play => play.row === 'close' && play.uid === ambush.uid).length, 0);
  // A unit in another row does not set it off.
  const safe = playCard(laid, 'ai', laid.sides.ai.hand[1].uid, { row: 'ranged' }).state;
  assert.equal(safe.sides.ai.traps.close.id, 'ambush');
  assert.equal(safe.sides.player.rows.close.length, 0);
  // A unit in the trapped row does.
  const sprung = playCard(laid, 'ai', laid.sides.ai.hand[0].uid, { row: 'close' }).state;
  assert.equal(sprung.sides.ai.traps.close, null);
  assert.deepEqual(sprung.sides.player.rows.close.map(card => card.id), ['squirrel', 'squirrel']);
  assert.equal(sprung.sides.player.graveyard.some(card => card.id === 'ambush'), true);
});

test('an ambush that is never sprung goes to its owner\'s graveyard when the round ends', () => {
  const state = scene('redania', 'wild-hunt');
  const ambush = make('ambush');
  state.sides.player.hand = [ambush, make('re-captain')];
  state.sides.ai.hand = [make('wh-ice-warrior')];
  let next = playCard(state, 'player', ambush.uid, { row: 'siege' }).state;
  next = passRound(next, 'ai').state;
  next = passRound(next, 'player').state;
  assert.equal(next.round, 2);
  assert.equal(next.sides.ai.traps.siege, null);
  assert.equal(next.sides.player.graveyard.some(card => card.id === 'ambush'), true);
});

test('leader that moves any units: up to three non-hero units change rows, hero cards stay', () => {
  const state = scene();
  const a = make('wh-ice-warrior'), b = make('wh-red-rider'), hero = make('wh-eredin-guard');
  state.sides.player.rows = rows([a, b, hero]);
  state.weather.close = true;
  state.sides.player.leader = { id: 'test-hope', name: 'Надежда', type: 'leader', uid: 99001, effect: { type: 'moveAny' } };
  let next = playCard(state, 'player', 99001).state;
  assert.equal(next.pending.kind, 'moveFrom');
  assert.deepEqual(next.pending.options.map(option => option.id), [a.uid, b.uid, 'done'], 'no hero in the list');
  next = resolveChoice(next, 'player', a.uid).state;
  assert.equal(next.pending.kind, 'moveTo');
  assert.deepEqual(next.pending.options.map(option => option.id), ['ranged', 'siege']);
  next = resolveChoice(next, 'player', 'siege').state;
  assert.deepEqual(next.sides.player.rows.siege.map(card => card.uid), [a.uid]);
  assert.equal(next.pending.kind, 'moveFrom', 'it goes on with the next unit');
  next = resolveChoice(next, 'player', 'done').state;
  assert.equal(next.pending, null);
});

test('faction passives: Velen keep up to 3 strength in weather, Redania spies draw three, Toussaint swap three cards', () => {
  const velen = scene('velen', 'redania');
  velen.sides.player.rows = rows([make('ve-bandit'), make('ve-baron')]);
  velen.weather.close = true;
  velen.sides.ai.rows = rows([make('re-captain')]);
  assert.equal(scores(velen).player, 3 + 10, 'the bandit keeps 3, the hero is untouched');
  assert.equal(scores(velen).ai, 1, 'the other faction drops to 1 as usual');
  assert.equal(rowValues([make('ve-bandit')], true)[0], 1, 'the weather rule itself is unchanged');

  const redania = scene('redania', 'wild-hunt');
  const spy = make('re-informant');
  redania.sides.player.hand = [spy];
  redania.sides.player.deck = [make('re-captain'), make('re-captain'), make('re-captain'), make('re-captain')];
  assert.equal(playCard(redania, 'player', spy.uid, { row: 'close' }).state.sides.player.hand.length, 3);
  const other = scene('wild-hunt', 'redania');
  const wspy = make('wh-scout');
  other.sides.player.hand = [wspy];
  other.sides.player.deck = [make('wh-ice-warrior'), make('wh-ice-warrior'), make('wh-ice-warrior')];
  assert.equal(playCard(other, 'player', wspy.uid, { row: 'close' }).state.sides.player.hand.length, 2, 'other factions draw two');

  const match = createMatch({ playerDeck: GWENT_DECKS.toussaint, aiDeck: GWENT_DECKS.redania, rng: seededRandom(3) });
  assert.equal(match.pending.kind, 'mulligan');
  assert.equal(match.pending.remaining, 3);
});

test('Witchers get a hero back from the graveyard at the start of round 3, Wild Hunt draw a card for a lost round', () => {
  const witchers = scene('witchers', 'redania');
  witchers.round = 2; witchers.wins = { player: 1, ai: 0 };
  witchers.sides.player.rows = rows([make('wi-wolf-novice')]);
  witchers.sides.player.graveyard = [make('wi-lambert'), make('wi-eskel'), make('wi-bear-brute')];
  witchers.sides.ai.rows = rows([make('re-captain'), make('re-captain')]);
  witchers.sides.player.hand = [make('wi-alchemist')];
  witchers.sides.ai.hand = [make('re-captain')];
  witchers.passed.ai = true;
  const third = passRound(witchers, 'player').state;
  assert.equal(third.round, 3);
  const back = third.sides.player.hand.filter(card => card.hero);
  assert.equal(back.length, 1, 'one hero comes back into the hand');
  assert.equal(third.sides.player.graveyard.filter(card => card.hero).length, 1);

  const hunt = scene('wild-hunt', 'redania');
  hunt.sides.player.rows = rows([make('wh-spectre')]);
  hunt.sides.ai.rows = rows([make('re-radovid')]);
  hunt.sides.player.hand = [make('wh-spectre')];
  hunt.sides.player.deck = [make('wh-ice-warrior'), make('wh-ice-warrior')];
  hunt.sides.ai.hand = [make('re-captain')];
  hunt.passed.ai = true;
  const lost = passRound(hunt, 'player').state;
  assert.equal(lost.lastRound.winner, 'ai');
  assert.equal(lost.sides.player.hand.length, 2, 'one card drawn for the lost round');
});

test('every extended faction plays a whole match against others, with every level of AI', () => {
  const pairs = [['wild-hunt', 'witchers'], ['toussaint', 'velen'], ['redania', 'wild-hunt'], ['velen', 'skellige'], ['witchers', 'monsters'], ['redania', 'nilfgaard'], ['toussaint', 'northern-realms'], ['velen', 'scoiatael']];
  for (const [i, [a, b]] of pairs.entries()) for (const level of ['easy', 'medium']) {
    const rng = seededRandom(40 + i);
    let state = createMatch({ playerDeck: buildDeck(defaultLoadout(a)), aiDeck: buildDeck(defaultLoadout(b)), rng });
    for (let steps = 0; steps < 800 && state.phase === 'playing'; steps += 1) {
      const side = state.pending ? state.pending.side : state.turn;
      const action = chooseAiAction(state, { level, side, rng, budgetMs: 10 });
      assert.ok(action, `${a} v ${b}: no action for ${side}`);
      const result = action.type === 'choice' ? resolveChoice(state, side, action.id)
        : action.type === 'pass' ? passRound(state, side) : playCard(state, side, action.uid, action);
      assert.ok(result.state, `${a} v ${b}: ${result.error}`);
      state = result.state;
    }
    assert.equal(state.phase, 'matchOver', `${a} v ${b} (${level})`);
  }
});

// ---- the two rule sets in the shared lobby ---------------------------------------------------

import { runGwent, emptyLobby } from '../miniapp/gwentLobby.js';

const NOW = 7_000_000;
const people = Object.fromEntries([1, 2, 3, 4].map(id => [String(id), { name: `Игрок ${id}`, friends: [1, 2, 3, 4].filter(other => other !== id).map(String) }]));
const ask = (lobby, user, mutation, body, now = NOW, extra = {}) => runGwent({ lobby, userId: user, name: `Игрок ${user}`, people, mutation, body, now, rng: () => 0.4, ...extra });
const join = (lobby, user, faction, ruleset, now = NOW) => ask(lobby, user, true, { action: 'join', ruleset, loadout: defaultLoadout(faction) }, now, { rating: { rating: 1000, games: 0 } });

test('a deck is only accepted under rules that allow its faction', () => {
  const lobby = emptyLobby();
  assert.equal(join(lobby, 1, 'velen', 'classic').result.ok, false, 'a new faction cannot play by the original rules');
  assert.equal(join(lobby, 1, 'velen', undefined).result.ok, false, 'the original rules are the default');
  assert.equal(join(lobby, 1, 'velen', 'extended').result.searching, true);
  assert.equal(ask(lobby, 2, true, { action: 'invite', targetId: '3', ruleset: 'classic', loadout: defaultLoadout('redania') }).result.ok, false);
});

test('players are paired only under the same rules, and only original-rules games are rated', () => {
  const lobby = emptyLobby();
  join(lobby, 1, 'skellige', 'classic');
  join(lobby, 2, 'skellige', 'extended', NOW + 100);
  assert.equal(lobby.gwent.matches.length, 0, 'different rules do not meet');
  const extended = join(lobby, 3, 'redania', 'extended', NOW + 200);
  assert.ok(extended.result.match, 'the second extended player is matched at once, whatever the faction');
  assert.equal(extended.result.match.ruleset, 'extended');
  assert.equal(extended.result.match.rated, null, 'extended games are not rated');
  const classic = join(lobby, 4, 'monsters', 'classic', NOW + 300);
  assert.equal(classic.result.match.ruleset, 'classic');
  assert.ok(classic.result.match.rated, 'original-rules games are rated');
});

test('an invitation carries its rules and is accepted only with a deck those rules allow', () => {
  const lobby = emptyLobby();
  const sent = ask(lobby, 1, true, { action: 'invite', targetId: '2', ruleset: 'extended', loadout: defaultLoadout('wild-hunt') });
  assert.equal(sent.result.invitation.ruleset, 'extended');
  const accepted = ask(lobby, 2, true, { action: 'accept_invite', inviteId: sent.result.invitation.id, loadout: defaultLoadout('nilfgaard') }, NOW + 100);
  assert.equal(accepted.result.match.ruleset, 'extended');
  assert.equal(accepted.result.match.rated, null);
  const classic = ask(lobby, 3, true, { action: 'invite', targetId: '4', ruleset: 'classic', loadout: defaultLoadout('monsters') }, NOW + 200);
  assert.equal(ask(lobby, 4, true, { action: 'accept_invite', inviteId: classic.result.invitation.id, loadout: defaultLoadout('toussaint') }, NOW + 300).result.ok, false, 'the original rules do not allow a Toussaint deck');
});

test('ambushes stay hidden: the player sees only the ones laid in enemy rows, spectators see none', () => {
  const lobby = emptyLobby();
  join(lobby, 1, 'redania', 'extended'); join(lobby, 2, 'wild-hunt', 'extended', NOW + 100);
  const match = lobby.gwent.matches[0];
  match.state.sides.ai.traps.close = { id: 'ambush', name: 'Засада', type: 'special', special: 'ambush', uid: 90001 };
  match.state.sides.player.traps.siege = { id: 'ambush', name: 'Засада', type: 'special', special: 'ambush', uid: 90002 };
  const mine = ask(lobby, 1, false, null, NOW + 200).result.match.state;
  assert.equal(mine.sides.ai.traps.close?.id, 'ambush', 'the trap player one laid in the enemy row is visible to them');
  assert.equal(mine.sides.player.traps.siege, null, 'the enemy trap in their own row is not');
  const theirs = ask(lobby, 2, false, null, NOW + 200).result.match.state;
  assert.equal(theirs.sides.ai.traps.siege?.id, 'ambush');
  assert.equal(theirs.sides.player.traps.close, null);
  const watched = ask(lobby, 3, false, null, NOW + 200, { watch: match.id }).result.spectating.state;
  assert.deepEqual([watched.sides.player.traps, watched.sides.ai.traps], [{ close: null, ranged: null, siege: null }, { close: null, ranged: null, siege: null }]);
});
