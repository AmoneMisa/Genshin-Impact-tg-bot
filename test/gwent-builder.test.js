import test from 'node:test';
import assert from 'node:assert/strict';
import { GWENT_DECKS, DECK_IDS, TOKENS } from '../webapp/gwent-decks.js';
import { defaultLoadout, inspectLoadout, buildDeck, filterCards, leaderDescription } from '../webapp/gwent-builder.js';
import { createMatch } from '../webapp/gwent-engine.js';
import { GWENT_ART } from '../webapp/gwent-art.js';
import fs from 'node:fs';

test('every faction has a playable default, exact local art, and selectable leaders', () => {
  for (const id of DECK_IDS) {
    const config = defaultLoadout(id);
    assert.ok(inspectLoadout(config).valid);
    for (const leader of GWENT_DECKS[id].leaders) {
      const chosen = buildDeck({ ...config, leaderId: leader.id });
      const state = createMatch({ playerDeck: chosen, aiDeck: chosen });
      assert.equal(state.sides.player.leader.id, leader.id);
      assert.notEqual(leaderDescription(leader), 'Особая способность лидера.');
    }
    for (const card of [...GWENT_DECKS[id].cards.map(([card]) => card), ...GWENT_DECKS[id].leaders, ...Object.values(TOKENS).filter(token => !['squirrel', 'wisp'].includes(token.id))]) {
      assert.ok(GWENT_ART[card.id], card.id);
      assert.ok(fs.existsSync('webapp' + GWENT_ART[card.id]), card.id);
    }
  }
});
test('editor validation rejects underfilled, malformed, foreign cards/leaders and excessive copies', () => {
  const config = defaultLoadout();
  assert.equal(inspectLoadout({ ...config, counts: {} }).valid, false);
  assert.equal(inspectLoadout({ ...config, counts: { ...config.counts, geralt: 2 } }).valid, false);
  assert.equal(inspectLoadout({ ...config, counts: { ...config.counts, geralt: 0.5 } }).valid, false);
  assert.equal(inspectLoadout({ ...config, counts: { ...config.counts, geralt: -1 } }).valid, false);
  assert.equal(inspectLoadout({ ...config, counts: { ...config.counts, geralt: '1' } }).valid, false);
  assert.equal(inspectLoadout({ ...config, counts: { ...config.counts, 'king-bran': 1 } }).valid, false);
  assert.equal(inspectLoadout({ ...config, leaderId: 'king-bran' }).valid, false);
  for (const faction of ['__proto__', 'constructor', null, 'unknown']) assert.equal(inspectLoadout({ faction }).valid, false);
  assert.equal(inspectLoadout(null).valid, false);
});
test('22 units counts heroes; ten specials is a separate cap; omitted cards are not dealt', () => {
  const config = defaultLoadout('skellige');
  config.counts = {}; let left = 22;
  for (const [card, limit] of GWENT_DECKS.skellige.cards.filter(([card]) => card.type === 'unit')) {
    config.counts[card.id] = Math.min(limit, left); left -= config.counts[card.id];
  }
  assert.equal(inspectLoadout(config).valid, true);
  assert.equal(inspectLoadout(config).units, 22);
  for (const [card, limit] of GWENT_DECKS.skellige.cards.filter(([card]) => card.type === 'special')) config.counts[card.id] = limit;
  assert.ok(inspectLoadout(config).specials > 10);
  assert.equal(inspectLoadout(config).valid, false);
  assert.throws(() => buildDeck(config));
  const trimmed = defaultLoadout(); trimmed.counts.geralt = 0;
  assert.ok(!buildDeck(trimmed).cards.some(([card]) => card.id === 'geralt'));
});
test('search, row, ability, inclusion and hero filters compose without mutating catalog', () => {
  const config = defaultLoadout();
  const spies = filterCards(config, { ability: 'spy', row: 'close' });
  assert.ok(spies.length); assert.ok(spies.every(([card]) => card.spy && card.rows.includes('close')));
  assert.ok(filterCards(config, { search: 'ГЕРАЛЬТ' }).some(([card]) => card.id === 'geralt'));
  assert.ok(filterCards(config, { type: 'hero' }).every(([card]) => card.hero));
  assert.ok(filterCards(config, { origin: 'neutral' }).some(([card]) => card.id === 'geralt'));
  config.counts.geralt = 0;
  assert.ok(!filterCards(config, { included: true }).some(([card]) => card.id === 'geralt'));
  assert.equal(filterCards(config, { search: 'нет такой карты' }).length, 0);
});

