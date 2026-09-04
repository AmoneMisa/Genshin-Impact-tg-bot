import getClan from '../functions/game/clans/getClan.js';
import getUserName from '../functions/getters/getUserName.js';
import addClanXp from '../functions/game/clans/addClanXp.js';
import summonClanBoss from '../functions/game/clans/summonClanBoss.js';
import clanBossAttack from '../functions/game/clans/clanBossAttack.js';
import giveClanShopPotion from '../functions/game/clans/giveClanShopPotion.js';
import getBuildingBonus from '../functions/game/clans/getBuildingBonus.js';
import clanShop from '../dictionaries/clanShop.js';
import clanUpgrades from '../dictionaries/clanUpgrades.js';
import clanBuildings from '../dictionaries/clanBuildings.js';

export const CLAN_BOSS_ATTACK_COOLDOWN = 30_000;
export const CLAN_SHOP_COOLDOWN = 7 * 24 * 60 * 60 * 1000;
const BOSS_CONTRIBUTION_PER_DAMAGE = 100;

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

function canAffordCost(source, cost) {
  return Object.entries(cost || {}).every(([resource, amount]) => number(source?.[resource]) >= number(amount));
}

function cloneCost(cost = {}) {
  return Object.fromEntries(Object.entries(cost).map(([resource, amount]) => [resource, number(amount)]));
}

function memberUpgradeCost(track, currentLevel) {
  return track.baseCost * (currentLevel + 1);
}

async function damageBoard(boss) {
  const entries = Object.entries(boss?.damageByUser || {}).sort((a, b) => number(b[1]) - number(a[1]));
  return Promise.all(entries.map(async ([userId, damage]) => ({
    userId,
    name: (await getUserName(Number(userId), 'name')) || `Игрок ${userId}`,
    damage: Math.max(0, number(damage)),
  })));
}

function grantBossRewards(clan, boss) {
  const warehouse = normalizeWarehouse(clan);
  const goldReward = Math.floor(number(boss.maxHp) * (1 + getBuildingBonus(clan, 'treasury')));
  const crystalReward = 10 * Math.max(1, number(boss.level, 1));
  const xpReward = 100 * Math.max(1, number(boss.level, 1));

  warehouse.gold = number(warehouse.gold) + goldReward;
  warehouse.crystals = number(warehouse.crystals) + crystalReward;

  for (const [userId, damage] of Object.entries(boss.damageByUser || {})) {
    const member = findMember(clan, userId);
    if (member) {
      member.contribution = Math.max(0, number(member.contribution))
        + Math.floor(Math.max(0, number(damage)) / BOSS_CONTRIBUTION_PER_DAMAGE);
    }
  }

  const level = addClanXp(clan, xpReward);
  clan.boss = null;
  return {
    gold: goldReward,
    crystals: crystalReward,
    clanXp: xpReward,
    leveledUp: level.leveledUp,
    level: level.level,
  };
}

