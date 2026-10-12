import {migrateCurrencyWallet} from '../functions/game/player/currencyMigration.js';
import { gainExp, readVitality } from '../functions/game/player/vitality.js';
import { buildStorageCap } from '../functions/game/builds/buildYield.js';
import { forgeBonuses, FORGE_MAX_LEVEL } from '../functions/game/builds/forgeBonuses.js';
import { PALACE_MAX_LEVEL, inventoryCapacity, warehouseCapacity, inventoryUsage } from '../functions/game/builds/palaceCapacity.js';
import buildsTemplate from '../template/buildsTemplate.js';
import { bountyQuality } from '../functions/game/academy/academy.js';
import getBuildFromTemplate from '../functions/game/builds/getBuildFromTemplate.js';
import calculateUpgradeCosts from '../functions/game/builds/calculateUpgradeCosts.js';
import calculateIncreaseUpgradeTime from '../functions/game/builds/calculateUpgradeTime.js';
import calculateIncreaseInResourceExtraction from '../functions/game/builds/calculateIncreaseInResourceExtraction.js';
import calculateIncreaseGuardedResources from '../functions/game/builds/calculateIncreaseGuardedResources.js';
import setLevel from '../functions/game/player/setLevel.js';

const DEFAULT_MAX_LEVEL = 30;
const BUILD_RESOURCES = ['gold', 'moonDew', 'ironOre'];
// Speeding a build up: adena per started hour for the early levels, Coins of Luck from this level on.
const SPEEDUP_ADENA_PER_HOUR_PER_LEVEL = 1500;
const SPEEDUP_COL_FROM_LEVEL = 11;
const FREE_SPEEDUP_WINDOW_MS = 15 * 60 * 1000;
// Computed per call: the template can be replaced from Mongo after this module loads.
const activeBuildNames = () => Object.entries(buildsTemplate)
  .filter(([, template]) => template?.available && Number(template.startLvl) > 0)
  .map(([name]) => name);

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getGame(session) {
  if (!session?.game) throw new Error('Player game state is missing');
  return session.game;
}

function getInventory(session) {
  const game = getGame(session);
  if (!game.inventory) game.inventory = {};
  migrateCurrencyWallet(game.inventory);
  for (const resource of ['gold', 'ironOre', 'moonDew', 'luckCoins']) {
    game.inventory[resource] = asNumber(game.inventory[resource]);
  }
  return game.inventory;
}

/** What it costs to finish an upgrade to `nextLevel` now: {currency, amount}; the last minutes are free. */
export function speedupPrice(nextLevel, remainingMs) {
  const level = Math.max(2, asNumber(nextLevel, 2));
  const currency = level >= SPEEDUP_COL_FROM_LEVEL ? 'luckCoins' : 'gold';
  if (remainingMs <= FREE_SPEEDUP_WINDOW_MS) return { currency, amount: 0 };
  const hours = Math.ceil(remainingMs / 3_600_000);
  return { currency, amount: currency === 'gold' ? hours * SPEEDUP_ADENA_PER_HOUR_PER_LEVEL * level : hours * Math.ceil(level / 2) };
}

function getResourceType(template) {
  // an older stored template still says "crystals": the buildings now make moon dew
  if (template?.resourcesType === 'crystals') return 'moonDew';
  if (template?.resourcesType) return template.resourcesType;
  if (template?.type === 'experience') return 'experience';
  return null;
}

function getMaxLevel(template) {
  return Math.max(1, asNumber(template?.maxLvl, DEFAULT_MAX_LEVEL));
}

// Delegates the beyond-the-template extrapolation to the same
// functions/game/builds/calculateUpgradeTime.js the bot uses, instead of a
// hand-copied formula, so a future balance tweak can't silently desync the
// Mini App's countdown from the bot's.
function getUpgradeDurationHours(buildName, build) {
  const template = buildsTemplate[buildName];
  const nextLevel = asNumber(build?.currentLvl, 1) + 1;
  const upgradeTimes = Array.isArray(template?.upgradeTime) ? template.upgradeTime : [];
  const exact = upgradeTimes.find((entry) => Number(entry.level) === nextLevel);
  if (exact) return Math.max(0, asNumber(exact.time));
  if (!upgradeTimes.length) return 0;

  try {
    return Math.max(0, asNumber(calculateIncreaseUpgradeTime(buildName, nextLevel)));
  } catch (e) {
    return 0;
  }
}