test('card limits follow the original deck builder (copies per card, never more than three, 3 of every shared special)', async () => {
  const { GWENT_DECKS, NEUTRAL, SHARED_SPECIALS } = await import('../webapp/gwent-decks.js');
  const limit = (faction, id) => GWENT_DECKS[faction].cards.find(([card]) => card.id === id)[1];
  const northernUnits = GWENT_DECKS['northern-realms'].cards.filter(([card]) => card.type === 'unit' && !NEUTRAL.some(([neutral]) => neutral.id === card.id));
  assert.equal(northernUnits.reduce((sum, [, copies]) => sum + copies, 0), 37, '38 in the original, minus the fourth Poor Infantry');
  assert.deepEqual(['poor-infantry', 'kaedweni-expert', 'ballista', 'blue-stripes', 'crinfrid'].map(id => limit('northern-realms', id)), [3, 3, 2, 3, 3]);
  assert.deepEqual(['berserker', 'young-berserker', 'light-longship', 'brokvar-archer'].map(id => limit('skellige', id)), [1, 3, 3, 2]);
  assert.deepEqual(['bruxa', 'arachas', 'crone-brewess'].map(id => limit('monsters', id)), [1, 3, 1]);
  assert.deepEqual(['impera', 'nausicaa', 'black-archer'].map(id => limit('nilfgaard', id)), [3, 3, 2]);
  assert.deepEqual(['mahakaman', 'dwarf-skirmisher', 'dol-scout'].map(id => limit('scoiatael', id)), [3, 3, 3]);
  assert.ok(SHARED_SPECIALS.every(([, copies]) => copies === 3));
});

test('a deck saved under older limits is cut to the current ones and stays playable', async () => {
  const { repairLoadout, inspectLoadout, defaultLoadout } = await import('../webapp/gwent-builder.js');
  const old = defaultLoadout('monsters');
  old.counts.bruxa = 2; old.counts['crone-brewess'] = 2; old.counts.ghost = 3;
  assert.equal(inspectLoadout(old).valid, false, 'the strict check refuses it');
  const fixed = repairLoadout(old);
  assert.equal(fixed.counts.bruxa, 1);
  assert.equal(fixed.counts['crone-brewess'], 1);
  assert.equal('ghost' in fixed.counts, false);
  assert.equal(inspectLoadout(fixed).valid, true);
  // Too many special cards are cut to the maximum of ten.
  const heavy = defaultLoadout('skellige');
  for (const id of ['decoy', 'commanders-horn', 'scorch', 'biting-frost', 'impenetrable-fog', 'torrential-rain', 'clear-weather', 'mardroeme', 'storm-skellige']) heavy.counts[id] = 3;
  assert.equal(inspectLoadout(repairLoadout(heavy)).specials, 10);
  assert.equal(inspectLoadout(repairLoadout(heavy)).valid, true);
});

test('no card may be taken more than three times, in the catalogue or in a deck', async () => {
  const { MAX_COPIES } = await import('../webapp/gwent-decks.js');
  assert.equal(MAX_COPIES, 3);
  for (const id of DECK_IDS) for (const [card, limit] of GWENT_DECKS[id].cards) assert.ok(limit >= 1 && limit <= 3, `${id}/${card.id} has limit ${limit}`);
  const loadout = defaultLoadout('scoiatael');
  loadout.counts.mahakaman = 4;
  assert.equal(inspectLoadout(loadout).valid, false);
  assert.match(inspectLoadout(loadout).errors.join(' '), /от 0 до 3/);
});
