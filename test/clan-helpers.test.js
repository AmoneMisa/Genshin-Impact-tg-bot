import test from 'node:test';
import assert from 'node:assert/strict';
import addClanXp from '../functions/game/clans/addClanXp.js';
import getBuildingBonus from '../functions/game/clans/getBuildingBonus.js';
import getInvestigationBonus from '../functions/game/clans/getInvestigationBonus.js';
import calcReputationPoints from '../functions/game/clans/calcReputationPoints.js';
import clanBuildings from '../dictionaries/clanBuildings.js';

function makeClan(overrides = {}) {
  return {
    level: 1,
    xp: 0,
    buildings: {},
    members: [],
    ...overrides,
  };
}

test('getBuildingBonus returns 0 for an unbuilt/unknown building', () => {
  const clan = makeClan();
  assert.equal(getBuildingBonus(clan, 'mainHall'), 0);
  assert.equal(getBuildingBonus(clan, 'notARealBuilding'), 0);
});

test('getBuildingBonus scales linearly with level using the dictionary rate', () => {
  const mainHall = clanBuildings.find(b => b.key === 'mainHall');
  const clan = makeClan({ buildings: { mainHall: { level: 3 } } });
  assert.equal(getBuildingBonus(clan, 'mainHall'), 3 * mainHall.effectPerLevel);
});

test('addClanXp applies the mainHall xp bonus and reports level-ups only when the level actually changes', () => {
  const clan = makeClan({ buildings: { mainHall: { level: 2 } } }); // +10% xp
  const mainHall = clanBuildings.find(b => b.key === 'mainHall');

  const first = addClanXp(clan, 500);
  assert.equal(clan.xp, Math.floor(500 * (1 + 2 * mainHall.effectPerLevel)));
  assert.equal(first.leveledUp, false); // still under 1000 xp for level 2

  const second = addClanXp(clan, 500);
  assert.equal(second.leveledUp, true);
  assert.equal(second.level, clan.level);
});

test('addClanXp never subtracts xp for a negative amount', () => {
  const clan = makeClan();
  addClanXp(clan, -1000);
  assert.equal(clan.xp, 0);
  assert.equal(clan.level, 1);
});

test('getInvestigationBonus is false until the key is in clan.investigations.completed', () => {
  const clan = makeClan();
  assert.equal(getInvestigationBonus(clan, 'swiftStrikes'), false);

  clan.investigations = { completed: ['swiftStrikes'] };
  assert.equal(getInvestigationBonus(clan, 'swiftStrikes'), true);
  assert.equal(getInvestigationBonus(clan, 'warTactics'), false);
});

test('calcReputationPoints grows with building level, member count, clan level and average upgrades', () => {
  const bare = makeClan({ level: 1, buildings: {}, members: [] });
  const grown = makeClan({
    level: 5,
    buildings: { mainHall: { level: 4 } },
    members: [
      { userId: 1, upgrades: { power: 2, critical: 1 } },
      { userId: 2, upgrades: { power: 1 } },
    ],
  });

  const barePoints = calcReputationPoints(bare);
  const grownPoints = calcReputationPoints(grown);

  assert.ok(Number.isInteger(barePoints));
  assert.ok(grownPoints > barePoints);
});

test('calcReputationPoints is deterministic for the same input', () => {
  const clan = makeClan({
    level: 3,
    buildings: { mainHall: { level: 2 } },
    members: [{ userId: 1, upgrades: { power: 1 } }],
  });
  assert.equal(calcReputationPoints(clan), calcReputationPoints(clan));
});
