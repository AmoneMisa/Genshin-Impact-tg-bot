import getClan from '../functions/game/clans/getClan.js';
import addClanXp from '../functions/game/clans/addClanXp.js';
import calcReputationPoints from '../functions/game/clans/calcReputationPoints.js';
import getInvestigationBonus from '../functions/game/clans/getInvestigationBonus.js';
import clanInvestigations from '../dictionaries/clanInvestigations.js';
import clanTasks, { CLAN_TASKS_BONUS_XP } from '../dictionaries/clanTasks.js';

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function findMember(clan, userId) {
  return clan?.members?.find(member => String(member.userId) === String(userId)) || null;
}

function normalizeWarehouse(clan) {
  if (!clan.warehouse) clan.warehouse = { gold: 0, crystals: 0, ironOre: 0 };
  return clan.warehouse;
}

function cloneCost(cost = {}) {
  return Object.fromEntries(Object.entries(cost).map(([resource, amount]) => [resource, number(amount)]));
}

// ---- Daily tasks — shared with callbacks/game/clan/clanCallback.js's ensureTaskState ----
export function ensureTaskState(clan) {
  if (!clan.tasks || !clan.tasks.lastResetAt) {
    clan.tasks = { lastResetAt: Date.now(), progress: {}, claimed: {} };
  }
  if (!clan.tasks.progress) clan.tasks.progress = {};
  if (!clan.tasks.claimed) clan.tasks.claimed = {};
}

// Marks a daily task as done today for a member. Caller is responsible for
// clan.save() (clan.tasks is Mixed). Safe to import from clan.js/clanActivities.js/
// clanCompetition.js to instrument the underlying action handlers.
export function markTaskProgress(clan, userId, taskKey) {
  ensureTaskState(clan);
  const key = String(userId);
  if (!clan.tasks.progress[key]) clan.tasks.progress[key] = {};
  clan.tasks.progress[key][taskKey] = true;
}

function tasksState(clan, userId) {
  ensureTaskState(clan);
  const key = String(userId);
  const progress = clan.tasks.progress[key] || {};
  const claimed = clan.tasks.claimed[key] || [];

  const items = clanTasks.map(task => ({
    key: task.key,
    label: task.label,
    goldReward: task.goldReward,
    contributionReward: task.contributionReward,
    done: Boolean(progress[task.key]),
    claimed: claimed.includes(task.key),
  }));

  const allClaimed = clanTasks.every(task => claimed.includes(task.key));
  return {
    items,
    bonusXp: CLAN_TASKS_BONUS_XP,
    bonusAvailable: allClaimed && !claimed.includes('__bonus__'),
    bonusClaimed: claimed.includes('__bonus__'),
  };
}

export function claimClanTask(clan, playerSession, userId, taskKey) {
  if (!clan || !findMember(clan, userId)) return { ok: false, reason: 'not_in_clan' };
  const task = clanTasks.find(entry => entry.key === taskKey);
  if (!task) return { ok: false, reason: 'unknown_task' };

  ensureTaskState(clan);
  const key = String(userId);
  const progress = clan.tasks.progress[key] || {};
  if (!progress[task.key]) return { ok: false, reason: 'task_not_done' };
  if (!clan.tasks.claimed[key]) clan.tasks.claimed[key] = [];
  if (clan.tasks.claimed[key].includes(task.key)) return { ok: false, reason: 'task_already_claimed' };

  const inventory = playerSession?.game?.inventory;
  if (!inventory) return { ok: false, reason: 'player_not_found' };
  inventory.gold = Math.max(0, number(inventory.gold)) + task.goldReward;

  const member = findMember(clan, userId);
  member.contribution = Math.max(0, number(member.contribution)) + task.contributionReward;
  clan.tasks.claimed[key].push(task.key);

  return {
    ok: true,
    task: task.key,
    goldReward: task.goldReward,
    contributionReward: task.contributionReward,
    message: `Награда получена: +${task.goldReward} золота, +${task.contributionReward} к вкладу.`,
  };
}

export function claimClanTasksBonus(clan, userId) {
  if (!clan || !findMember(clan, userId)) return { ok: false, reason: 'not_in_clan' };
  ensureTaskState(clan);
  const key = String(userId);
  const claimed = clan.tasks.claimed[key] || [];
  const allClaimed = clanTasks.every(task => claimed.includes(task.key));
  if (!allClaimed) return { ok: false, reason: 'tasks_not_all_claimed' };
  if (claimed.includes('__bonus__')) return { ok: false, reason: 'bonus_already_claimed' };

  const xp = addClanXp(clan, CLAN_TASKS_BONUS_XP);
  clan.tasks.claimed[key].push('__bonus__');
  return {
    ok: true,
    bonusXp: CLAN_TASKS_BONUS_XP,
    leveledUp: xp.leveledUp,
    level: xp.level,
    message: `Бонус получен: +${CLAN_TASKS_BONUS_XP} XP клана.`,
  };
}

// ---- Investigations ----
function investigationsState(clan) {
  if (!clan.investigations) clan.investigations = { active: null, completed: [] };
  const { active, completed = [] } = clan.investigations;

  const completedDefs = completed
    .map(key => clanInvestigations.find(def => def.key === key))
    .filter(Boolean)
    .map(def => ({ key: def.key, label: def.label, effectLabel: def.effectLabel }));

  let activeState = null;
  if (active) {
    const def = clanInvestigations.find(entry => entry.key === active.key);
    if (def) {
      const progress = active.progress || {};
      const fullyFunded = Object.entries(def.cost).every(([resource, need]) => number(progress[resource]) >= need);
      const durationDone = Date.now() - number(active.startedAt) >= def.durationMs;
      activeState = {
        key: def.key,
        label: def.label,
        description: def.description,
        effectLabel: def.effectLabel,
        cost: cloneCost(def.cost),
        progress: cloneCost(progress),
        fullyFunded,
        durationDone,
        remainingMs: Math.max(0, def.durationMs - (Date.now() - number(active.startedAt))),
        readyToComplete: fullyFunded && durationDone,
      };
    }
  }

  const startable = clanInvestigations
    .filter(def => !completed.includes(def.key))
    .map(def => ({ key: def.key, label: def.label, description: def.description, effectLabel: def.effectLabel, cost: cloneCost(def.cost) }));

  return { completed: completedDefs, active: activeState, startable: active ? [] : startable };
}

