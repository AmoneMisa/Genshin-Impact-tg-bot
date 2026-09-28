import test from 'node:test';
import assert from 'node:assert/strict';
import { buildingCard, buildingWindow, cityHtml, formatDuration, upgradeProgress } from '../webapp/city.js';
import { BUILD_ART, buildArtUrl } from '../webapp/art/builds-art.js';
import { buildStages, buildArtModule } from '../scripts/blender/art.js';
import { featuresForTab, NAV_TABS } from '../webapp/nav.js';

const build = (overrides = {}) => ({
  id: 'goldMine', name: 'Золотая шахта', description: 'Добывает золото', currentLevel: 6, maxLevel: 30, nextLevel: 7,
  upgrading: false, remainingMs: 0, upgradeStartedAt: null,
  upgradeCost: { gold: 72000, crystals: 0, ironOre: 2400 },
  affordability: [{ resource: 'gold', met: true }, { resource: 'crystals', met: true }, { resource: 'ironOre', met: false }],
  requirements: { met: true, buildings: [{ title: 'Дворец', current: 8, required: 7, met: true }], character: [{ key: 'lvl', current: 32, required: 14, met: true }] },
  canUpgrade: false, blockedReason: 'resources', canSpeedup: false, speedupCost: 0,
  resourceType: 'gold', resourceCollected: 8420, productionPerHour: 1450, maxWorkHoursWithoutCollection: 12, canCollect: true,
  currentType: null, availableTypes: [], canRename: false, treasury: null,
  ...overrides,
});

test('building art resolves by level stage and style, clamping out-of-range levels', () => {
  const palace = BUILD_ART.palace;
  assert.ok(palace.common && palace.elven && palace.royal);
  const first = palace.elven[0];
  assert.equal(buildArtUrl('palace', first.from, 'elven'), first.url);
  assert.equal(buildArtUrl('palace', 999, 'elven'), palace.elven.at(-1).url);
  assert.equal(buildArtUrl('palace', 1, 'unknown'), buildArtUrl('palace', 1, Object.keys(palace)[0]));
  assert.equal(buildArtUrl('nope', 1), null);
  for (const styles of Object.values(BUILD_ART)) {
    for (const stages of Object.values(styles)) {
      stages.forEach((stage, i) => { if (i) assert.ok(stage.from > stages[i - 1].to, 'stages are sorted and disjoint'); });
    }
  }
});

test('generated builds-art.js matches the source images', () => {
  const module = buildArtModule(buildStages());
  assert.ok(module.includes('export const BUILD_ART'));
  for (const id of Object.keys(buildStages())) assert.ok(BUILD_ART[id], `${id} has art`);
});