function getRemainingMs(buildName, build, now = Date.now()) {
  if (!build?.upgradeStartedAt) return 0;
  const durationMs = getUpgradeDurationHours(buildName, build) * 60 * 60 * 1000;
  return Math.max(0, asNumber(build.upgradeStartedAt) + durationMs - now);
}

function getUpgradeCost(buildName, currentLevel) {
  const template = buildsTemplate[buildName];
  const nextLevel = asNumber(currentLevel, 1) + 1;
  if (!Array.isArray(template?.upgradeCosts) || !template.upgradeCosts.length) return null;
  const cost = calculateUpgradeCosts(template.upgradeCosts, nextLevel);
  if (!cost) return null;
  return {
    gold: Math.max(0, asNumber(cost.gold)),
    moonDew: Math.max(0, asNumber(cost.moonDew ?? cost.crystals)),
    ironOre: Math.max(0, asNumber(cost.ironOre)),
  };
}

function resourceRequirements(inventory, cost) {
  if (!cost) return [];
  return BUILD_RESOURCES.map((resource) => ({
    resource,
    required: cost[resource],
    current: asNumber(inventory?.[resource]),
    met: asNumber(inventory?.[resource]) >= cost[resource],
  }));
}

function getCharacterValue(game, key) {
  const direct = game?.stats?.[key];
  if (direct !== undefined && direct !== null) return asNumber(direct);
  const classStat = game?.gameClass?.stats?.[key];
  if (classStat !== undefined && classStat !== null) return asNumber(classStat);
  const legacyClassStat = game?.gameClass?.[key];
  if (legacyClassStat !== undefined && legacyClassStat !== null) return asNumber(legacyClassStat);
  return 0;
}

function getUpgradeRequirements(session, buildName, nextLevel) {
  const game = getGame(session);
  const template = buildsTemplate[buildName];
  const requirement = template?.upgradeRequirements?.find((entry) => Number(entry.level) === Number(nextLevel));

  if (!requirement) {
    return { met: true, buildings: [], character: [] };
  }

  const buildings = (requirement.buildRequirements || []).map((item) => {
    const current = asNumber(game.builds?.[item.name]?.currentLvl);
    const required = asNumber(item.level);
    return {
      name: item.name,
      title: buildsTemplate[item.name]?.name || item.name,
      current,
      required,
      met: current >= required,
    };
  });

  const character = (requirement.characterRequirements || []).flatMap((item) =>
    Object.entries(item).map(([key, value]) => {
      const current = getCharacterValue(game, key);
      const required = asNumber(value);
      return { key, current, required, met: current >= required };
    }));

  return {
    met: [...buildings, ...character].every((item) => item.met),
    buildings,
    character,
  };
}

function calculateProductionPerHour(buildName, build) {
  const template = buildsTemplate[buildName];
  const base = asNumber(template?.productionPerHour);
  if (!base) return 0;
  const level = Math.max(1, asNumber(build?.currentLvl, 1));
  if (level === 1) return Math.ceil(base);
  return Math.ceil(base * calculateIncreaseInResourceExtraction(buildName, level));
}

function sanitizeTypes(template, build) {
  if (!template?.availableTypes) return [];
  const owned = new Set(Array.isArray(build?.availableTypes) ? build.availableTypes : []);
  return Object.entries(template.availableTypes).map(([id, type]) => ({
    id,
    name: type.name || id,
    owned: owned.has(id),
    selected: build?.type === id,
    premium: Boolean(type.isPayment),
    bonus: type.bonus?.description || null,
  }));
}

const pct = value => `${Math.round(value * 1000) / 10}%`;

