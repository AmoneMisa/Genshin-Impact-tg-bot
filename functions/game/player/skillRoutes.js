// Lineage-style enchant routes. Until the 3rd profession a skill only has a
// level (skillEnchant.js: power, cost and cooldown together, plus new skills from
// promotions). A 3rd-class player may additionally pick ONE route per skill and
// level it up to ROUTE_MAX_LEVEL, specialising it:
//
//   power      - stronger damage / heal / shield
//   cost       - cheaper to cast
//   time       - shorter cooldown and longer buffs / debuffs
//   chance     - more crit chance (damage), stronger debuffs
//   attribute  - lifesteal on damage skills, returns mana on the rest
//   protection - casting also grants a short damage-reduction guard
//
// Stored on the player's skill instance: routeKind, routeLevel. Routes need the
// skill at level ROUTE_MIN_SKILL_LEVEL first, SP, gold and Ancient Seals (plus
// the skill's boss essence from route level 3).
import { getMaterialCount, spendMaterials } from './materials.js';

export const ROUTE_MAX_LEVEL = 5;
export const ROUTE_MIN_SKILL_LEVEL = 5;
export const ROUTE_MIN_CLASS_TIER = 3;
export const ROUTE_RESET_FEE = {gold: 25000, crystals: 25};

export const ROUTES = Object.freeze({
    power: {label: 'Сила', icon: '💪', description: 'Урон, лечение и щит сильнее на 4% за уровень.', perLevel: 0.04},
    cost: {label: 'Экономия', icon: '🔹', description: 'Навык дешевле на 5% за уровень.', perLevel: 0.05},
    time: {label: 'Время', icon: '⏱', description: 'Перезарядка короче на 4%, эффекты длятся дольше на 6% за уровень.', perLevel: 0.04},
    chance: {label: 'Шанс', icon: '🎯', description: '+3% к шансу крита навыка, ослабления на 4% сильнее за уровень.', perLevel: 0.03},
    attribute: {label: 'Атрибут', icon: '🩸', description: 'Урон возвращает 1.5% здоровьем за уровень; прочие навыки возвращают 2% маны.', perLevel: 0.015},
    protection: {label: 'Защита', icon: '🛡️', description: 'После применения: −3% получаемого урона на 8 секунд за уровень.', perLevel: 0.03},
});

export const routeKinds = () => Object.keys(ROUTES);

export function canUseRoutes(session) {
    return (Number(session?.game?.gameClass?.stats?.tier) || 1) >= ROUTE_MIN_CLASS_TIER;
}

export function getRouteLevel(skill) {
    return skill?.routeKind in ROUTES ? Math.max(0, Math.min(ROUTE_MAX_LEVEL, Number(skill.routeLevel) || 0)) : 0;
}

/** Bonuses a skill's route gives right now (all zero without one). */
export function getRouteBonus(skill) {
    const level = getRouteLevel(skill);
    const bonus = {power: 0, cost: 0, cooldown: 0, duration: 0, critBonus: 0, debuff: 0, vampire: 0, mpRestore: 0, guard: 0, guardSeconds: 0};
    if (!level) return bonus;
    const step = ROUTES[skill.routeKind].perLevel * level;
    switch (skill.routeKind) {
        case 'power': bonus.power = step; break;
        case 'cost': bonus.cost = step; break;
        case 'time': bonus.cooldown = step; bonus.duration = 1.5 * step; break;
        case 'chance': bonus.critBonus = level * 3; bonus.debuff = 4 / 3 * step; break;
        case 'attribute': bonus.vampire = step; bonus.mpRestore = 2 / 1.5 * step; break;
        case 'protection': bonus.guard = step; bonus.guardSeconds = 8; break;
    }
    return bonus;
}

/** Cost of the next route level, or null at the maximum. */
export function getRouteCost(skill) {
    const level = getRouteLevel(skill);
    if (level >= ROUTE_MAX_LEVEL) return null;
    const next = level + 1;
    const items = {ancient_seal: next};
    if (next >= 3 && skill?.enchantItem?.key) items[skill.enchantItem.key] = next - 2;
    return {gold: 15000 * next, sp: 80 * next, items};
}

function why(session, skill) {
    if (!canUseRoutes(session)) return 'routes_locked';
    if ((Number(skill?.enchantLevel) || 0) < ROUTE_MIN_SKILL_LEVEL) return 'skill_level_too_low';
    return null;
}

/** Picks a route for a skill that has none (level 0 -> 1) or levels the chosen one. */
export function upgradeRoute(session, skill, kind) {
    const blocked = why(session, skill);
    if (blocked) return {ok: false, reason: blocked};
    if (!(kind in ROUTES)) return {ok: false, reason: 'unknown_route'};
    if (getRouteLevel(skill) > 0 && skill.routeKind !== kind) return {ok: false, reason: 'other_route_chosen'};

    const cost = getRouteCost({...skill, routeKind: kind});
    if (!cost) return {ok: false, reason: 'max_route_level'};

    const inventory = session.game.inventory;
    if ((inventory.gold || 0) < cost.gold) return {ok: false, reason: 'not_enough_gold', cost};
    if ((inventory.sp || 0) < cost.sp) return {ok: false, reason: 'not_enough_sp', cost};
    const missing = Object.entries(cost.items).filter(([key, amount]) => getMaterialCount(session, key) < amount);
    if (missing.length) return {ok: false, reason: 'not_enough_items', cost, missing: Object.fromEntries(missing)};

    inventory.gold -= cost.gold;
    inventory.sp -= cost.sp;
    spendMaterials(session, cost.items);
    skill.routeKind = kind;
    skill.routeLevel = getRouteLevel({routeKind: kind, routeLevel: skill.routeLevel}) + 1;
    return {ok: true, route: kind, level: skill.routeLevel};
}

/** Drops a skill's route for a fee, so another can be chosen. */
export function resetRoute(session, skill) {
    if (!canUseRoutes(session)) return {ok: false, reason: 'routes_locked'};
    if (!getRouteLevel(skill)) return {ok: false, reason: 'no_route'};
    const inventory = session.game.inventory;
    if ((inventory.gold || 0) < ROUTE_RESET_FEE.gold) return {ok: false, reason: 'not_enough_gold', cost: ROUTE_RESET_FEE};
    if ((inventory.crystals || 0) < ROUTE_RESET_FEE.crystals) return {ok: false, reason: 'not_enough_crystals', cost: ROUTE_RESET_FEE};
    inventory.gold -= ROUTE_RESET_FEE.gold;
    inventory.crystals -= ROUTE_RESET_FEE.crystals;
    delete skill.routeKind;
    skill.routeLevel = 0;
    return {ok: true};
}
