// Clan skills (Lineage II): the clan learns a skill with reputation, gold and an egg from the
// warehouse (eggs drop from epic bosses); every member then gets the skill's bonus while in the
// clan. The clan keeps the levels in clan.skills = {id: level}; each member's session holds a copy
// in game.clanPerks = {id: level} (refreshed by syncClanPerks), which is what the stat code reads.
export const CLAN_SKILL_MAX_LEVEL = 5;
export const CLAN_PERK_REFRESH_MS = 10 * 60 * 1000;

/** Egg materials, kept in the clan warehouse. `drop` is the chance one epic boss kill gives it. */
export const CLAN_EGGS = Object.freeze({
    egg_wyvern: { name: 'Яйцо виверны', tier: 1 },
    egg_dragon: { name: 'Яйцо дракона', tier: 2 },
    egg_ancient: { name: 'Яйцо древнего дракона', tier: 3 },
});

const skill = (id, name, text, stat, per) => ({ id, name, text, stat, per });

export const CLAN_SKILLS = Object.freeze([
    skill('clan-might', 'Клановая мощь', 'Атака', 'attackMul', 0.01),
    skill('clan-shield', 'Клановая стойкость', 'Защита', 'defenceMul', 0.01),
    skill('clan-vitality', 'Клановая жизнь', 'Максимальное HP', 'maxHpMul', 0.015),
    skill('clan-precision', 'Клановая точность', 'Точность', 'accuracy', 1),
    skill('clan-agility', 'Клановая ловкость', 'Уклонение', 'evasion', 1),
    skill('clan-fury', 'Клановая ярость', 'Критический урон', 'criticalDamage', 0.015),
].map(Object.freeze));

/** Clan level a skill level needs, reputation, gold and the egg cost to learn it. */
export const CLAN_SKILL_LEVELS = Object.freeze([
    { clanLevel: 2, reputation: 300, gold: 20000, egg: 'egg_wyvern', eggs: 1 },
    { clanLevel: 3, reputation: 800, gold: 60000, egg: 'egg_wyvern', eggs: 2 },
    { clanLevel: 4, reputation: 1800, gold: 150000, egg: 'egg_dragon', eggs: 1 },
    { clanLevel: 5, reputation: 3500, gold: 350000, egg: 'egg_dragon', eggs: 2 },
    { clanLevel: 6, reputation: 7000, gold: 800000, egg: 'egg_ancient', eggs: 1 },
]);

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const clamp = value => Math.max(0, Math.min(CLAN_SKILL_MAX_LEVEL, Math.floor(number(value))));

export const clanSkillLevel = (clan, id) => clamp(clan?.skills?.[id]);

/** Stat deltas of the clan perks a member has right now. */
export function clanPerkModifiers(session) {
    const result = {};
    const perks = session?.game?.clanPerks;
    if (!perks || typeof perks !== 'object') return result;
    for (const entry of CLAN_SKILLS) {
        const level = clamp(perks[entry.id]);
        if (level) result[entry.stat] = (result[entry.stat] || 0) + entry.per * level;
    }
    return result;
}

/** Copies the clan's skill levels to the member's session; `clan` null clears them. Returns true when changed. */
export function syncClanPerks(session, clan, now = Date.now()) {
    if (!session?.game) return false;
    const next = {};
    for (const entry of CLAN_SKILLS) {
        const level = clanSkillLevel(clan, entry.id);
        if (level) next[entry.id] = level;
    }
    const changed = JSON.stringify(next) !== JSON.stringify(session.game.clanPerks || {});
    if (changed) session.game.clanPerks = next;
    session.game.clanPerksAt = now;
    return changed;
}

export const clanPerksStale = (session, now = Date.now()) => now - number(session?.game?.clanPerksAt) > CLAN_PERK_REFRESH_MS;

const eggCount = (clan, key) => Math.max(0, number(clan?.warehouse?.[key]));

export function getClanSkillsState(clan) {
    return {
        eggs: Object.entries(CLAN_EGGS).map(([key, egg]) => ({ key, name: egg.name, count: eggCount(clan, key) })),
        skills: CLAN_SKILLS.map(entry => {
            const level = clanSkillLevel(clan, entry.id);
            const cost = level < CLAN_SKILL_MAX_LEVEL ? CLAN_SKILL_LEVELS[level] : null;
            const missing = [];
            if (cost) {
                if (number(clan?.level, 1) < cost.clanLevel) missing.push('clan_level');
                if (number(clan?.reputation) < cost.reputation) missing.push('reputation');
                if (number(clan?.warehouse?.gold) < cost.gold) missing.push('gold');
                if (eggCount(clan, cost.egg) < cost.eggs) missing.push('eggs');
            }
            return {
                id: entry.id, name: entry.name, stat: entry.text, level, maxLevel: CLAN_SKILL_MAX_LEVEL,
                perLevel: entry.per, cost: cost ? { ...cost, eggName: CLAN_EGGS[cost.egg].name } : null,
                canLearn: Boolean(cost) && missing.length === 0, missing,
            };
        }),
    };
}

/** Raises a clan skill by a level, paying from the warehouse. The caller saves the clan. */
export function learnClanSkill(clan, id) {
    const entry = CLAN_SKILLS.find(item => item.id === id);
    if (!entry) return { ok: false, reason: 'unknown_skill' };
    const level = clanSkillLevel(clan, id);
    if (level >= CLAN_SKILL_MAX_LEVEL) return { ok: false, reason: 'max_level' };
    const cost = CLAN_SKILL_LEVELS[level];
    if (number(clan.level, 1) < cost.clanLevel) return { ok: false, reason: 'clan_level_too_low', needLevel: cost.clanLevel };
    if (number(clan.reputation) < cost.reputation) return { ok: false, reason: 'not_enough_reputation' };
    if (!clan.warehouse) clan.warehouse = {};
    if (number(clan.warehouse.gold) < cost.gold) return { ok: false, reason: 'warehouse_insufficient' };
    if (eggCount(clan, cost.egg) < cost.eggs) return { ok: false, reason: 'not_enough_eggs', egg: cost.egg };

    clan.warehouse.gold = number(clan.warehouse.gold) - cost.gold;
    clan.warehouse[cost.egg] = eggCount(clan, cost.egg) - cost.eggs;
    if (!clan.skills || typeof clan.skills !== 'object') clan.skills = {};
    clan.skills[id] = level + 1;
    return { ok: true, id, level: level + 1, name: entry.name, message: `Клановый навык «${entry.name}» — уровень ${level + 1}.` };
}

/** Adds eggs to the clan warehouse (an epic boss kill). */
export function giveClanEggs(clan, key, count) {
    if (!CLAN_EGGS[key] || !clan) return false;
    if (!clan.warehouse) clan.warehouse = {};
    clan.warehouse[key] = eggCount(clan, key) + Math.max(0, Math.floor(number(count)));
    return true;
}