test('building lot shows cost affordability, collect chip and the blocked upgrade button', () => {
  const html = buildingCard(build());
  assert.match(html, /data-city-card="goldMine"/);
  assert.match(html, /city-cost missing">⛏️ 2\s?400/);
  assert.match(html, /data-city-action="collect"[^>]*>🪙 \+8\s?420/);
  assert.match(html, /data-city-action="upgrade"[^>]*disabled/);
  assert.match(html, /\/art\/builds\/goldMine\//);
});

test('upgrading lot shows a live progress bar and a speed-up with its crystal cost', () => {
  const now = 1_000_000;
  const progress = upgradeProgress(build({ upgrading: true, remainingMs: 3000, upgradeStartedAt: now - 1000 }), now);
  assert.equal(progress.endAt, now + 3000);
  assert.equal(Math.round(progress.percent), 25);
  const html = buildingCard(build({ upgrading: true, remainingMs: 7_500_000, upgradeStartedAt: Date.now() - 1000, canSpeedup: true, speedupCost: 30, canCollect: false }));
  assert.match(html, /city-progress/);
  assert.match(html, /data-city-action="speedup"[^>]*>Ускорить · 30 💎/);
  assert.doesNotMatch(html, /data-city-action="upgrade"/);
  assert.equal(formatDuration(7_500_000), '2ч 5м 0с');
});

test('building window lists production, requirements, styles, treasury and rename', () => {
  const html = buildingWindow(build({
    id: 'palace', resourceType: null, canRename: true,
    availableTypes: [{ id: 'common', name: 'Обычный', owned: true, selected: true }, { id: 'royal', name: 'Королевский', owned: false, selected: false }],
    treasury: { guardedGold: 16000, guardedCrystals: 250, guardedIronOre: 900 },
  }));
  assert.match(html, /Улучшение до 7/);
  assert.match(html, /✓ Дворец 8\/7/);
  assert.match(html, /✓ Уровень героя 32\/14/);
  assert.match(html, /data-type="royal"[^>]*disabled[^>]*>🔒 Королевский/);
  assert.match(html, /Защита казны/);
  assert.match(html, /data-city-action="rename"/);
  assert.match(html, /Недостаточно ресурсов/);
  assert.doesNotMatch(html, /Производство/);
  assert.match(buildingWindow(build()), /Производство[\s\S]*1\s?450/);
});

test('city puts the palace first as the banner lot and escapes names', () => {
  const html = cityHtml({ buildings: [build(), build({ id: 'palace', name: '<b>Дом</b>' })] });
  assert.ok(html.indexOf('data-city-card="palace"') < html.indexOf('data-city-card="goldMine"'));
  assert.match(html, /city-card banner/);
  assert.match(html, /&lt;b&gt;Дом&lt;\/b&gt;/);
});

test('bottom nav groups every feature exactly once and hides the old buildings card', () => {
  const ids = ['profile', 'skills', 'boss', 'arena', 'clan', 'builds', 'help', 'brandNew'];
  const features = ids.map(id => ({ id }));
  const shown = NAV_TABS.flatMap(tab => featuresForTab(features, tab.id).map(f => f.id));
  assert.deepEqual([...shown].sort(), ids.filter(id => id !== 'builds').sort());
  assert.deepEqual(featuresForTab(features, 'city'), []);
  assert.deepEqual(featuresForTab(features, 'more').map(f => f.id), ['help', 'brandNew']);
  assert.deepEqual(featuresForTab([{ id: 'arena' }, { id: 'boss' }], 'battle').map(f => f.id), ['boss', 'arena']);
});

import { cityQuest } from '../webapp/city.js';
test('city quest picks harvest, then the lowest affordable upgrade, then running builds', () => {
  const mine = build({ id: 'goldMine', name: 'Шахта', currentLevel: 6, canCollect: true });
  const forge = build({ id: 'forge', name: 'Кузня', currentLevel: 3, nextLevel: 4, canUpgrade: true, canCollect: false, blockedReason: null });
  const palace = build({ id: 'palace', name: 'Дворец', currentLevel: 8, nextLevel: 9, canUpgrade: true, canCollect: false, blockedReason: null });
  assert.equal(cityQuest([forge, mine]).title, 'Урожай готов');
  assert.deepEqual(cityQuest([palace, forge]), { id: 'forge', icon: '📜', title: 'Новые горизонты', text: 'Улучши «Кузня» до ур. 4' });
  const building = build({ id: 'forge', name: 'Кузня', upgrading: true, remainingMs: 65_000, canUpgrade: false, canCollect: false });
  assert.equal(cityQuest([building]).title, 'Стройка идёт');
  assert.equal(cityQuest([build({ canCollect: false, canUpgrade: false, blockedReason: 'requirements' })]).title, 'Цель');
  assert.equal(cityQuest([build({ canCollect: false, canUpgrade: false, blockedReason: 'resources' })]).title, 'Копим ресурсы');
  assert.equal(cityQuest([build({ canCollect: false, canUpgrade: false, currentLevel: 30, maxLevel: 30, upgradeCost: null })]), null);
  assert.match(cityHtml({ buildings: [forge] }), /data-city-quest="forge"/);
});
