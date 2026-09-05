import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { lootTone, normalizeLootKind, renderDailySwordArt, renderLootArt, swordShapeForLength } from '../webapp/loot-renderer.js';

const root = process.cwd();

test('daily sword geometry changes with real length instead of scaling one icon', () => {
  const small = swordShapeForLength(20);
  const medium = swordShapeForLength(70);
  const large = swordShapeForLength(180);
  assert.equal(small.tier, 'small');
  assert.equal(medium.tier, 'medium');
  assert.equal(large.tier, 'large');
  assert.ok(large.tipY < small.tipY);
  assert.ok(large.bladeBottomY > small.bladeBottomY);
  assert.ok(large.guardHalfWidth > small.guardHalfWidth);
  assert.ok(large.pommelRadius > small.pommelRadius);
  assert.ok(large.spinSeconds < small.spinSeconds);
  const art = renderDailySwordArt(180);
  assert.match(art, /data-sword-size="large"/);
  assert.match(art, /data-sword-length="180"/);
});

test('equipment kinds map to distinct original loot silhouettes and motion presets', () => {
  assert.equal(normalizeLootKind({ kind: 'twoHandedSword', category: 'sword' }), 'sword');
  assert.equal(normalizeLootKind({ category: 'helmet', mainType: 'armor' }), 'helmet');
  assert.equal(normalizeLootKind({ category: 'boots', mainType: 'armor' }), 'boots');
  assert.equal(normalizeLootKind({ kind: 'crossbow', category: 'bow' }), 'crossbow');
  assert.equal(normalizeLootKind({ category: 'ring', mainType: 'accessories' }), 'ring');
  assert.match(renderLootArt({ kind: 'twoHandedSword', grade: 'S' }, { reveal: true }), /motion-spin/);
  assert.match(renderLootArt({ category: 'helmet', grade: 'A' }, { reveal: true }), /motion-wobble/);
  assert.match(renderLootArt({ category: 'ring', grade: 'SSS' }, { reveal: true }), /motion-orbit/);
});

test('grade and rarity select stable visual tones', () => {
  assert.equal(lootTone({ grade: 'SSS' }), 'prismatic');
  assert.equal(lootTone({ grade: 'S' }), 'gold');
  assert.equal(lootTone({ rarity: 'royal' }), 'rose');
  assert.equal(lootTone({ rarity: 'common' }), 'mist');
});

test('loot renderer stylesheet is wired before VFX/design system and stays mobile safe', () => {
  const index = fs.readFileSync(path.join(root, 'webapp/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'webapp/loot-renderer.css'), 'utf8');
  const stylesheets = [...index.matchAll(/href="\/([^\"]+\.css)"/g)].map(match => match[1]);
  assert.ok(stylesheets.includes('loot-renderer.css'));
  assert.ok(stylesheets.indexOf('loot-renderer.css') < stylesheets.indexOf('vfx.css'));
  assert.ok(stylesheets.indexOf('loot-renderer.css') < stylesheets.indexOf('design-system.css'));
  assert.equal(stylesheets.at(-1), 'design-system.css');
  assert.ok(css.includes('@media(max-width:390px)'));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
  assert.ok(css.includes('pointer-events:none'));
});

test('daily sword and equipment gacha render the shared art layer', () => {
  const sword = fs.readFileSync(path.join(root, 'webapp/sword.js'), 'utf8');
  const gacha = fs.readFileSync(path.join(root, 'webapp/gacha.js'), 'utf8');
  assert.ok(sword.includes("import { renderDailySwordArt } from './loot-renderer.js'"));
  assert.ok(sword.includes('renderDailySwordArt(state.length'));
  assert.ok(gacha.includes("import { renderLootArt } from './loot-renderer.js'"));
  assert.ok(gacha.includes('gacha-loot-stage'));
  assert.ok(gacha.includes('renderLootArt(item,{reveal:true})'));
});