/** What the building's level gives besides production: [{label, value, next}] rows for its window. */
function buildPerks(session, buildName, currentLevel) {
  const nextSession = (patch) => ({ game: { ...session.game, builds: { ...session.game.builds, [buildName]: { ...session.game.builds[buildName], currentLvl: currentLevel + 1, ...patch } } } });
  if (buildName === 'palace') {
    const usage = inventoryUsage(session);
    const next = currentLevel < PALACE_MAX_LEVEL ? nextSession() : null;
    return [
      { label: 'Инвентарь (слотов)', value: `${usage.used} / ${inventoryCapacity(session)}`, next: next ? inventoryCapacity(next) : null },
      { label: 'Личное хранилище (слотов)', value: String(warehouseCapacity(session)), next: next ? warehouseCapacity(next) : null },
    ];
  }
  if (buildName === 'forge') {
    const now = forgeBonuses(session);
    const next = currentLevel < FORGE_MAX_LEVEL ? forgeBonuses(nextSession()) : null;
    const row = (label, key) => ({ label, value: pct(now[key]), next: next ? pct(next[key]) : null });
    return [
      row('Шанс крафта', 'craft'), row('Шанс заточки', 'enchant'), row('Шанс мастерской работы (MW)', 'masterwork'),
      row('Шанс двойного крафта', 'doubleCraft'), row('Кристаллов при кристаллизации', 'crystals'),
      { label: 'Экономия материалов', value: now.saveChance ? `${pct(now.saveChance)} шанс на −${pct(now.saveShare)}` : '—', next: next ? `${pct(next.saveChance)} шанс на −${pct(next.saveShare)}` : null },
    ];
  }
  if (buildName === 'academy') {
    const next = currentLevel < buildsTemplate.academy.maxLvl ? nextSession() : null;
    return [
      { label: 'Качество поручений', value: `${bountyQuality(session)} / 5`, next: next ? `${bountyQuality(next)} / 5` : null },
    ];
  }
  return [];
}

function ensureBuildDefaults(session) {
  const game = getGame(session);
  let changed = false;
  if (!game.builds || typeof game.builds !== 'object' || Array.isArray(game.builds)) {
    game.builds = {};
    changed = true;
  }

  const defaults = getBuildFromTemplate();
  for (const buildName of activeBuildNames()) {
    if (!game.builds[buildName] && defaults[buildName]) {
      game.builds[buildName] = clone(defaults[buildName]);
      changed = true;
    }

    const build = game.builds[buildName];
    const template = buildsTemplate[buildName];
    if (!build) continue;

    if (!Number.isFinite(Number(build.currentLvl))) {
      build.currentLvl = Math.max(1, asNumber(template.startLvl, 1));
      changed = true;
    }

    const resourceType = getResourceType(template);
    if (resourceType && !Number.isFinite(Number(build.resourceCollected))) {
      build.resourceCollected = 0;
      changed = true;
    }

    if (template.availableTypes) {
      if (!Array.isArray(build.availableTypes)) {
        build.availableTypes = Object.entries(template.availableTypes)
          .filter(([, type]) => !type.isPayment)
          .map(([id]) => id);
        changed = true;
      }
      if (!build.type || !template.availableTypes[build.type]) {
        build.type = build.availableTypes[0] || Object.keys(template.availableTypes)[0] || 'common';
        changed = true;
      }
    }
  }

  return changed;
}

function settleFinishedUpgrades(session, now = Date.now()) {
  const game = getGame(session);
  let changed = false;

  for (const buildName of activeBuildNames()) {
    const build = game.builds?.[buildName];
    const template = buildsTemplate[buildName];
    if (!build?.upgradeStartedAt) continue;
    if (getRemainingMs(buildName, build, now) > 0) continue;

    if (asNumber(build.currentLvl) < getMaxLevel(template)) {
      build.currentLvl = asNumber(build.currentLvl, 1) + 1;
    }
    build.upgradeStartedAt = null;
    if ('upgradeTimerId' in build) build.upgradeTimerId = null;
    changed = true;
  }

  return changed;
}

export function prepareBuilds(session, now = Date.now()) {
  const defaultsChanged = ensureBuildDefaults(session);
  const upgradesChanged = settleFinishedUpgrades(session, now);
  getInventory(session);
  return defaultsChanged || upgradesChanged;
}

