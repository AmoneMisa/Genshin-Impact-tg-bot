import test from 'node:test';
import assert from 'node:assert/strict';
import buildsTemplate from '../template/buildsTemplate.js';
import getBuildFromTemplate from '../functions/game/builds/getBuildFromTemplate.js';
import shopTemplate from '../template/shopTemplate.js';

test('academy is a real, playable SP-producing building', () => {
  const academy = buildsTemplate.academy;
  assert.equal(academy.available, true);
  assert.ok(academy.startLvl >= 1);
  assert.equal(academy.resourcesType, 'sp');
  assert.ok(Array.isArray(academy.upgradeTime) && academy.upgradeTime.length > 0);
  assert.ok(Array.isArray(academy.upgradeCosts) && academy.upgradeCosts.length > 0);
});

test('a fresh player is seeded with the academy building alongside the other producers', () => {
  const builds = getBuildFromTemplate();
  assert.ok(builds.academy);
  assert.equal(builds.academy.currentLvl, buildsTemplate.academy.startLvl);
  assert.equal(builds.academy.resourceCollected, 0);
  assert.ok(builds.goldMine && builds.crystalLake && builds.palace && builds.traineeArea && builds.ironDeposit);
});

test('palace type costs agree between the shop (what a player actually pays) and the builds template', () => {
  const elvenShopItem = shopTemplate.find(item => item.command === 'palaceElven');
  const royalShopItem = shopTemplate.find(item => item.command === 'palaceRoyal');

  assert.equal(elvenShopItem.cost, buildsTemplate.palace.availableTypes.elven.cost);
  assert.equal(royalShopItem.cost, buildsTemplate.palace.availableTypes.royal.cost);
});
