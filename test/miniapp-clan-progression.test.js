import test from 'node:test';
import assert from 'node:assert/strict';
import {
  startClanInvestigation,
  fundClanInvestigation,
  completeClanInvestigation,
  cancelClanInvestigation,
  claimClanTask,
  claimClanTasksBonus,
  markTaskProgress,
  getClanProgressionState,
} from '../miniapp/clanProgression.js';
import clanInvestigations from '../dictionaries/clanInvestigations.js';
import clanTasks, { CLAN_TASKS_BONUS_XP } from '../dictionaries/clanTasks.js';

function makeClan() {
  return {
    level: 1,
    xp: 0,
    owner: 1,
    buildings: {},
    warehouse: { gold: 100_000, crystals: 200, ironOre: 500 },
    members: [
      { userId: 1, role: 'owner', contribution: 0, upgrades: {} },
      { userId: 2, role: 'member', contribution: 0, upgrades: {} },
    ],
    investigations: { active: null, completed: [] },
    tasks: { lastResetAt: Date.now(), progress: {}, claimed: {} },
  };
}

function makePlayer() {
  return { userId: 1, game: { inventory: { gold: 1_000 } } };
}

test('investigation: start requires membership and blocks a second active project', () => {
  const clan = makeClan();
  const key = clanInvestigations[0].key;

  const denied = startClanInvestigation(clan, 99, key);
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, 'not_in_clan');

  const started = startClanInvestigation(clan, 1, key);
  assert.equal(started.ok, true);
  assert.equal(clan.investigations.active.key, key);

  const second = startClanInvestigation(clan, 1, clanInvestigations[1].key);
  assert.equal(second.ok, false);
  assert.equal(second.reason, 'investigation_already_active');
});

test('investigation: funding pulls only what the warehouse has toward the remaining cost', () => {
  const clan = makeClan();
  const def = clanInvestigations[0];
  clan.warehouse = { gold: 1000, crystals: 5, ironOre: 0 };
  startClanInvestigation(clan, 1, def.key);

  const result = fundClanInvestigation(clan, 1);
  assert.equal(result.ok, true);
  assert.equal(clan.investigations.active.progress.gold, 1000);
  assert.equal(clan.investigations.active.progress.crystals, 5);
  assert.equal(clan.investigations.active.progress.ironOre, 0);
  assert.equal(clan.warehouse.gold, 0);
  assert.equal(clan.warehouse.crystals, 0);

  const dry = fundClanInvestigation(clan, 1);
  assert.equal(dry.ok, false);
  assert.equal(dry.reason, 'investigation_no_resources');
});

test('investigation: completion requires full funding AND elapsed duration, then unlocks the bonus', () => {
  const clan = makeClan();
  const def = clanInvestigations[0];
  startClanInvestigation(clan, 1, def.key);
  clan.investigations.active.progress = { ...def.cost };

  const tooSoon = completeClanInvestigation(clan, 1);
  assert.equal(tooSoon.ok, false);
  assert.equal(tooSoon.reason, 'investigation_not_ready');

  clan.investigations.active.startedAt = Date.now() - def.durationMs - 1000;
  const result = completeClanInvestigation(clan, 1);
  assert.equal(result.ok, true);
  assert.equal(clan.investigations.active, null);
  assert.deepEqual(clan.investigations.completed, [def.key]);
});

test('investigation: cancelling refunds progress to the warehouse and requires manage rights', () => {
  const clan = makeClan();
  const def = clanInvestigations[0];
  startClanInvestigation(clan, 1, def.key);
  clan.investigations.active.progress = { gold: 500, crystals: 3, ironOre: 0 };
  clan.warehouse = { gold: 0, crystals: 0, ironOre: 0 };

  const denied = cancelClanInvestigation(clan, 1, false);
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, 'owner_only');

  const result = cancelClanInvestigation(clan, 1, true);
  assert.equal(result.ok, true);
  assert.equal(clan.investigations.active, null);
  assert.equal(clan.warehouse.gold, 500);
  assert.equal(clan.warehouse.crystals, 3);
});

test('tasks: claiming requires the task to be marked done and pays out exactly once', () => {
  const clan = makeClan();
  const player = makePlayer();
  const task = clanTasks[0];

  const notDone = claimClanTask(clan, player, 1, task.key);
  assert.equal(notDone.ok, false);
  assert.equal(notDone.reason, 'task_not_done');

  markTaskProgress(clan, 1, task.key);
  const claimed = claimClanTask(clan, player, 1, task.key);
  assert.equal(claimed.ok, true);
  assert.equal(player.game.inventory.gold, 1_000 + task.goldReward);
  assert.equal(clan.members[0].contribution, task.contributionReward);

  const again = claimClanTask(clan, player, 1, task.key);
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'task_already_claimed');
});

test('tasks: the daily bonus needs every task claimed first and pays clan XP once', () => {
  const clan = makeClan();
  const player = makePlayer();

  const early = claimClanTasksBonus(clan, 1);
  assert.equal(early.ok, false);
  assert.equal(early.reason, 'tasks_not_all_claimed');

  for (const task of clanTasks) {
    markTaskProgress(clan, 1, task.key);
    claimClanTask(clan, player, 1, task.key);
  }

  const bonus = claimClanTasksBonus(clan, 1);
  assert.equal(bonus.ok, true);
  assert.equal(bonus.bonusXp, CLAN_TASKS_BONUS_XP);
  assert.equal(clan.xp, CLAN_TASKS_BONUS_XP);

  const twice = claimClanTasksBonus(clan, 1);
  assert.equal(twice.ok, false);
  assert.equal(twice.reason, 'bonus_already_claimed');
});

test('progression state reports startable investigations and per-member task status', () => {
  const clan = makeClan();
  markTaskProgress(clan, 1, clanTasks[0].key);

  const state = getClanProgressionState(clan, 1);
  assert.equal(state.investigations.active, null);
  assert.equal(state.investigations.startable.length, clanInvestigations.length);
  assert.equal(state.tasks.items.find(item => item.key === clanTasks[0].key).done, true);
  assert.equal(state.tasks.items.find(item => item.key === clanTasks[1].key).done, false);
});
