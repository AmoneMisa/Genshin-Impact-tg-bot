import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GWENT_ART, GWENT_PRINTED_CARDS, GWENT_CARD_VARIANTS } from '../webapp/gwent-art.js';
import { DECK_IDS, GWENT_DECKS, TOKENS, RULESETS, deckFor } from '../webapp/gwent-decks.js';
import { gwentCardHtml } from '../webapp/gwent.js';
import { cardArtOptions, cardArtSource } from '../webapp/gwent-art-options.js';
import { EXTENDED_GWENT_ART } from '../webapp/gwent-expansion-art.js';
import { defaultLoadout, buildDeck, inspectLoadout } from '../webapp/gwent-builder.js';
import { createMatch } from '../webapp/gwent-engine.js';

test('extended faction selectors use reviewed raster crests and separate unlabelled banners', () => {
  for (const faction of RULESETS.extended.factions.filter(id => !RULESETS.classic.factions.includes(id))) {
    assert.match(GWENT_ART['shield:' + faction], /-crest\.png$/);
    assert.match(GWENT_ART['banner:' + faction], /-banner\.webp$/);
    for (const kind of ['shield', 'banner']) assert.ok(fs.existsSync('webapp' + GWENT_ART[kind + ':' + faction]));
  }
});

test('every playable card, token and leader uses a complete supplied card; backs match factions', () => {
  // The five original factions use the supplied card images; the extended factions and their squirrel token are drawn by the interface.
  const cards = [...DECK_IDS.flatMap(id => [...GWENT_DECKS[id].cards.map(([card]) => card), ...GWENT_DECKS[id].leaders]), ...Object.values(TOKENS).filter(token => !['squirrel', 'wisp'].includes(token.id))];
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

test('all rulesets, expansion leaders and summoned tokens have deployable printed faces', () => {
  for (const [ruleset, rules] of Object.entries(RULESETS)) for (const faction of rules.factions) {
    const deck = deckFor(ruleset, faction);
    for (const card of [...deck.cards.map(([c]) => c), ...deck.leaders]) {
      assert.ok(GWENT_PRINTED_CARDS.has(card.id), card.id);
      for (const source of cardArtOptions(card.id, ruleset)) assert.ok(fs.existsSync('webapp' + source), source);
      assert.ok(cardArtSource(card.id, 0, ruleset), card.id);
      assert.doesNotMatch(gwentCardHtml(card, card.strength, { ruleset }), /class="gwent-card-(name|trait|power)"/, card.id);
    }
  }
  for (const token of Object.values(TOKENS)) {
    assert.ok(GWENT_PRINTED_CARDS.has(token.id), token.id);
    assert.ok(fs.existsSync('webapp' + cardArtSource(token.id)), token.id);
  }
});

test('extended badge updates are selected by ruleset and never become cosmetic variants', () => {
  assert.equal(Object.keys(EXTENDED_GWENT_ART).length, 5);
  for (const [id, extended] of Object.entries(EXTENDED_GWENT_ART)) {
    const classic = cardArtSource(id);
    assert.notEqual(classic, extended, id);
    assert.equal(cardArtSource(id, 0, 'extended'), extended);
    assert.equal(cardArtOptions(id, 'extended').length, 1);
    assert.match(classic, /\/printed\//);
    assert.ok(fs.existsSync('webapp' + extended));
    const card = Object.values(GWENT_DECKS).flatMap(d => d.cards.map(([c]) => c)).find(c => c.id === id);
    assert.ok(gwentCardHtml(card, card.strength, { ruleset: 'extended' }).includes(extended));
    assert.ok(gwentCardHtml(card).includes(classic));
  }
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
