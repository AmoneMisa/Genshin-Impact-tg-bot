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
    for (const card of [...GWENT_DECKS[id].cards.map(([card]) => card), ...GWENT_DECKS[id].leaders, ...Object.values(TOKENS)]) {
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
