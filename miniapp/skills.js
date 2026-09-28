import {
  SKILL_ENCHANT_MAX_LEVEL,
  enchantSkill,
  getEffectiveSkillCost,
  getSkillCooldownMultiplier,
  getSkillEnchantCost,
  getSkillEnchantLevel,
  getSkillPowerMultiplier,
} from '../functions/game/player/skillEnchant.js';

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
  return { kind: 'utility', label: 'Эффект', value: null, unit: '' };
}

function usageState(skill) {
  const { cost, costHp } = getEffectiveSkillCost(skill);
  return {
    mp: number(cost),
    hp: number(costHp),
    cooldownSeconds: Math.max(0, Math.round(number(skill?.cooldown) * getSkillCooldownMultiplier(skill) * 10) / 10),
  };
}

function canAfford(inventory, cost) {
  if (!cost) return false;
  return number(inventory?.gold) >= cost.gold
    && number(inventory?.crystals) >= cost.crystals
    && number(inventory?.ironOre) >= cost.ironOre
    && number(inventory?.sp) >= cost.sp;
}

function skillState(skill, inventory) {
  const level = getSkillEnchantLevel(skill);
  const upgradeCost = getSkillEnchantCost(skill);
  const nextSkill = upgradeCost ? { ...skill, enchantLevel: level + 1 } : null;

  return {
    slot: number(skill?.slot),
    name: String(skill?.name || 'Навык'),
    description: String(skill?.description || ''),
    effect: String(skill?.effect || ''),
    needLevel: Math.max(0, number(skill?.needLvl)),
    enchantLevel: level,
    maxEnchantLevel: SKILL_ENCHANT_MAX_LEVEL,
    power: powerState(skill, getSkillPowerMultiplier(skill)),
    usage: usageState(skill),
    next: nextSkill ? {
      power: powerState(nextSkill, getSkillPowerMultiplier(nextSkill)),
      usage: usageState(nextSkill),
    } : null,
    upgradeCost,
    canUpgrade: Boolean(upgradeCost && canAfford(inventory, upgradeCost)),
  };
}

export function getSkillsState(session) {
  const game = session?.game || {};
  const gameClass = game.gameClass || {};
  const inventory = game.inventory || {};
  const skills = Array.isArray(gameClass.skills) ? gameClass.skills : [];

  return {
    className: String(gameClass.stats?.name || 'noClass'),
    classTitle: String(gameClass.stats?.translateName || gameClass.stats?.name || 'Бродяжка'),
    playerLevel: Math.max(1, number(game.stats?.lvl, 1)),
    inventory: inventoryState(inventory),
    maxEnchantLevel: SKILL_ENCHANT_MAX_LEVEL,
    skills: skills.map(skill => skillState(skill, inventory)),
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

  const result = enchantSkill(skill, inventory);
  return {
    ...result,
    slot,
    skillName: String(skill.name || 'Навык'),
    skills: getSkillsState(session),
  };
}