function buildState(session, buildName, now = Date.now()) {
  const game = getGame(session);
  const inventory = getInventory(session);
  const build = game.builds[buildName];
  const template = buildsTemplate[buildName];
  const currentLevel = Math.max(1, asNumber(build.currentLvl, 1));
  const maxLevel = getMaxLevel(template);
  const nextLevel = Math.min(maxLevel, currentLevel + 1);
  const upgrading = Boolean(build.upgradeStartedAt);
  const remainingMs = upgrading ? getRemainingMs(buildName, build, now) : 0;
  const cost = currentLevel < maxLevel ? getUpgradeCost(buildName, currentLevel) : null;
  const requirements = currentLevel < maxLevel
    ? getUpgradeRequirements(session, buildName, currentLevel + 1)
    : { met: false, buildings: [], character: [] };
  const affordability = resourceRequirements(inventory, cost);
  const canAfford = affordability.every((item) => item.met);
  const resourceType = getResourceType(template);
  const storageCap = buildStorageCap(session, resourceType);
  const resourceCollected = Math.min(storageCap, Math.max(0, asNumber(build.resourceCollected)));
  const speedup = upgrading ? speedupPrice(currentLevel + 1, remainingMs) : { currency: 'gold', amount: 0 };
  const speedupCost = speedup.amount;

  let blockedReason = null;
  if (currentLevel >= maxLevel) blockedReason = 'max_level';
  else if (upgrading) blockedReason = 'already_upgrading';
  else if (!requirements.met) blockedReason = 'requirements';
  else if (!cost) blockedReason = 'upgrade_unavailable';
  else if (!canAfford) blockedReason = 'resources';

  return {
    id: buildName,
    name: build.customName || template.name || buildName,
    defaultName: template.name || buildName,
    customName: build.customName || null,
    description: template.description || '',
    currentLevel,
    maxLevel,
    nextLevel,
    upgrading,
    remainingMs,
    upgradeStartedAt: upgrading ? asNumber(build.upgradeStartedAt) : null,
    upgradeCost: cost,
    affordability,
    requirements,
    canUpgrade: !blockedReason,
    blockedReason,
    canSpeedup: upgrading && asNumber(inventory[speedup.currency]) >= speedupCost,
    speedupCost,
    speedupCurrency: speedup.currency,
    resourceType,
    resourceCollected,
    storageCap: Number.isFinite(storageCap) ? storageCap : null,
    productionPerHour: resourceType ? calculateProductionPerHour(buildName, build) : 0,
    nextProductionPerHour: resourceType && currentLevel < maxLevel ? calculateProductionPerHour(buildName, { ...build, currentLvl: nextLevel }) : null,
    maxWorkHoursWithoutCollection: asNumber(template.maxWorkHoursWithoutCollection),
    canCollect: Boolean(resourceType) && !upgrading && resourceCollected > 0,
    currentType: build.type || null,
    availableTypes: sanitizeTypes(template, build),
    canRename: Boolean(game.builds?.palace?.canChangeName),
    treasury: template.bonusEffect ? calculateIncreaseGuardedResources(template, currentLevel) : null,
    perks: buildPerks(session, buildName, currentLevel),
  };
}

export function getBuildsState(session, now = Date.now()) {
  prepareBuilds(session, now);
  const inventory = getInventory(session);
  return {
    resources: {
      gold: asNumber(inventory.gold),
      moonDew: asNumber(inventory.moonDew),
      luckCoins: asNumber(inventory.luckCoins),
      ironOre: asNumber(inventory.ironOre),
    },
    playerLevel: asNumber(session?.game?.stats?.lvl, 1),
    buildings: activeBuildNames()
      .filter((name) => session.game.builds?.[name])
      .map((name) => buildState(session, name, now)),
  };
}

function findBuild(session, buildName) {
  prepareBuilds(session);
  if (!activeBuildNames().includes(buildName)) return null;
  const build = session.game.builds?.[buildName];
  if (!build || !buildsTemplate[buildName]) return null;
  return build;
}

export function startBuildUpgrade(session, buildName, now = Date.now()) {
  const build = findBuild(session, buildName);
  if (!build) return { ok: false, reason: 'unknown_build', builds: getBuildsState(session, now) };

  prepareBuilds(session, now);
  const state = buildState(session, buildName, now);
  if (!state.canUpgrade) {
    return { ok: false, reason: state.blockedReason, build: state, builds: getBuildsState(session, now) };
  }

  const inventory = getInventory(session);
  for (const resource of BUILD_RESOURCES) {
    inventory[resource] = asNumber(inventory[resource]) - asNumber(state.upgradeCost?.[resource]);
  }
  build.upgradeStartedAt = now;

  return {
    ok: true,
    action: 'upgrade',
    build: buildState(session, buildName, now),
    builds: getBuildsState(session, now),
  };
}

