import test from 'node:test';
import assert from 'node:assert/strict';
import {
  prepareBuilds,
  getBuildsState,
  startBuildUpgrade,
  collectBuildResources,
  changeBuildType,
  renameBuild,
} from '../miniapp/builds.js';

function session(overrides = {}) {
  const base = {
    game: {
      stats: { lvl: 10, currentExp: 0, needExp: 1500 },
      gameClass: { stats: { name: 'warrior' }, skills: {} },
      inventory: { gold: 100_000, crystals: 10_000, ironOre: 5_000 },
      builds: {},
    },
  };

  return {
    ...base,
    ...overrides,
    game: {
      ...base.game,
      ...(overrides.game || {}),
      stats: { ...base.game.stats, ...(overrides.game?.stats || {}) },
      gameClass: { ...base.game.gameClass, ...(overrides.game?.gameClass || {}) },
      inventory: { ...base.game.inventory, ...(overrides.game?.inventory || {}) },
      builds: { ...base.game.builds, ...(overrides.game?.builds || {}) },
    },
  };
}

test('building preparation restores production fields for trainee area', () => {
  const player = session({
    game: {
      builds: {
        traineeArea: { currentLvl: 1, upgradeStartedAt: null, lastCollectAt: null },
      },
    },
  });

  assert.equal(prepareBuilds(player, 1_000), true);
  const state = getBuildsState(player, 1_000);
  const trainee = state.buildings.find((build) => build.id === 'traineeArea');

  assert.equal(player.game.builds.traineeArea.resourceCollected, 0);
  assert.equal(trainee.resourceType, 'experience');
  assert.equal(trainee.productionPerHour, 8000);
});

test('starting gold mine upgrade deducts exact configured resources', () => {
  const player = session({
    game: {
      inventory: { gold: 1_000, crystals: 100, ironOre: 100 },
      builds: {
        goldMine: { currentLvl: 1, upgradeStartedAt: null, lastCollectAt: null, resourceCollected: 0 },
      },
    },
  });

  const now = 50_000;
  const result = startBuildUpgrade(player, 'goldMine', now);

  assert.equal(result.ok, true);
  assert.equal(player.game.inventory.gold, 680);
  assert.equal(player.game.inventory.crystals, 78);
  assert.equal(player.game.inventory.ironOre, 90);
  assert.equal(player.game.builds.goldMine.upgradeStartedAt, now);
});

test('finished level-one upgrade uses target level duration and settles once', () => {
  const startedAt = 10_000;
  const player = session({
    game: {
      builds: {
        goldMine: { currentLvl: 1, upgradeStartedAt: startedAt, lastCollectAt: null, resourceCollected: 0 },
      },
    },
  });

  // goldMine level 2 is configured as 0.25 hours = 900000 ms.
  assert.equal(prepareBuilds(player, startedAt + 899_999), true);
  assert.equal(player.game.builds.goldMine.currentLvl, 1);
  assert.equal(prepareBuilds(player, startedAt + 900_000), true);
  assert.equal(player.game.builds.goldMine.currentLvl, 2);
  assert.equal(player.game.builds.goldMine.upgradeStartedAt, null);
  assert.equal(prepareBuilds(player, startedAt + 1_800_000), false);
  assert.equal(player.game.builds.goldMine.currentLvl, 2);
});

test('trainee area collection awards experience and clears stored production', () => {
  const player = session({
    game: {
      builds: {
        traineeArea: { currentLvl: 1, upgradeStartedAt: null, lastCollectAt: null, resourceCollected: 321 },
      },
    },
  });

  const result = collectBuildResources(player, 'traineeArea', 123_456);

  assert.equal(result.ok, true);
  assert.equal(result.resourceType, 'experience');
  assert.equal(result.amount, 321);
  assert.equal(player.game.stats.currentExp, 321);
  assert.equal(player.game.builds.traineeArea.resourceCollected, 0);
  assert.equal(player.game.builds.traineeArea.lastCollectAt, 123_456);
});

test('palace type change requires ownership and rename consumes one card', () => {
  const player = session({
    game: {
      builds: {
        palace: {
          currentLvl: 5,
          upgradeStartedAt: null,
          lastCollectAt: null,
          type: 'common',
          availableTypes: ['common', 'royal'],
          canChangeName: true,
        },
      },
    },
  });

  const denied = changeBuildType(player, 'palace', 'elven', 1_000);
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, 'type_not_owned');

  const changed = changeBuildType(player, 'palace', 'royal', 1_000);
  assert.equal(changed.ok, true);
  assert.equal(player.game.builds.palace.type, 'royal');

  const renamed = renameBuild(player, 'palace', '  Лунный   дворец  ', 1_000);
  assert.equal(renamed.ok, true);
  assert.equal(player.game.builds.palace.customName, 'Лунный дворец');
  assert.equal(player.game.builds.palace.canChangeName, false);
});