export async function getClanActivitiesState(clan, userId, playerSession = null, options = {}) {
  if (!clan) return null;
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const member = findMember(clan, userId);
  const warehouse = normalizeWarehouse(clan);
  const playerGold = Math.max(0, number(playerSession?.game?.inventory?.gold));
  const boss = clan.boss;

  const bossState = boss ? {
    name: boss.name,
    level: Math.max(1, number(boss.level, 1)),
    maxHp: Math.max(1, number(boss.maxHp, 1)),
    currentHp: Math.max(0, number(boss.currentHp)),
    defence: Math.max(0, number(boss.defence)),
    cooldownRemainingMs: Math.max(0, number(boss.cooldowns?.[String(userId)]) - now),
    damage: await damageBoard(boss),
  } : null;

  const lastShopAt = Math.max(0, number(member?.lastShopAt));
  const shopCooldownRemainingMs = Math.max(0, lastShopAt + CLAN_SHOP_COOLDOWN - now);

  return {
    boss: bossState,
    shop: {
      cooldownRemainingMs: shopCooldownRemainingMs,
      items: clanShop.map(item => ({
        key: item.key,
        label: item.label,
        cost: cloneCost(item.cost),
        affordable: canAffordCost(warehouse, item.cost),
        available: shopCooldownRemainingMs === 0 && canAffordCost(warehouse, item.cost),
      })),
    },
    upgrades: clanUpgrades.map(track => {
      const level = Math.max(0, number(member?.upgrades?.[track.key]));
      const maxed = level >= track.maxLevel;
      const cost = maxed ? null : memberUpgradeCost(track, level);
      return {
        key: track.key,
        label: track.label,
        description: `${track.perLevel} ${track.desc}`,
        level,
        maxLevel: track.maxLevel,
        cost,
        affordable: !maxed && playerGold >= cost,
      };
    }),
    buildings: clanBuildings.map(definition => {
      const level = Math.max(0, number(clan.buildings?.[definition.key]?.level));
      const maxed = level >= definition.maxLevel;
      const cost = maxed ? null : cloneCost(definition.cost(level));
      return {
        key: definition.key,
        label: definition.label,
        description: definition.description,
        effectLabel: definition.effectLabel,
        level,
        maxLevel: definition.maxLevel,
        cost,
        ownerOnly: true,
        canUpgrade: String(clan.owner) === String(userId) && !maxed && canAffordCost(warehouse, cost),
      };
    }),
  };
}

export function summonClanBossForMiniApp(clan, userId) {
  if (!clan || !findMember(clan, userId)) return { ok: false, reason: 'not_in_clan' };
  if (clan.boss) return { ok: false, reason: 'boss_already_summoned' };
  clan.boss = summonClanBoss(clan);
  return {
    ok: true,
    message: `Призван клановый босс: ${clan.boss.name}.`,
  };
}

export function attackClanBossForMiniApp(clan, playerSession, userId, options = {}) {
  if (!clan || !findMember(clan, userId)) return { ok: false, reason: 'not_in_clan' };
  if (!clan.boss) return { ok: false, reason: 'boss_not_summoned' };
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const userKey = String(userId);
  const cooldownUntil = Math.max(0, number(clan.boss.cooldowns?.[userKey]));
  if (cooldownUntil > now) {
    return { ok: false, reason: 'boss_cooldown', cooldownRemainingMs: cooldownUntil - now };
  }

  const member = findMember(clan, userId);
  const multiplier = 1 + getBuildingBonus(clan, 'barracks');
  const attack = clanBossAttack(playerSession, clan.boss, member?.upgrades || {}, multiplier);
  if (attack.error === 'noClass') return { ok: false, reason: 'no_combat_class' };

  if (!clan.boss.cooldowns) clan.boss.cooldowns = {};
  clan.boss.cooldowns[userKey] = now + CLAN_BOSS_ATTACK_COOLDOWN;

  if (attack.defeated) {
    const reward = grantBossRewards(clan, clan.boss);
    return {
      ok: true,
      defeated: true,
      damage: attack.dmg,
      isCrit: attack.isCrit,
      reward,
      message: `Босс повержен. Клан получил ${reward.gold} золота, ${reward.crystals} кристаллов и ${reward.clanXp} XP.`,
    };
  }

  return {
    ok: true,
    defeated: false,
    damage: attack.dmg,
    isCrit: attack.isCrit,
    message: `Нанесено ${attack.dmg} урона${attack.isCrit ? ' — крит!' : '.'}`,
  };
}

export function buyClanShopItem(clan, playerSession, userId, itemKey, options = {}) {
  if (!clan || !findMember(clan, userId)) return { ok: false, reason: 'not_in_clan' };
  const item = clanShop.find(entry => entry.key === itemKey);
  if (!item) return { ok: false, reason: 'unknown_shop_item' };

  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const member = findMember(clan, userId);
  const nextAllowed = Math.max(0, number(member.lastShopAt)) + CLAN_SHOP_COOLDOWN;
  if (nextAllowed > now) {
    return { ok: false, reason: 'shop_cooldown', cooldownRemainingMs: nextAllowed - now };
  }

  const warehouse = normalizeWarehouse(clan);
  if (!canAffordCost(warehouse, item.cost)) return { ok: false, reason: 'warehouse_insufficient' };
  if (!giveClanShopPotion(playerSession, item.potion)) return { ok: false, reason: 'shop_delivery_failed' };

  for (const [resource, amount] of Object.entries(item.cost)) {
    warehouse[resource] = number(warehouse[resource]) - number(amount);
  }
  member.lastShopAt = now;

  return { ok: true, item: { key: item.key, label: item.label }, message: `Получено: ${item.label}.` };
}

