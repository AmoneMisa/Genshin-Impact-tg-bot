import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { forgeVisualProfile, renderForgeLootArt } from '../webapp/loot-forge.js';
import { lootConditionProfile, lootTone, lootVisualProfile, normalizeLootKind, renderDailySwordArt, renderLootArt, swordShapeForLength } from '../webapp/loot-renderer.js';

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

test('same item keeps identity while quality and persistence change visible condition', () => {
  const base = {
    name: 'Moon breaker',
    kind: 'twoHandedSword',
    category: 'sword',
    mainType: 'weapon',
    grade: 'S',
    rarity: 'rare',
    cost: 120000,
  };
  const pristine = {
    ...base,
    quality: { current: 96, max: 100 },
    persistence: { current: 188, max: 190 },
  };
  const battered = {
    ...base,
    quality: { current: 18, max: 100 },
    persistence: { current: 35, max: 190 },
  };

  assert.deepEqual(lootVisualProfile(pristine), lootVisualProfile(battered));
  assert.equal(lootConditionProfile(pristine).quality, 'masterwork');
  assert.equal(lootConditionProfile(pristine).wear, 'pristine');
  assert.equal(lootConditionProfile(battered).quality, 'rough');
  assert.equal(lootConditionProfile(battered).wear, 'critical');
  assert.equal(lootConditionProfile(pristine).qualityRatio, .96);
  assert.equal(lootConditionProfile(pristine).durabilityRatio, 188 / 190);

  const pristineArt = renderLootArt(pristine, { reveal: true });
  const batteredArt = renderLootArt(battered, { reveal: true });
  assert.match(pristineArt, /quality-masterwork wear-pristine/);
  assert.match(batteredArt, /quality-rough wear-critical/);
  assert.match(batteredArt, /loot-wear-marks/);
  assert.match(batteredArt, /data-loot-wear="critical"/);
});

test('missing condition metrics stay neutral instead of inventing wear', () => {
  const condition = lootConditionProfile({ grade: 'A', kind: 'helmet' });
  assert.deepEqual(condition, {
    quality: 'unknown',
    wear: 'unknown',
    qualityRatio: null,
    durabilityRatio: null,
  });
  const art = renderLootArt({ grade: 'A', kind: 'helmet' });
  assert.match(art, /quality-unknown wear-unknown/);
});

test('forge level evolves visible runes without rerolling the base item identity', () => {
  const base = {
    name: 'Kingsguard Edge',
    kind: 'oneHandedSword',
    category: 'sword',
    mainType: 'weapon',
    grade: 'S',
    rarity: 'rare',
    cost: 88000,
    quality: { current: 92, max: 100 },
    persistence: { current: 180, max: 190 },
    maxForgeLevel: 10,
  };
  const identity = lootVisualProfile(base);
  for (const forgeLevel of [0, 3, 6, 9, 10]) {
    assert.deepEqual(lootVisualProfile({ ...base, forgeLevel }), identity);
  }

  assert.deepEqual(forgeVisualProfile({ ...base, forgeLevel: 0 }), {
    level: 0, maxLevel: 10, progress: 0, tier: 'dormant', activeSegments: 0, wear: 'pristine',
  });
  assert.equal(forgeVisualProfile({ ...base, forgeLevel: 3 }).tier, 'tempered');
  assert.equal(forgeVisualProfile({ ...base, forgeLevel: 6 }).tier, 'etched');
  assert.equal(forgeVisualProfile({ ...base, forgeLevel: 9 }).tier, 'radiant');
  assert.equal(forgeVisualProfile({ ...base, forgeLevel: 10 }).tier, 'ascendant');
  assert.equal(forgeVisualProfile({ ...base, forgeLevel: 10 }).activeSegments, 10);
  assert.equal(forgeVisualProfile({ ...base, forgeLevel: 999 }).level, 10);

  const ascendant = renderForgeLootArt({ ...base, forgeLevel: 10 }, { reveal: true });
  assert.match(ascendant, /forge-ascendant/);
  assert.match(ascendant, /data-forge-level="10"/);
  assert.match(ascendant, /data-forge-segments="10"/);
  assert.match(ascendant, /forge-rune-wheel/);
  assert.match(ascendant, /forge-level-mark[^>]*[^]*\+10/);
  assert.match(ascendant, /motion-spin/);

  const critical = renderForgeLootArt({ ...base, forgeLevel: 10, persistence: { current: 20, max: 190 } });
  assert.match(critical, /forge-ascendant condition-wear-critical/);
});

