// Clan skills (Lineage II): the real clan skill tree (template/l2Classes.js `clan`, pledgeSkillTree.xml). The clan
// learns a skill level with the real clan level it needs, reputation, gold and the eggs of epic bosses from the
// warehouse; every member then gets the skill's bonus while in the clan. The clan keeps the levels in
// clan.skills = {skillId: level}; each member's session holds a copy in game.clanPerks = {skillId: level}
// (refreshed by syncClanPerks), which is what the stat code reads.
//
// The real skills raise a stat of every member (Clan Body: max HP, Clan Might: attack ...); the ones whose effect
// this game has no use for (resist shock / hold / sleep, Clan Imperium ...) are learnable and listed, but give
// nothing. Residence and territory skills are given by castles and are not part of the clan's own tree.
import l2 from '../../../template/l2Classes.js';
import { hallModifiers, hallPerks } from './clanHall.js';

export const CLAN_PERK_REFRESH_MS = 10 * 60 * 1000;
/** The real reputation points of a level on this game's reputation rating (a clan's prestige, see calcReputationPoints.js). */
export const REPUTATION_SCALE = 0.5;
/** Gold from the clan warehouse per real reputation point. */
export const GOLD_PER_REPUTATION = 20;

/** Egg materials, kept in the clan warehouse. `drop` is the chance one epic boss kill gives it. */
export const CLAN_EGGS = Object.freeze({
    egg_wyvern: { name: 'Яйцо виверны', tier: 1 },
    egg_dragon: { name: 'Яйцо дракона', tier: 2 },
    egg_ancient: { name: 'Яйцо древнего дракона', tier: 3 },
});

// skill id -> [game stat, per level, who gets it: 'all' | 'fighters' | 'casters', label]
const EFFECTS = {
    370: ['maxHpMul', 0.025, 'all', 'Макс. HP'],
    371: ['maxMpMul', 0.025, 'all', 'Макс. MP'],
    372: ['maxCpMul', 0.03, 'all', 'Макс. CP'],
    373: ['hpRestoreSpeed', 0.3, 'all', 'Восст. HP'],
    374: ['mpRestoreSpeed', 0.2, 'all', 'Восст. MP'],
    375: ['cpRestoreSpeed', 0.3, 'all', 'Восст. CP'],
    376: ['attackMul', 0.015, 'fighters', 'Атака'],
    377: ['defenceMul', 0.02, 'fighters', 'Защита'],
    378: ['attackMul', 0.015, 'casters', 'Атака магии'],
    379: ['defenceMul', 0.02, 'casters', 'Защита от магии'],
    380: ['accuracy', 1, 'all', 'Точность'],
    381: ['evasion', 1, 'all', 'Уклонение'],
    382: ['block', 2, 'all', 'Блок щитом'],
    383: ['block', 2, 'all', 'Шанс блока'],
    384: ['incomingDamageModifier', -0.01, 'all', 'Получаемый урон'],
    385: ['incomingDamageModifier', -0.01, 'all', 'Получаемый урон'],
    389: ['speed', 2, 'all', 'Скорость'],
};
const POINTS = new Set(['accuracy', 'evasion', 'block', 'speed', 'hpRestoreSpeed', 'mpRestoreSpeed', 'cpRestoreSpeed']);
// the egg a level of the real tree needs, by the real item the level asks for (spiritual / purity items)
const EGG_BY_LEVEL = ['egg_wyvern', 'egg_dragon', 'egg_ancient'];
// the ids of the former custom clan skills
const OLD_IDS = {'clan-might': '376', 'clan-shield': '377', 'clan-vitality': '370', 'clan-precision': '380', 'clan-agility': '381'};

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

const rows = new Map();
for (const [id, level, clanLevel, reputation, items] of l2.clan) {
    const info = l2.skills[String(id)];
    if (!info || reputation <= 0) continue; // residence and territory skills are given by castles
    if (!rows.has(id)) rows.set(id, []);
    rows.get(id).push({
        level, clanLevel,
        reputation: Math.round(reputation * REPUTATION_SCALE),
        gold: reputation * GOLD_PER_REPUTATION,
        egg: EGG_BY_LEVEL[Math.min(EGG_BY_LEVEL.length - 1, level - 1)],
        eggs: 1,
        item: items[0]?.[0] ?? null,
    });
}

export const CLAN_SKILLS = Object.freeze([...rows.entries()].map(([skillId, levels]) => {
    const info = l2.skills[String(skillId)];
    const effect = EFFECTS[skillId];
    levels.sort((a, b) => a.level - b.level);
    return Object.freeze({
        id: String(skillId),
        name: info.name,
        text: effect ? effect[3] : 'Нет эффекта в игре',
        stat: effect ? effect[0] : null,
        per: effect ? effect[1] : 0,
        who: effect ? effect[2] : 'all',
        maxLevel: levels.length,
        levels: Object.freeze(levels),
    });
}).sort((a, b) => Number(a.id) - Number(b.id)));
export const CLAN_SKILL_MAX_LEVEL = Math.max(...CLAN_SKILLS.map(entry => entry.maxLevel));