export function getClanProgressionState(clan, userId) {
  if (!clan) return null;
  return {
    investigations: investigationsState(clan),
    tasks: tasksState(clan, userId),
  };
}

export function startClanInvestigation(clan, userId, key) {
  if (!clan || !findMember(clan, userId)) return { ok: false, reason: 'not_in_clan' };
  const def = clanInvestigations.find(entry => entry.key === key);
  if (!def) return { ok: false, reason: 'unknown_investigation' };

  if (!clan.investigations) clan.investigations = { active: null, completed: [] };
  if (clan.investigations.active) return { ok: false, reason: 'investigation_already_active' };
  if ((clan.investigations.completed || []).includes(key)) return { ok: false, reason: 'investigation_already_completed' };

  clan.investigations.active = { key, progress: { gold: 0, crystals: 0, ironOre: 0 }, startedAt: Date.now() };
  return { ok: true, key, message: `Начато исследование: ${def.label}.` };
}

export function fundClanInvestigation(clan, userId) {
  if (!clan || !findMember(clan, userId)) return { ok: false, reason: 'not_in_clan' };
  const active = clan.investigations?.active;
  if (!active) return { ok: false, reason: 'investigation_not_active' };
  const def = clanInvestigations.find(entry => entry.key === active.key);
  if (!def) return { ok: false, reason: 'unknown_investigation' };

  const warehouse = normalizeWarehouse(clan);
  if (!active.progress) active.progress = { gold: 0, crystals: 0, ironOre: 0 };

  const moved = {};
  for (const [resource, need] of Object.entries(def.cost)) {
    const remaining = Math.max(0, need - number(active.progress[resource]));
    const available = Math.max(0, number(warehouse[resource]));
    const take = Math.min(remaining, available);
    if (take > 0) {
      warehouse[resource] = available - take;
      active.progress[resource] = number(active.progress[resource]) + take;
      moved[resource] = take;
    }
  }

  if (!Object.keys(moved).length) return { ok: false, reason: 'investigation_no_resources' };
  return { ok: true, moved, message: 'Из хранилища вложены ресурсы в исследование.' };
}

export function completeClanInvestigation(clan, userId) {
  if (!clan || !findMember(clan, userId)) return { ok: false, reason: 'not_in_clan' };
  const active = clan.investigations?.active;
  if (!active) return { ok: false, reason: 'investigation_not_active' };
  const def = clanInvestigations.find(entry => entry.key === active.key);
  if (!def) return { ok: false, reason: 'unknown_investigation' };

  const progress = active.progress || {};
  const fullyFunded = Object.entries(def.cost).every(([resource, need]) => number(progress[resource]) >= need);
  if (!fullyFunded) return { ok: false, reason: 'investigation_not_funded' };
  if (Date.now() - number(active.startedAt) < def.durationMs) {
    return { ok: false, reason: 'investigation_not_ready', remainingMs: def.durationMs - (Date.now() - number(active.startedAt)) };
  }

  if (!clan.investigations.completed) clan.investigations.completed = [];
  clan.investigations.completed.push(def.key);
  clan.investigations.active = null;
  clan.reputation = calcReputationPoints(clan);

  return { ok: true, key: def.key, effectLabel: def.effectLabel, message: `Исследование завершено: ${def.label}.` };
}

export function cancelClanInvestigation(clan, userId, canManage) {
  if (!clan || !findMember(clan, userId)) return { ok: false, reason: 'not_in_clan' };
  if (!canManage) return { ok: false, reason: 'owner_only' };
  const active = clan.investigations?.active;
  if (!active) return { ok: false, reason: 'investigation_not_active' };

  const warehouse = normalizeWarehouse(clan);
  for (const [resource, amount] of Object.entries(active.progress || {})) {
    warehouse[resource] = Math.max(0, number(warehouse[resource])) + number(amount);
  }
  clan.investigations.active = null;
  return { ok: true, message: 'Исследование отменено, ресурсы возвращены в хранилище.' };
}

export { getInvestigationBonus };

export async function prepareClanProgressionAction(userId, playerSession, action, body = {}) {
  const clan = await getClan(userId);
  if (!clan) return { clan: null, result: { ok: false, reason: 'not_in_clan' }, savePlayer: false };

  const canManage = String(clan.owner) === String(userId) || findMember(clan, userId)?.role === 'officer';

  if (action === 'investigation_start') return { clan, result: startClanInvestigation(clan, userId, body.key), savePlayer: false };
  if (action === 'investigation_fund') return { clan, result: fundClanInvestigation(clan, userId), savePlayer: false };
  if (action === 'investigation_complete') return { clan, result: completeClanInvestigation(clan, userId), savePlayer: false };
  if (action === 'investigation_cancel') return { clan, result: cancelClanInvestigation(clan, userId, canManage), savePlayer: false };
  if (action === 'task_claim') return { clan, result: claimClanTask(clan, playerSession, userId, body.taskKey), savePlayer: true };
  if (action === 'task_claim_bonus') return { clan, result: claimClanTasksBonus(clan, userId), savePlayer: false };

  return { clan, result: { ok: false, reason: 'unknown_clan_progression' }, savePlayer: false };
}
