import test from 'node:test';
import assert from 'node:assert/strict';
import settleBuildUpgrade from '../functions/game/builds/settleBuildUpgrade.js';

// goldMine level 2 upgrade takes 0.25h per template/buildsTemplate.js
const GOLD_MINE_LVL2_HOURS = 0.25;

function build(overrides = {}) {
  return { currentLvl: 1, upgradeStartedAt: null, resourceCollected: 0, ...overrides };
}

test('does nothing when no upgrade is in progress', () => {
  const b = build();
  assert.equal(settleBuildUpgrade(b, 'goldMine'), false);
  assert.equal(b.currentLvl, 1);
});

test('does nothing while the timer has not expired yet', () => {
  const b = build({ upgradeStartedAt: Date.now() }); // just started
  assert.equal(settleBuildUpgrade(b, 'goldMine'), false);
  assert.equal(b.currentLvl, 1);
  assert.ok(b.upgradeStartedAt);
});

test('completes the upgrade once the persisted timer has elapsed, even without the hourly cron', () => {
  const startedAt = Date.now() - (GOLD_MINE_LVL2_HOURS * 60 * 60 * 1000) - 1000; // 1s past due
  const b = build({ upgradeStartedAt: startedAt });

  const settled = settleBuildUpgrade(b, 'goldMine');

  assert.equal(settled, true);
  assert.equal(b.currentLvl, 2);
  assert.equal(b.upgradeStartedAt, null);
});

test('is idempotent — calling it again on an already-settled build is a no-op', () => {
  const startedAt = Date.now() - (GOLD_MINE_LVL2_HOURS * 60 * 60 * 1000) - 1000;
  const b = build({ upgradeStartedAt: startedAt });

  settleBuildUpgrade(b, 'goldMine');
  const secondCall = settleBuildUpgrade(b, 'goldMine');

  assert.equal(secondCall, false);
  assert.equal(b.currentLvl, 2);
});

test('never throws for an unknown building name, and reports no completion', () => {
  const b = build({ upgradeStartedAt: Date.now() - 1_000_000 });
  assert.equal(settleBuildUpgrade(b, 'notARealBuilding'), false);
});
