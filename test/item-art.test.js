import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BASE_ITEM_ART_KEYS, ITEM_ART_KEYS, ITEM_ART_VARIANTS, itemArtKey, itemArtSources } from '../webapp/art/items-art.js';
import { normalizeLootKind, renderLootArt, renderDailySwordArt } from '../webapp/loot-renderer.js';
import { checkItemArt } from '../scripts/items/check-art.js';
import template from '../template/equipmentTemplate.js';

test('all equipment template categories have WebP art, including robe subtypes', () => {
  for (const type of template.itemType) for (const entry of type.kind) {
    const item = {kind:entry.type,category:entry.category,mainType:type.name};
    const kind = normalizeLootKind(item);
    assert.notEqual(kind,'relic',JSON.stringify(item));
    assert.ok(ITEM_ART_KEYS.includes(itemArtKey(kind,item)));
    assert.match(renderLootArt(item), /<img class="loot-item-image"/);
    for (const grade of ['B','A','S','SS','SSS']) {
      const graded = {...item,grade};
      assert.ok(!BASE_ITEM_ART_KEYS.includes(itemArtKey(kind,graded)),JSON.stringify(graded));
    }
  }
});

test('every painting has valid budgeted WebP files; references never ship to phones', () => {
  const {errors,rows} = checkItemArt();
  assert.deepEqual(errors,[]);
  assert.equal(rows.length,ITEM_ART_KEYS.length*3);
  assert.ok(rows.reduce((n,r)=>n+r.bytes,0)<ITEM_ART_KEYS.length*193000);
});

test('higher grades select distinct paintings without overriding weapon subtypes or forge identity', () => {
  for (const variant of ITEM_ART_VARIANTS) for (const grade of variant.grades) {
    const item={kind:variant.type||variant.kind,category:variant.kind,grade:grade.toLowerCase()};
    assert.equal(itemArtKey(variant.kind,item),variant.key);
    assert.match(renderLootArt(item),new RegExp(`data-art-key="${variant.key}"`));
    assert.equal(itemArtKey(variant.kind,{...item,forgeLevel:10}),variant.key);
  }
  assert.equal(itemArtKey('sword',{kind:'twoHandedSword',grade:'SSS'}),'greatsword-solar');
  assert.equal(itemArtKey('sword',{kind:'twoHandedSword',grade:'D'}),'greatsword');
  assert.equal(itemArtKey('armor',{kind:'heavy',grade:'SSS'}),'armor-prismatic');
  assert.equal(itemArtKey('armor',{kind:'robe',grade:'SSS'}),'mantle-royal');
  assert.equal(itemArtKey('boots',{kind:'robe',grade:'SSS'}),'anklets-crystal');
  assert.equal(itemArtKey('boots',{kind:'heavy',grade:'SSS'}),'boots-raven');
  assert.equal(itemArtKey('greaves',{kind:'robe',grade:'SSS'}),'leg-wraps-tidal');
  assert.equal(itemArtKey('gloves',{kind:'robe',grade:'SSS'}),'bracers-crystal');
  assert.equal(itemArtKey('gloves',{kind:'light',grade:'SSS'}),'gloves-nightweave');
  for (const kind of ['helmet','armor','gloves','greaves','boots']) for (const grade of ['SS','SSS']) {
    const item={kind:'light',category:kind==='armor'?'body':kind,grade};
    assert.equal(itemArtKey(kind,item),`${kind}-nightweave`);
    assert.match(renderLootArt(item),new RegExp(`data-art-key="${kind}-nightweave"`));
    for (const type of ['heavy','medium','robe']) assert.notEqual(itemArtKey(kind,{...item,kind:type}),`${kind}-nightweave`);
  }
  assert.equal(itemArtKey('armor',{kind:'heavy',grade:'A'}),'armor-opal');
  assert.equal(itemArtKey('armor',{kind:'robe',grade:'A'}),'mantle-astral');
  assert.equal(itemArtKey('sword',{kind:'twoHandedSword',grade:'A'}),'greatsword-dawn');
  assert.equal(itemArtKey('sword',{kind:'oneHandedSword',grade:'A'}),'sword-opal');
  assert.equal(itemArtKey('shield',{kind:'sigill',grade:'A'}),'sigil-dawn');
  assert.match(renderLootArt({kind:'robe',category:'helmet',grade:'A'}),/data-art-key="tiara-crescent"/);
  assert.match(renderLootArt({kind:'heavy',category:'helmet',grade:'A'}),/data-art-key="helmet-seraph"/);
  assert.equal(itemArtKey('boots',{kind:'robe',grade:'A'}),'anklets-ruby');
  assert.equal(itemArtKey('gloves',{kind:'robe',grade:'A'}),'bracers-ruby');
  assert.equal(itemArtKey('greaves',{kind:'robe',grade:'A'}),'leg-wraps-pearl');
  assert.equal(itemArtKey('gloves',{kind:'light',grade:'A'}),'gloves-sapphire');
  for (const kind of ['helmet','armor','greaves','boots']) {
    for (const grade of ['B','A','S']) {
      const light={kind:'light',category:kind==='armor'?'body':kind,grade};
      assert.equal(itemArtKey(kind,light),`${kind}-shadowleather`);
      assert.match(renderLootArt(light),new RegExp(`data-art-key="${kind}-shadowleather"`));
      assert.notEqual(itemArtKey(kind,{...light,kind:'heavy'}),`${kind}-shadowleather`);
      assert.notEqual(itemArtKey(kind,{...light,kind:'medium'}),`${kind}-shadowleather`);
      assert.equal(itemArtKey(kind,{...light,kind:'medium'}),`${kind}-sapphireguard`);
      assert.match(renderLootArt({...light,kind:'medium'}),new RegExp(`data-art-key="${kind}-sapphireguard"`));
      assert.notEqual(itemArtKey(kind,{...light,kind:'robe'}),`${kind}-shadowleather`);
    }
  }
  assert.match(renderLootArt({kind:'fists',grade:'A'}),/data-art-key="gauntlets-dusk"/);
  assert.match(renderLootArt({kind:'blunt',grade:'A'}),/data-art-key="hammer-opal"/);
  assert.equal(itemArtKey('gloves',{kind:'robe',grade:'D'}),'bracers');
  assert.equal(itemArtKey('greaves',{kind:'robe',grade:'D'}),'leg-wraps');
  assert.equal(itemArtKey('boots',{kind:'robe',grade:'D'}),'anklets');
  assert.equal(itemArtKey('shield',{kind:'sigill',grade:'SSS'}),'sigil-nebula');
  assert.equal(itemArtKey('shield',{kind:'sigill',grade:'D'}),'sigil');
  assert.match(renderLootArt({kind:'sigill',grade:'SSS'}),/data-art-key="sigil-nebula"/);
  assert.match(renderLootArt({kind:'robe',category:'helmet',grade:'SSS'}),/data-art-key="tiara-night"/);
  assert.equal(itemArtKey('ring',{grade:'D'}),'ring');
  assert.equal(itemArtKey('ring',{grade:'???'}),'ring');
});

