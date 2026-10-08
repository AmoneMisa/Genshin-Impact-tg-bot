import {
  SKILL_ENCHANT_MAX_LEVEL,
  enchantSkill,
  getEffectiveSkillCost,
  getSkillCooldownMultiplier,
  getSkillEnchantCost,
  getSkillEnchantLevel,
  getSkillPowerMultiplier,
} from '../functions/game/player/skillEnchant.js';
import getMaxHp from '../functions/game/player/getters/getMaxHp.js';
import { getMaterialCount, listMaterials, materialInfo } from '../functions/game/player/materials.js';
import {
  ROUTES, ROUTE_MAX_LEVEL, ROUTE_MIN_SKILL_LEVEL, ROUTE_RESET_FEE,
  canUseRoutes, getRouteCost, getRouteLevel, resetRoute, upgradeRoute,
} from '../functions/game/player/skillRoutes.js';

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function inventoryState(inventory = {}) {
  return {
    gold: number(inventory.gold),
    crystals: number(inventory.crystals),
    ironOre: number(inventory.ironOre),
    sp: number(inventory.sp),
  };
}

function powerState(skill, multiplier = 1) {
  if (skill?.isDealDamage) {
    return {
      kind: 'damage',
      label: 'Урон',
      value: Math.round(number(skill.damageModifier, 1) * multiplier * 100),
      unit: '%',
      hits: Math.max(1, number(skill.hits, 1)),
    };
  }
  if (skill?.isHeal) {
    return {
      kind: 'heal',
      label: 'Лечение',
      value: Math.round(number(skill.healPower) * multiplier * 100),
      unit: '% HP',
    };
  }
  if (skill?.isShield) {
    return {
      kind: 'shield',
      label: 'Щит',
      value: Math.round(number(skill.shieldPower) * multiplier * 100),
      unit: '% HP',
    };
  }
  if (skill?.isBuff || skill?.buffs?.length) return { kind: 'buff', label: 'Усиление', value: null, unit: '' };
  if (skill?.debuff) return { kind: 'debuff', label: 'Ослабление', value: null, unit: '' };
  if (skill?.restoreMp) return { kind: 'restore', label: 'Мана', value: Math.round(skill.restoreMp * 100), unit: '% MP' };
  return { kind: 'utility', label: 'Эффект', value: null, unit: '' };
}

const BUFF_TEXT = {
  damage: buff => `+${buff.amount}% урона`,
  critChance: buff => `+${buff.amount}% к шансу крита`,
  critDamage: buff => `+${buff.amount}% к крит. урону`,
  guard: buff => `−${buff.amount}% получаемого урона`,
  taunt: () => 'провокация',
  evade: buff => `${buff.amount}% уклонения`,
  haste: buff => `−${buff.amount}% к перезарядке`,
};
const DEBUFF_TEXT = {
  armorBreak: debuff => `броня босса −${debuff.amount}%`,
  weaken: debuff => `урон босса −${debuff.amount}%`,
  stun: () => 'оглушение',
};

/** Short chips under a skill name: what makes it special. */
export function skillTags(skill) {
  const tags = [];
  if (skill?.hits > 1) tags.push(`Серия ×${skill.hits}`);
  if (skill?.critChanceBonus) tags.push(`Крит +${skill.critChanceBonus}%`);
  if (skill?.executeBelow) tags.push(`Добивание <${Math.round(skill.executeBelow * 100)}% HP`);
  if (skill?.vampirePower) tags.push(`Вампиризм ${Math.round(skill.vampirePower * 100)}%`);
  if (skill?.costHpPct) tags.push(`Цена: ${Math.round(skill.costHpPct * 100)}% HP`);
  for (const buff of skill?.buffs || []) {
    const when = buff.charges ? `${buff.charges} атак` : `${buff.seconds} с`;
    tags.push(`${BUFF_TEXT[buff.kind]?.(buff) || buff.kind} · ${when}`);
  }
  for (const debuff of [skill?.debuff, ...(skill?.debuffs || [])].filter(Boolean)) {
    const text = DEBUFF_TEXT[debuff.kind]?.(debuff) || debuff.kind;
    tags.push(`${text} · ${debuff.seconds} с`);
  }
  if (skill?.restoreMp && !skill?.isHeal) tags.push(`Мана +${Math.round(skill.restoreMp * 100)}%`);
  return tags;
}

function usageState(skill, maxHp) {
  const { cost, costHp } = getEffectiveSkillCost(skill, maxHp);
  return {
    mp: number(cost),
    hp: number(costHp),
    cooldownSeconds: Math.max(0, Math.round(number(skill?.cooldown) * getSkillCooldownMultiplier(skill) * 10) / 10),
  };
}

/** `items` of an upgrade cost as display rows with what the player has. */
function itemRows(session, items = {}) {
  return Object.entries(items).map(([key, need]) => ({
    key,
    ...pick(materialInfo(key)),
    need,
    have: getMaterialCount(session, key),
  }));
}

function pick({ name, icon }) {
  return { name, icon };
}

function canAfford(session, inventory, cost) {
  if (!cost) return false;
  return number(inventory?.gold) >= cost.gold
    && number(inventory?.crystals) >= cost.crystals
    && number(inventory?.ironOre) >= cost.ironOre
    && number(inventory?.sp) >= cost.sp
    && Object.entries(cost.items || {}).every(([key, need]) => getMaterialCount(session, key) >= need);
}

