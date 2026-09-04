import test from 'node:test';
import assert from 'node:assert/strict';
import {
  answerClanQuiz,
  contributeToClan,
  normalizeClanName,
  parseClanAmount,
} from '../miniapp/clan.js';
import {
  buyClanShopItem,
  summonClanBossForMiniApp,
  upgradeClanBuilding,
  upgradeClanMember,
} from '../miniapp/clanActivities.js';

function makeClan() {
  return {
    level: 1,
    xp: 0,
    owner: 1,
    buildings: {},
    warehouse: { gold: 10_000, crystals: 20, ironOre: 100 },
    members: [{ userId: 1, role: 'owner', contribution: 0, upgrades: {}, lastShopAt: 0 }],
    quiz: {
      lastResetAt: 1,
      questionIndex: 0,
      participants: {},
    },
  };
}

function makePlayer() {
  return {
    userId: 1,
    game: {
      inventory: {
        gold: 10_000,
        crystals: 20,
        ironOre: 10,
        potions: { items: [] },
      },
    },
  };
}

test('clan names are normalized and bounded', () => {
  assert.equal(normalizeClanName('  Tea   House  '), 'Tea House');
  assert.equal(normalizeClanName(''), null);
  assert.equal(normalizeClanName('x'.repeat(41)), null);
});

test('clan contribution parser rejects fractional and unsafe values', () => {
  assert.equal(parseClanAmount('100'), 100);
  assert.equal(parseClanAmount('-1'), null);
  assert.equal(parseClanAmount('1.5'), null);
  assert.equal(parseClanAmount('10gold'), null);
  assert.equal(parseClanAmount(Number.MAX_SAFE_INTEGER + 1), null);
});

test('clan contribution moves the exact resource and credits contribution', () => {
  const clan = makeClan();
  const player = makePlayer();
  const result = contributeToClan(clan, player, 1, 'gold', 250);

  assert.equal(result.ok, true);
  assert.equal(player.game.inventory.gold, 9_750);
  assert.equal(clan.warehouse.gold, 10_250);
  assert.equal(clan.members[0].contribution, 250);
  assert.equal(clan.xp, 25);
});

test('clan contribution rejects insufficient balance without mutation', () => {
  const clan = makeClan();
  const player = makePlayer();
  const beforeClan = structuredClone(clan);
  const beforePlayer = structuredClone(player);
  const result = contributeToClan(clan, player, 1, 'crystals', 21);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'not_enough_resource');
  assert.deepEqual(clan, beforeClan);
  assert.deepEqual(player, beforePlayer);
});

test('correct clan quiz answer keeps legacy gold xp and contribution reward', () => {
  const clan = makeClan();
  const player = makePlayer();
  const result = answerClanQuiz(clan, player, 1, 1);

  assert.equal(result.ok, true);
  assert.equal(result.correct, true);
  assert.equal(player.game.inventory.gold, 10_100);
  assert.equal(clan.members[0].contribution, 10);
  assert.equal(clan.xp, 50);
  assert.equal(clan.quiz.participants['1'].correct, true);
});

test('clan quiz cannot be rewarded twice on the same reset', () => {
  const clan = makeClan();
  const player = makePlayer();
  answerClanQuiz(clan, player, 1, 1);
  const gold = player.game.inventory.gold;
  const second = answerClanQuiz(clan, player, 1, 1);

  assert.equal(second.ok, false);
  assert.equal(second.reason, 'already_answered');
  assert.equal(player.game.inventory.gold, gold);
});

test('clan shop charges warehouse and delivers one potion with weekly cooldown', () => {
  const clan = makeClan();
  const player = makePlayer();
  const bought = buyClanShopItem(clan, player, 1, 'hpMedium', { now: 1_000 });

  assert.equal(bought.ok, true);
  assert.equal(clan.warehouse.gold, 6_000);
  assert.equal(clan.members[0].lastShopAt, 1_000);
  assert.equal(player.game.inventory.potions.items.length, 1);
  assert.equal(player.game.inventory.potions.items[0].count, 1);

  const second = buyClanShopItem(clan, player, 1, 'hpMedium', { now: 2_000 });
  assert.equal(second.ok, false);
  assert.equal(second.reason, 'shop_cooldown');
  assert.equal(player.game.inventory.potions.items[0].count, 1);
});

test('personal clan upgrade charges player gold and increments only requested track', () => {
  const clan = makeClan();
  const player = makePlayer();
  const result = upgradeClanMember(clan, player, 1, 'power');

  assert.equal(result.ok, true);
  assert.equal(result.cost, 500);
  assert.equal(player.game.inventory.gold, 9_500);
  assert.equal(clan.members[0].upgrades.power, 1);
  assert.equal(clan.members[0].upgrades.critical, undefined);
});

test('clan building upgrade is owner-only and charges the shared warehouse exactly', () => {
  const clan = makeClan();
  clan.members.push({ userId: 2, role: 'member', contribution: 0 });

  const denied = upgradeClanBuilding(clan, 2, 'mainHall');
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, 'owner_only');

  const result = upgradeClanBuilding(clan, 1, 'mainHall');
  assert.equal(result.ok, true);
  assert.equal(clan.buildings.mainHall.level, 1);
  assert.equal(clan.warehouse.gold, 8_000);
  assert.equal(clan.warehouse.crystals, 15);
});

test('clan boss summon is single-instance per clan', () => {
  const clan = makeClan();
  const first = summonClanBossForMiniApp(clan, 1);
  const second = summonClanBossForMiniApp(clan, 1);

  assert.equal(first.ok, true);
  assert.equal(Boolean(clan.boss?.name), true);
  assert.equal(second.ok, false);
  assert.equal(second.reason, 'boss_already_summoned');
});