export function upgradeClanMember(clan, playerSession, userId, trackKey) {
  if (!clan || !findMember(clan, userId)) return { ok: false, reason: 'not_in_clan' };
  const track = clanUpgrades.find(entry => entry.key === trackKey);
  if (!track) return { ok: false, reason: 'unknown_upgrade' };

  const member = findMember(clan, userId);
  if (!member.upgrades) member.upgrades = {};
  const level = Math.max(0, number(member.upgrades[trackKey]));
  if (level >= track.maxLevel) return { ok: false, reason: 'upgrade_maxed' };

  const inventory = playerSession?.game?.inventory;
  if (!inventory) return { ok: false, reason: 'player_not_found' };
  const cost = memberUpgradeCost(track, level);
  const gold = Math.max(0, number(inventory.gold));
  if (gold < cost) return { ok: false, reason: 'not_enough_gold', cost, gold };

  inventory.gold = gold - cost;
  member.upgrades[trackKey] = level + 1;
  return {
    ok: true,
    track: trackKey,
    level: level + 1,
    cost,
    message: `${track.label} улучшена до уровня ${level + 1}.`,
  };
}

export function upgradeClanBuilding(clan, userId, buildingKey) {
  if (!clan || !findMember(clan, userId)) return { ok: false, reason: 'not_in_clan' };
  if (String(clan.owner) !== String(userId)) return { ok: false, reason: 'owner_only' };
  const definition = clanBuildings.find(entry => entry.key === buildingKey);
  if (!definition) return { ok: false, reason: 'unknown_building' };

  if (!clan.buildings) clan.buildings = {};
  const level = Math.max(0, number(clan.buildings[buildingKey]?.level));
  if (level >= definition.maxLevel) return { ok: false, reason: 'building_maxed' };

  const cost = definition.cost(level);
  const warehouse = normalizeWarehouse(clan);
  if (!canAffordCost(warehouse, cost)) return { ok: false, reason: 'warehouse_insufficient', cost: cloneCost(cost) };

  for (const [resource, amount] of Object.entries(cost)) {
    warehouse[resource] = number(warehouse[resource]) - number(amount);
  }
  clan.buildings[buildingKey] = { level: level + 1 };
  return {
    ok: true,
    building: buildingKey,
    level: level + 1,
    message: `${definition.label} улучшена до уровня ${level + 1}.`,
  };
}

export async function prepareClanActivity(userId, playerSession, action, body = {}) {
  const clan = await getClan(userId);
  if (!clan) return { clan: null, result: { ok: false, reason: 'not_in_clan' }, savePlayer: false };

  if (action === 'boss_summon') {
    return { clan, result: summonClanBossForMiniApp(clan, userId), savePlayer: false };
  }
  if (action === 'boss_attack') {
    return { clan, result: attackClanBossForMiniApp(clan, playerSession, userId), savePlayer: false };
  }
  if (action === 'shop_buy') {
    return { clan, result: buyClanShopItem(clan, playerSession, userId, body.itemKey), savePlayer: true };
  }
  if (action === 'upgrade_member') {
    return { clan, result: upgradeClanMember(clan, playerSession, userId, body.trackKey), savePlayer: true };
  }
  if (action === 'upgrade_building') {
    return { clan, result: upgradeClanBuilding(clan, userId, body.buildingKey), savePlayer: false };
  }
  return { clan, result: { ok: false, reason: 'unknown_clan_activity' }, savePlayer: false };
}