function routeState(session, skill) {
  const unlocked = canUseRoutes(session);
  const level = getRouteLevel(skill);
  const cost = getRouteCost(skill?.routeKind in ROUTES ? skill : { ...skill, routeKind: 'power' });
  const inventory = session?.game?.inventory || {};
  const affordable = Boolean(cost)
    && number(inventory.gold) >= cost.gold
    && number(inventory.sp) >= cost.sp
    && Object.entries(cost.items).every(([key, need]) => getMaterialCount(session, key) >= need);
  return {
    unlocked,
    kind: level > 0 ? skill.routeKind : null,
    level,
    maxLevel: ROUTE_MAX_LEVEL,
    needSkillLevel: ROUTE_MIN_SKILL_LEVEL,
    skillReady: number(skill?.enchantLevel) >= ROUTE_MIN_SKILL_LEVEL,
    cost: cost ? { gold: cost.gold, sp: cost.sp, items: itemRows(session, cost.items) } : null,
    canUpgrade: unlocked && number(skill?.enchantLevel) >= ROUTE_MIN_SKILL_LEVEL && affordable,
  };
}

function skillState(session, skill, playerLevel) {
  const inventory = session?.game?.inventory || {};
  const maxHp = number(getMaxHp(session, session.game.gameClass));
  const level = getSkillEnchantLevel(skill);
  const upgradeCost = getSkillEnchantCost(skill);
  const nextSkill = upgradeCost ? { ...skill, enchantLevel: level + 1 } : null;
  const costView = upgradeCost
    ? { ...upgradeCost, ...(upgradeCost.items ? { items: itemRows(session, upgradeCost.items) } : {}) }
    : null;

  return {
    slot: number(skill?.slot),
    name: String(skill?.name || 'Навык'),
    description: String(skill?.description || ''),
    effect: String(skill?.effect || ''),
    tier: Math.max(1, number(skill?.tier, 1)),
    tags: skillTags(skill),
    needLevel: Math.max(0, number(skill?.needLvl)),
    locked: number(skill?.needLvl) > playerLevel,
    enchantLevel: level,
    maxEnchantLevel: SKILL_ENCHANT_MAX_LEVEL,
    power: powerState(skill, getSkillPowerMultiplier(skill)),
    usage: usageState(skill, maxHp),
    next: nextSkill ? {
      power: powerState(nextSkill, getSkillPowerMultiplier(nextSkill)),
      usage: usageState(nextSkill, maxHp),
    } : null,
    upgradeCost: costView,
    canUpgrade: Boolean(upgradeCost && canAfford(session, inventory, upgradeCost)),
    route: routeState(session, skill),
  };
}

export function getSkillsState(session) {
  const game = session?.game || {};
  const gameClass = game.gameClass || {};
  const inventory = game.inventory || {};
  const skills = Array.isArray(gameClass.skills) ? gameClass.skills : [];
  const playerLevel = Math.max(1, number(game.stats?.lvl, 1));

  return {
    className: String(gameClass.stats?.name || 'noClass'),
    classTitle: String(gameClass.stats?.translateName || gameClass.stats?.name || 'Бродяжка'),
    classTier: Math.max(1, number(gameClass.stats?.tier, 1)),
    playerLevel,
    inventory: inventoryState(inventory),
    materials: listMaterials(session),
    maxEnchantLevel: SKILL_ENCHANT_MAX_LEVEL,
    routesUnlocked: canUseRoutes(session),
    routeOptions: Object.entries(ROUTES).map(([kind, route]) => ({ kind, label: route.label, icon: route.icon, description: route.description })),
    routeResetFee: ROUTE_RESET_FEE,
    skills: skills.map(skill => skillState(session, skill, playerLevel)),
  };
}

export function enchantSkillForMiniApp(session, rawSlot) {
  const slot = Number(rawSlot);
  if (!Number.isInteger(slot) || slot < 0) {
    return { ok: false, reason: 'invalid_skill', skills: getSkillsState(session) };
  }

  const skills = session?.game?.gameClass?.skills;
  const inventory = session?.game?.inventory;
  if (!Array.isArray(skills) || !inventory) {
    return { ok: false, reason: 'no_skills', skills: getSkillsState(session) };
  }

  const skill = skills.find(item => Number(item?.slot) === slot);
  if (!skill) {
    return { ok: false, reason: 'invalid_skill', skills: getSkillsState(session) };
  }

  const { cost, ...result } = enchantSkill(skill, inventory);
  return {
    ...result,
    slot,
    skillName: String(skill.name || 'Навык'),
    skills: getSkillsState(session),
  };
}

/** Picks / levels a 3rd-class enchant route (`kind`), or drops it (`kind` = 'reset'). */
export function routeSkillForMiniApp(session, rawSlot, kind) {
  const slot = Number(rawSlot);
  const skill = Array.isArray(session?.game?.gameClass?.skills)
    ? session.game.gameClass.skills.find(item => Number(item?.slot) === slot)
    : null;
  if (!skill) return { ok: false, reason: 'invalid_skill', skills: getSkillsState(session) };

  const { cost, ...result } = kind === 'reset' ? resetRoute(session, skill) : upgradeRoute(session, skill, String(kind));
  return { ...result, slot, skillName: String(skill.name || 'Навык'), skills: getSkillsState(session) };
}
