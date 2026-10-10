import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROUTE_MAX_LEVEL, ROUTES, canUseRoutes, getRouteBonus, getRouteCost, getRouteLevel, resetRoute, upgradeRoute,
} from '../functions/game/player/skillRoutes.js';
import {
  getEffectiveSkillCost, getSkillCooldownMultiplier, getSkillEnchantCost, getSkillPowerMultiplier, enchantSkill,
} from '../functions/game/player/skillEnchant.js';
import { addMaterial, getMaterialCount } from '../functions/game/player/materials.js';
import { getSkillsState, routeSkillForMiniApp, skillTags } from '../miniapp/skills.js';
// An awakened skill of a 3rd profession: a stun, a boss essence for the top levels (the kit is generated from the
// real class trees, so the test builds its own skill instead of pointing at a slot of a generated class).
const awakened = { slot: 9, name: 'Test Awakening', description: 'x', effect: 'magic_attack', isDealDamage: true, damageModifier: 15, cooldown: 150, cost: 450,
  tier: 4, needLvl: 80, debuff: { kind: 'stun', amount: 0, seconds: 5 }, enchantItem: { key: 'essence_radjahal', perLevel: 1 } };
const volley = { slot: 10, name: 'Test Volley', description: 'x', effect: 'multi_hit', hits: 5, isDealDamage: true, damageModifier: 2.2, cooldown: 90, cost: 330, tier: 4, needLvl: 76 };
const classSkills = { archmage: Object.assign([], { 5: volley, 6: awakened, 7: awakened }) };

function session(tier = 4, skillOverrides = {}) {
  const skill = { ...classSkills.archmage[6], enchantLevel: 5, ...skillOverrides };
  return {
    game: {
      stats: { lvl: 80 },
      inventory: { gold: 1_000_000, crystals: 500, ironOre: 500, sp: 5_000 },
      gameClass: { stats: { name: 'archmage', tier, translateName: 'Архимаг', maxHp: 1000, hp: 1000 }, skills: [skill] },
      equipmentStats: {},
    },
  };
}

test('routes open only for 3rd professions', () => {
  assert.equal(canUseRoutes(session(4)), true);
  assert.equal(canUseRoutes(session(3)), false);
  assert.equal(canUseRoutes(session(2)), false);
  assert.equal(canUseRoutes(session(1)), false);
  const second = session(2);
  addMaterial(second, 'ancient_seal', 9);
  assert.equal(upgradeRoute(second, second.game.gameClass.skills[0], 'power').reason, 'routes_locked');
  assert.equal(second.game.gameClass.skills[0].routeKind, undefined);
});

test('before the 3rd class a skill only has its level; routes need skill level 5 first', () => {
  const low = session(4, { enchantLevel: 4 });
  assert.equal(upgradeRoute(low, low.game.gameClass.skills[0], 'power').reason, 'skill_level_too_low');
  const ready = session(4);
  assert.equal(upgradeRoute(ready, ready.game.gameClass.skills[0], 'nonsense').reason, 'unknown_route');
});

test('a route costs gold, SP and Ancient Seals, plus the boss essence from level 3', () => {
  const s = session();
  const skill = s.game.gameClass.skills[0];
  assert.deepEqual(getRouteCost({ ...skill, routeKind: 'power' }), { gold: 15000, sp: 80, items: { ancient_seal: 1 } });
  const third = getRouteCost({ ...skill, routeKind: 'power', routeLevel: 2 });
  assert.deepEqual(third.items, { ancient_seal: 3, [skill.enchantItem.key]: 1 });

  assert.equal(upgradeRoute(s, skill, 'power').reason, 'not_enough_items');
  addMaterial(s, 'ancient_seal', 20);
  addMaterial(s, skill.enchantItem.key, 20);
  const goldBefore = s.game.inventory.gold;
  const result = upgradeRoute(s, skill, 'power');
  assert.deepEqual([result.ok, result.route, result.level], [true, 'power', 1]);
  assert.equal(s.game.inventory.gold, goldBefore - 15000);
  assert.equal(s.game.inventory.sp, 5_000 - 80);
  assert.equal(getMaterialCount(s, 'ancient_seal'), 19);
});

test('one route per skill, up to level 5, then it stops', () => {
  const s = session();
  const skill = s.game.gameClass.skills[0];
  addMaterial(s, 'ancient_seal', 100);
  addMaterial(s, skill.enchantItem.key, 100);
  upgradeRoute(s, skill, 'cost');
  assert.equal(upgradeRoute(s, skill, 'power').reason, 'other_route_chosen');
  for (let i = 1; i < ROUTE_MAX_LEVEL; i++) assert.equal(upgradeRoute(s, skill, 'cost').ok, true);
  assert.equal(getRouteLevel(skill), ROUTE_MAX_LEVEL);
  assert.equal(upgradeRoute(s, skill, 'cost').reason, 'max_route_level');
  assert.equal(getRouteCost(skill), null);
});