test('successful forge upgrade gets a one-shot impact sequence only when level increased', () => {
  const item = {
    name: 'Kingsguard Edge',
    kind: 'oneHandedSword',
    category: 'sword',
    mainType: 'weapon',
    grade: 'S',
    rarity: 'rare',
    cost: 88000,
    forgeLevel: 7,
    maxForgeLevel: 10,
    quality: { current: 92, max: 100 },
    persistence: { current: 180, max: 190 },
  };
  const impact = renderForgeLootArt(item, { reveal: true, forgeImpact: true, previousLevel: 6 });
  assert.match(impact, /is-forge-impact/);
  assert.match(impact, /data-forge-previous-level="6"/);
  assert.match(impact, /forge-hammer-strike/);
  assert.match(impact, /forge-impact-flash/);
  assert.match(impact, /forge-rune-surge/);
  assert.match(impact, /forge-level-burst[^>]*[^]*\+7/);

  const unchanged = renderForgeLootArt(item, { reveal: true, forgeImpact: true, previousLevel: 7 });
  assert.doesNotMatch(unchanged, /is-forge-impact/);
  assert.doesNotMatch(unchanged, /forge-hammer-strike/);
});

test('loot styles are wired before VFX/design system and stay mobile safe', () => {
  const index = fs.readFileSync(path.join(root, 'webapp/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'webapp/loot-renderer.css'), 'utf8');
  const forgeCss = fs.readFileSync(path.join(root, 'webapp/loot-forge.css'), 'utf8');
  const equipmentCss = fs.readFileSync(path.join(root, 'webapp/loot-equipment.css'), 'utf8');
  const stylesheets = [...index.matchAll(/href="\/([^\"]+\.css)"/g)].map(match => match[1]);
  assert.ok(stylesheets.includes('loot-renderer.css'));
  assert.ok(stylesheets.includes('loot-forge.css'));
  assert.ok(stylesheets.includes('loot-equipment.css'));
  assert.ok(stylesheets.indexOf('loot-renderer.css') < stylesheets.indexOf('loot-forge.css'));
  assert.ok(stylesheets.indexOf('loot-forge.css') < stylesheets.indexOf('vfx.css'));
  assert.ok(stylesheets.indexOf('loot-equipment.css') < stylesheets.indexOf('vfx.css'));
  assert.equal(stylesheets.at(-1), 'design-system.css');
  assert.ok(css.includes('.material-obsidian'));
  assert.ok(css.includes('.material-moonsteel'));
  assert.ok(css.includes('.ornament-royal'));
  assert.ok(css.includes('.ornament-crystal'));
  assert.ok(css.includes('.loot-wear-marks'));
  assert.ok(css.includes('.quality-masterwork'));
  assert.ok(css.includes('.wear-critical'));
  assert.ok(forgeCss.includes('.forge-ascendant'));
  assert.ok(forgeCss.includes('.forge-rune-wheel'));
  assert.ok(forgeCss.includes('.condition-wear-critical'));
  assert.ok(forgeCss.includes('.forge-hammer-strike'));
  assert.ok(forgeCss.includes('.forge-level-burst'));
  assert.ok(forgeCss.includes('@keyframes forge-hammer-impact'));
  assert.ok(forgeCss.includes('@media(max-width:390px)'));
  assert.ok(forgeCss.includes('@media(prefers-reduced-motion:reduce)'));
  assert.ok(forgeCss.includes('pointer-events:none'));
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
  assert.ok(equipment.includes("import { renderForgeLootArt } from './loot-forge.js'"));
  assert.ok(equipment.includes('equipment-loot-preview'));
  assert.ok(equipment.includes('forge-mini-loot'));
  assert.ok(equipment.includes('renderForgeLootArt(item,{reveal:true,...options})'));
  assert.ok(equipment.includes('forgeImpact:true,previousLevel'));
  assert.ok(equipment.includes('showForgeReveal(payload.item'));
});
