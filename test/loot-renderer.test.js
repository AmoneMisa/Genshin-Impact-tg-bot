import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { lootTone, lootVisualProfile, normalizeLootKind, renderDailySwordArt, renderLootArt, swordShapeForLength } from '../webapp/loot-renderer.js';

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
  assert.match(art, /data-loot-variant="3"/);
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

test('loot visual identity is deterministic but gives same-type items different geometry and materials', () => {
  const base = { kind: 'oneHandedSword', category: 'sword', mainType: 'weapon', grade: 'S', rarity: 'rare', cost: 25000 };
  const first = { ...base, name: 'Ashen Fang' };
  assert.deepEqual(lootVisualProfile(first), lootVisualProfile({ ...first }));

  const profiles = ['Ashen Fang', 'Moon Crown', 'Iron Hymn', 'Starfall', 'Kingsguard']
    .map(name => lootVisualProfile({ ...base, name }));
  assert.ok(new Set(profiles.map(profile => profile.variant)).size >= 3);
  assert.ok(new Set(profiles.map(profile => profile.material)).size >= 3);
  assert.ok(new Set(profiles.map(profile => profile.ornament)).size >= 2);

  const art = renderLootArt(first, { reveal: true });
  const profile = lootVisualProfile(first);
  assert.match(art, new RegExp(`data-loot-variant="${profile.variant}"`));
  assert.match(art, new RegExp(`data-loot-material="${profile.material}"`));
  assert.match(art, new RegExp(`data-loot-ornament="${profile.ornament}"`));
});

test('grade and rarity select stable visual tones', () => {
  assert.equal(lootTone({ grade: 'SSS' }), 'prismatic');
  assert.equal(lootTone({ grade: 'S' }), 'gold');
  assert.equal(lootTone({ rarity: 'royal' }), 'rose');
  assert.equal(lootTone({ rarity: 'common' }), 'mist');
});

test('loot styles are wired before VFX/design system and stay mobile safe', () => {
  const index = fs.readFileSync(path.join(root, 'webapp/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'webapp/loot-renderer.css'), 'utf8');
  const equipmentCss = fs.readFileSync(path.join(root, 'webapp/loot-equipment.css'), 'utf8');
  const stylesheets = [...index.matchAll(/href="\/([^\"]+\.css)"/g)].map(match => match[1]);
  assert.ok(stylesheets.includes('loot-renderer.css'));
  assert.ok(stylesheets.includes('loot-equipment.css'));
  assert.ok(stylesheets.indexOf('loot-renderer.css') < stylesheets.indexOf('vfx.css'));
  assert.ok(stylesheets.indexOf('loot-equipment.css') < stylesheets.indexOf('vfx.css'));
  assert.equal(stylesheets.at(-1), 'design-system.css');
  assert.ok(css.includes('.material-obsidian'));
  assert.ok(css.includes('.material-moonsteel'));
  assert.ok(css.includes('.ornament-royal'));
  assert.ok(css.includes('.ornament-crystal'));
  assert.ok(css.includes('@media(max-width:390px)'));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
  assert.ok(css.includes('pointer-events:none'));
  assert.ok(equipmentCss.includes('.equipment-loot-preview'));
  assert.ok(equipmentCss.includes('.forge-loot-reveal'));
  assert.ok(equipmentCss.includes('@media(prefers-reduced-motion:reduce)'));
});

test('daily sword, equipment gacha, arsenal and forge share the loot renderer', () => {
  const sword = fs.readFileSync(path.join(root, 'webapp/sword.js'), 'utf8');
  const gacha = fs.readFileSync(path.join(root, 'webapp/gacha.js'), 'utf8');
  const equipment = fs.readFileSync(path.join(root, 'webapp/equipment.js'), 'utf8');
  assert.ok(sword.includes("import { renderDailySwordArt } from './loot-renderer.js'"));
  assert.ok(sword.includes('renderDailySwordArt(state.length'));
  assert.ok(gacha.includes("import { renderLootArt } from './loot-renderer.js'"));
  assert.ok(gacha.includes('gacha-loot-stage'));
  assert.ok(gacha.includes('renderLootArt(item,{reveal:true})'));
  assert.ok(equipment.includes("import { renderLootArt } from './loot-renderer.js'"));
  assert.ok(equipment.includes('equipment-loot-preview'));
  assert.ok(equipment.includes('forge-mini-loot'));
  assert.ok(equipment.includes('showForgeReveal(payload.item'));
});