test('canonical hammer previews use the hammer painting rather than the unknown-item fallback', () => {
  assert.equal(normalizeLootKind({kind:'hammer'}),'hammer');
  assert.match(renderLootArt({kind:'hammer'}),/data-art-key="hammer"/);
});

test('inventory caps image resolution and loads lazily; reveals load eagerly', () => {
  const thumb=renderLootArt({kind:'staff'}), reveal=renderLootArt({kind:'staff'},{reveal:true});
  assert.match(thumb,/loading="lazy" decoding="async"/);
  assert.doesNotMatch(thumb,/-512\.webp/);
  assert.match(reveal,/-512\.webp 512w/);
  assert.match(reveal,/loading="eager"/);
  assert.match(thumb,/width="512" height="768"/);
  assert.doesNotMatch(thumb+reveal,/<svg|<canvas|\.glb|Desktop/);
  assert.equal(itemArtSources('../../secret').src,'/art/items/v1/relic-128.webp');
});

test('daily sword keeps the real length and selects three distinct painted silhouettes', () => {
  for (const [length,key] of [[20,'dagger'],[70,'sword'],[180,'greatsword']]) {
    const html=renderDailySwordArt(length,{animated:false});
    assert.match(html,new RegExp(`data-art-key="${key}"`));
    assert.match(html,new RegExp(`data-sword-length="${length}"`));
    assert.doesNotMatch(html,/is-animated|<svg/);
  }
});

test('motion is visibility-gated, reduced-motion safe and independent of WebGL support', () => {
  const css=fs.readFileSync('webapp/item-art.css','utf8');
  const runtime=fs.readFileSync('webapp/item-art-runtime.js','utf8');
  const app=fs.readFileSync('webapp/app.js','utf8');
  assert.match(css,/animation-play-state:paused/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(runtime,/IntersectionObserver/);
  assert.match(runtime,/visibilitychange/);
  assert.doesNotMatch(runtime,/requestAnimationFrame|getContext|getGltfStage/);
  assert.ok(app.indexOf('startItemArt();')<app.indexOf("startWebGL($('webgl'))"));
});