export function speedupBuildUpgrade(session, buildName, now = Date.now()) {
  const build = findBuild(session, buildName);
  if (!build) return { ok: false, reason: 'unknown_build', builds: getBuildsState(session, now) };

  prepareBuilds(session, now);
  if (!build.upgradeStartedAt) {
    return { ok: false, reason: 'not_upgrading', build: buildState(session, buildName, now), builds: getBuildsState(session, now) };
  }

  const state = buildState(session, buildName, now);
  const inventory = getInventory(session);
  if (asNumber(inventory[state.speedupCurrency]) < state.speedupCost) {
    return { ok: false, reason: 'resources', build: state, builds: getBuildsState(session, now) };
  }

  inventory[state.speedupCurrency] = asNumber(inventory[state.speedupCurrency]) - state.speedupCost;
  build.currentLvl = Math.min(getMaxLevel(buildsTemplate[buildName]), asNumber(build.currentLvl, 1) + 1);
  build.upgradeStartedAt = null;
  if ('upgradeTimerId' in build) build.upgradeTimerId = null;

  return {
    ok: true,
    action: 'speedup',
    spent: { currency: state.speedupCurrency, amount: state.speedupCost },
    build: buildState(session, buildName, now),
    builds: getBuildsState(session, now),
  };
}

export function collectBuildResources(session, buildName, now = Date.now()) {
  const build = findBuild(session, buildName);
  if (!build) return { ok: false, reason: 'unknown_build', builds: getBuildsState(session, now) };

  prepareBuilds(session, now);
  const template = buildsTemplate[buildName];
  const resourceType = getResourceType(template);
  if (!resourceType) {
    return { ok: false, reason: 'no_production', build: buildState(session, buildName, now), builds: getBuildsState(session, now) };
  }
  if (build.upgradeStartedAt) {
    return { ok: false, reason: 'upgrading', build: buildState(session, buildName, now), builds: getBuildsState(session, now) };
  }

  // experience and skill points are capped like the offline farm; what does not fit is lost
  const amount = Math.max(0, Math.min(buildStorageCap(session, resourceType), Math.ceil(asNumber(build.resourceCollected))));
  if (!amount) {
    return { ok: false, reason: 'nothing_to_collect', build: buildState(session, buildName, now), builds: getBuildsState(session, now) };
  }
  // the experience is paid with Vitality: an empty bar gives nothing
  if (resourceType === 'experience' && readVitality(session, now).points < 1) {
    return { ok: false, reason: 'no_vitality', build: buildState(session, buildName, now), builds: getBuildsState(session, now) };
  }

  let gained = amount;
  if (resourceType === 'experience') {
    gained = gainExp(session, amount, { now }).gained;
    setLevel(session);
  } else {
    const inventory = getInventory(session);
    inventory[resourceType] = asNumber(inventory[resourceType]) + amount;
  }

  build.resourceCollected = 0;
  build.lastCollectAt = now;

  return {
    ok: true,
    action: 'collect',
    resourceType,
    amount,
    gained,
    build: buildState(session, buildName, now),
    builds: getBuildsState(session, now),
  };
}

export function changeBuildType(session, buildName, typeName, now = Date.now()) {
  const build = findBuild(session, buildName);
  const template = buildsTemplate[buildName];
  if (!build || !template?.availableTypes) {
    return { ok: false, reason: 'type_unavailable', builds: getBuildsState(session, now) };
  }

  if (!template.availableTypes[typeName]) {
    return { ok: false, reason: 'unknown_type', build: buildState(session, buildName, now), builds: getBuildsState(session, now) };
  }
  if (!Array.isArray(build.availableTypes) || !build.availableTypes.includes(typeName)) {
    return { ok: false, reason: 'type_not_owned', build: buildState(session, buildName, now), builds: getBuildsState(session, now) };
  }

  build.type = typeName;
  return {
    ok: true,
    action: 'change_type',
    build: buildState(session, buildName, now),
    builds: getBuildsState(session, now),
  };
}

export function renameBuild(session, buildName, rawName, now = Date.now()) {
  const build = findBuild(session, buildName);
  if (!build) return { ok: false, reason: 'unknown_build', builds: getBuildsState(session, now) };

  const name = String(rawName || '').replace(/\s+/g, ' ').trim();
  if (!name || name.length > 40) {
    return { ok: false, reason: 'invalid_name', build: buildState(session, buildName, now), builds: getBuildsState(session, now) };
  }
  if (!session.game.builds?.palace?.canChangeName) {
    return { ok: false, reason: 'rename_card_required', build: buildState(session, buildName, now), builds: getBuildsState(session, now) };
  }

  build.customName = name;
  session.game.builds.palace.canChangeName = false;
  return {
    ok: true,
    action: 'rename',
    build: buildState(session, buildName, now),
    builds: getBuildsState(session, now),
  };
}
