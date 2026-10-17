import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GWENT_ART, GWENT_PRINTED_CARDS, GWENT_CARD_VARIANTS } from '../webapp/gwent-art.js';
import { GWENT_DECKS, TOKENS } from '../webapp/gwent-decks.js';
import { gwentCardHtml } from '../webapp/gwent.js';
import { cardArtOptions } from '../webapp/gwent-art-options.js';
import { defaultLoadout, buildDeck, inspectLoadout } from '../webapp/gwent-builder.js';
import { createMatch } from '../webapp/gwent-engine.js';

test('every playable card, token and leader uses a complete supplied card; backs match factions', () => {
  const cards = [...Object.values(GWENT_DECKS).flatMap(deck => [...deck.cards.map(([card]) => card), ...deck.leaders]), ...Object.values(TOKENS)];
  for (const card of cards) {
    assert.ok(GWENT_PRINTED_CARDS.has(card.id), card.id);
    assert.match(GWENT_ART[card.id], /^\/art\/gwent\/printed\//);
    for (const source of GWENT_CARD_VARIANTS[card.id] || [GWENT_ART[card.id]]) assert.ok(fs.existsSync('webapp' + source), source);
  }
  for (const faction of ['northern-realms','nilfgaard','scoiatael','monsters']) assert.match(GWENT_ART['back:'+faction], new RegExp('printed/back-'+faction+'-1\\.webp$'));
  assert.match(GWENT_ART['back:skellige'], /deck_back_skellige\.jpg$/);
  assert.equal(GWENT_ART.geralt, '/art/gwent/printed/neit_h5.webp');
  assert.equal(GWENT_ART['eredin-commander'], '/art/gwent/printed/lid_m4.webp');
});

test('printed cards keep accessible names, without duplicate visible names/icons or base strength', () => {
  const card = GWENT_DECKS['northern-realms'].cards.find(([card]) => card.id === 'geralt')[0];
  const html = gwentCardHtml({...card, uid:12}, card.strength, { selectable:true });
  assert.match(html, /aria-label="Геральт из Ривии/);
  assert.doesNotMatch(html, /class="gwent-card-(name|trait|power)"/);
  const buffed = gwentCardHtml(card, 30);
  assert.match(buffed, /class="gwent-card-power">30</);
  assert.doesNotMatch(buffed, /class="gwent-card-name"/);
  const special = GWENT_DECKS['northern-realms'].cards.find(([card]) => card.id === 'commanders-horn')[0];
  assert.doesNotMatch(gwentCardHtml(special), /gwent-card-(name|trait|power)/);
});

test('one card has an explicit cosmetic choice independent of runtime UID and location', () => {
  const card = GWENT_DECKS.monsters.cards.find(([card]) => card.id === 'ghoul')[0];
  const one = gwentCardHtml({...card,uid:1}), two = gwentCardHtml({...card,uid:2});
  assert.match(one, /mons_1\.webp/); assert.match(two, /mons_1\.webp/);
  assert.match(gwentCardHtml({...card,uid:2,artIndex:1}, card.strength, {compact:true}), /mons_2\.webp/);
});

test('hero artwork is a saved choice on one canonical card, not extra playable entities', () => {
  for (const id of ['avallach','triss','yennefer','cirilla','geralt']) assert.equal(cardArtOptions(id).length,2,id);
  const original = defaultLoadout(), config = {...original, arts:{geralt:1, 'foltest-temeria':0}};
  assert.equal(inspectLoadout(config).valid,true);
  assert.deepEqual(inspectLoadout(config),inspectLoadout(original));
  const deck = buildDeck(config);
  assert.equal(deck.cards.filter(([card])=>card.id==='geralt').length,1);
  assert.equal(deck.cards.find(([card])=>card.id==='geralt')[1],1);
  const state = createMatch({playerDeck:deck,aiDeck:deck});
  const geralt = [...state.sides.player.hand,...state.sides.player.deck].find(card=>card.id==='geralt');
  assert.equal(geralt.artIndex,1);
  assert.match(gwentCardHtml(geralt),/neit_h5a\.webp/);
  assert.equal(state.sides.player.leader.artIndex,0);
  for (const arts of [{geralt:2},{geralt:-1},{geralt:'1'},{geralt:'https://example.com/art.png'},{'king-bran':0},[]]) {
    assert.equal(inspectLoadout({...original,arts}).valid,false);
  }
  // Older saved decks remain valid without the cosmetic preference field.
  const old = {...original};delete old.arts;assert.equal(inspectLoadout(old).valid,true);
});