const byId = id => CLAN_SKILLS.find(entry => entry.id === String(id));
const clampTo = (entry, value) => Math.max(0, Math.min(entry.maxLevel, Math.floor(number(value))));

export const clanSkillLevel = (clan, id) => {
    const entry = byId(id);
    if (!entry) return 0;
    const old = Object.keys(OLD_IDS).find(key => OLD_IDS[key] === entry.id);
    return clampTo(entry, Math.max(number(clan?.skills?.[entry.id]), old ? number(clan?.skills?.[old]) : 0));
};

const casterFamilies = new Set(['mage', 'priest']);

/** Stat deltas of the clan perks a member has right now. */
export function clanPerkModifiers(session) {
    const result = {};
    const perks = session?.game?.clanPerks;
    if (!perks || typeof perks !== 'object') return result;
    const family = session?.game?.gameClass?.stats?.family || null;
    const caster = family ? casterFamilies.has(family) : null;
    // the Clan Hall skills (hall:<key>) ride on the same copy
    for (const [stat, value] of Object.entries(hallModifiers(session))) result[stat] = (result[stat] || 0) + value;
    for (const entry of CLAN_SKILLS) {
        if (!entry.stat) continue;
        const level = clampTo(entry, perks[entry.id]);
        if (!level) continue;
        // a family is only known for classes of the new tree; an unknown one gets both kinds
        if (caster !== null && ((entry.who === 'fighters' && caster) || (entry.who === 'casters' && !caster))) continue;
        result[entry.stat] = (result[entry.stat] || 0) + entry.per * level;
    }
    return result;
}

/** Copies the clan's skill levels to the member's session; `clan` null clears them. Returns true when changed. */
export function syncClanPerks(session, clan, now = Date.now()) {
    if (!session?.game) return false;
    const next = {...hallPerks(clan)};
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

const bonusText = (entry, level) => {
    if (!entry.stat) return null;
    const amount = entry.per * level;
    if (POINTS.has(entry.stat)) return `+${Math.round(amount * 10) / 10}`;
    return `${amount > 0 ? '+' : '−'}${Math.round(Math.abs(amount) * 1000) / 10}%`;
};

export function getClanSkillsState(clan) {
    return {
        eggs: Object.entries(CLAN_EGGS).map(([key, egg]) => ({ key, name: egg.name, count: eggCount(clan, key) })),
        skills: CLAN_SKILLS.map(entry => {
            const level = clanSkillLevel(clan, entry.id);
            const cost = level < entry.maxLevel ? entry.levels[level] : null;
            const missing = [];
            if (cost) {
                if (number(clan?.level, 1) < cost.clanLevel) missing.push('clan_level');
                if (number(clan?.reputation) < cost.reputation) missing.push('reputation');
                if (number(clan?.warehouse?.gold) < cost.gold) missing.push('gold');
                if (eggCount(clan, cost.egg) < cost.eggs) missing.push('eggs');
            }
            return {
                id: entry.id, name: entry.name, stat: entry.text, level, maxLevel: entry.maxLevel,
                perLevel: entry.per, current: level ? bonusText(entry, level) : null, next: cost ? bonusText(entry, level + 1) : null,
                cost: cost ? { clanLevel: cost.clanLevel, reputation: cost.reputation, gold: cost.gold, egg: cost.egg, eggs: cost.eggs, eggName: CLAN_EGGS[cost.egg].name } : null,
                canLearn: Boolean(cost) && missing.length === 0, missing,
            };
        }),
    };
}

/** Raises a clan skill by a level, paying from the warehouse. The caller saves the clan. */
export function learnClanSkill(clan, id) {
    const entry = byId(id);
    if (!entry) return { ok: false, reason: 'unknown_skill' };
    const level = clanSkillLevel(clan, id);
    if (level >= entry.maxLevel) return { ok: false, reason: 'max_level' };
    const cost = entry.levels[level];
    if (number(clan.level, 1) < cost.clanLevel) return { ok: false, reason: 'clan_level_too_low', needLevel: cost.clanLevel };
    if (number(clan.reputation) < cost.reputation) return { ok: false, reason: 'not_enough_reputation' };
    if (!clan.warehouse) clan.warehouse = {};
    if (number(clan.warehouse.gold) < cost.gold) return { ok: false, reason: 'warehouse_insufficient' };
    if (eggCount(clan, cost.egg) < cost.eggs) return { ok: false, reason: 'not_enough_eggs', egg: cost.egg };

    clan.warehouse.gold = number(clan.warehouse.gold) - cost.gold;
    clan.warehouse[cost.egg] = eggCount(clan, cost.egg) - cost.eggs;
    if (!clan.skills || typeof clan.skills !== 'object') clan.skills = {};
    clan.skills[entry.id] = level + 1;
    return { ok: true, id: entry.id, level: level + 1, name: entry.name, message: `Клановый навык «${entry.name}» — уровень ${level + 1}.` };
}

/** Adds eggs to the clan warehouse (an epic boss kill). */
export function giveClanEggs(clan, key, count) {
    if (!CLAN_EGGS[key] || !clan) return false;
    if (!clan.warehouse) clan.warehouse = {};
    clan.warehouse[key] = eggCount(clan, key) + Math.max(0, Math.floor(number(count)));
    return true;
}