test('each route changes exactly what it promises', () => {
  const base = { ...classSkills.archmage[6], enchantLevel: 0 };
  const withRoute = (kind, level = 5) => ({ ...base, routeKind: kind, routeLevel: level });

  assert.ok(Math.abs(getSkillPowerMultiplier(withRoute('power')) - 1.2) < 1e-9);
  assert.ok(getEffectiveSkillCost(withRoute('cost')).cost < getEffectiveSkillCost(base).cost * 0.8);
  assert.ok(getSkillCooldownMultiplier(withRoute('time')) < 0.81);
  assert.ok(getRouteBonus(withRoute('time')).duration > getRouteBonus(withRoute('time')).cooldown);
  assert.equal(getRouteBonus(withRoute('chance')).critBonus, 15);
  assert.ok(getRouteBonus(withRoute('attribute')).vampire > 0.07);
  assert.ok(getRouteBonus(withRoute('protection')).guard > 0.14);
  // Unrelated routes leave the other numbers alone.
  assert.equal(getSkillPowerMultiplier(withRoute('cost')), 1);
  assert.equal(getRouteBonus(base).critBonus, 0);
  assert.deepEqual(Object.keys(ROUTES), ['power', 'cost', 'time', 'chance', 'attribute', 'protection']);
});

test('resetting a route costs gold and crystals and frees the skill for another', () => {
  const s = session();
  const skill = s.game.gameClass.skills[0];
  addMaterial(s, 'ancient_seal', 5);
  upgradeRoute(s, skill, 'power');
  s.game.inventory.gold = 0;
  assert.equal(resetRoute(s, skill).reason, 'not_enough_gold');
  s.game.inventory.gold = 100_000;
  assert.equal(resetRoute(s, skill).ok, true);
  assert.equal(getRouteLevel(skill), 0);
  assert.equal(upgradeRoute(s, skill, 'time').ok, true);
  assert.equal(resetRoute(s, { slot: 9 }).reason, 'no_route');
});

test('plain skill levels from 4 on need Skill Scrolls, 8 on Ancient Seals, and the awakened skills an essence', () => {
  const skill = { ...classSkills.archmage[7], enchantLevel: 0 };
  assert.equal(getSkillEnchantCost({ ...skill, enchantLevel: 2 }).items, undefined);
  assert.deepEqual(getSkillEnchantCost({ ...skill, enchantLevel: 3 }).items, { skill_scroll: 1 });
  assert.deepEqual(getSkillEnchantCost({ ...skill, enchantLevel: 6 }).items, { skill_scroll: 4 });
  assert.deepEqual(getSkillEnchantCost({ ...skill, enchantLevel: 7 }).items, { ancient_seal: 1, [skill.enchantItem.key]: 1 });
  assert.equal(getSkillEnchantCost({ ...skill, enchantLevel: 0 }).gold, 5000, 'tier 4 skills cost two and a half times the gold');

  const owner = session();
  const target = { ...skill, enchantLevel: 3 };
  assert.equal(enchantSkill(target, owner.game.inventory).reason, 'not_enough_items');
  addMaterial(owner, 'skill_scroll', 1);
  assert.equal(enchantSkill(target, owner.game.inventory).ok, true);
  assert.equal(getMaterialCount(owner, 'skill_scroll'), 0);
});

test('Mini App state shows tags, locks, items and the route block; the route action works end to end', () => {
  const s = session();
  s.game.stats.lvl = 80;
  const skill = s.game.gameClass.skills[0];
  addMaterial(s, 'ancient_seal', 3);
  const state = getSkillsState(s);
  assert.equal(state.routesUnlocked, true);
  assert.equal(state.routeOptions.length, 6);
  assert.deepEqual(state.materials.map(item => item.key), ['ancient_seal']);
  const row = state.skills[0];
  assert.equal(row.tier, 4);
  assert.equal(row.power.hits, 1);
  assert.ok(row.tags.some(tag => tag.startsWith('оглушение')));
  assert.ok(skillTags(classSkills.archmage[5]).includes('Серия ×5'));
  assert.equal(row.locked, false);
  assert.equal(row.route.canUpgrade, true);
  assert.equal(row.route.cost.items[0].need, 1);

  const result = routeSkillForMiniApp(s, skill.slot, 'power');
  assert.equal(result.ok, true);
  assert.equal(result.skills.skills[0].route.kind, 'power');
  assert.equal(routeSkillForMiniApp(s, 99, 'power').reason, 'invalid_skill');

  s.game.stats.lvl = 30;
  assert.equal(getSkillsState(s).skills[0].locked, true, 'level 80 skill is locked at level 30');
  assert.equal(getSkillsState(session(2)).routesUnlocked, false);
  assert.ok(skillTags({ slot: 3, name: 'x', effect: 'strong_attack', isDealDamage: true, damageModifier: 7, cooldown: 50, cost: 0, costHpPct: 0.03 }).includes('Цена: 3% HP'));
  assert.ok(skillTags({ slot: 4, name: 'y', effect: 'buff', isBuff: true, isSelf: true, cooldown: 90, cost: 0, buffs: [{ kind: 'damage', amount: 80, charges: 4 }] }).some(tag => tag.includes('+80% урона')));
});
