// Cubics (Lineage II): the Sorcerer, Warlock, Spellsinger and Phantom Summoner lines call small floating helpers for
// twenty minutes. The cubic skills come from the real class trees (template/l2Classes.js, effect SummonCubic): the real learn
// levels, mana and reuse. A hero keeps 1 + Cubic Mastery levels of them at once (the oldest one leaves when a new one comes).
//
// A cubic is a companion of the hero's attacks: every hit gets a share of its damage as a second blow, a Vampiric cubic
// returns a part of it as health, a Life cubic mends the owner a little with every blow. (The real cubics act on a timer of
// their own; here they follow the fight the hero is in.)
// Cubics live in session.game.cubics = [{id, level, until}].
import l2 from '../../../template/l2Classes.js';
import { L2_CLASS_META } from '../../../template/l2ClassMeta.js';
import classStats from '../../../template/classStatsTemplate.js';
import { resolveClassName } from '../classes/legacyClasses.js';
import getCurrentHp from './getters/getCurrentHp.js';
import getCurrentMp from './getters/getCurrentMp.js';
import getMaxHp from './getters/getMaxHp.js';
import { partyTargets } from '../party/party.js';

export const CUBIC_GROUP = 'Кубики';
export const CUBIC_MS = 20 * 60 * 1000;
export const CUBIC_MASTERY_SKILL = 143;
/** Share of the hit a cubic adds, by level of the skill (1..), and what else it does. */
const BASE_SHARE = 0.12;
const PER_LEVEL = 0.01;
const KINDS = [
    [/Vampiric/i, {drain: 0.4}],
    [/Life/i, {mend: 0.02, share: 0}],
    [/Attractive/i, {share: 0.05}],
];

const n = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export const CUBIC_IDS = new Set(Object.entries(l2.skills).filter(([, skill]) => (skill.effects || []).includes('SummonCubic')).map(([id]) => Number(id)));

function chain(session) {
    const name = resolveClassName(session?.game?.gameClass?.stats?.name || 'noClass');
    let id = classStats.find(item => item.name === name)?.l2Id;
    const ids = [];
    while (id !== null && id !== undefined && L2_CLASS_META[id] && !ids.includes(id)) {
        ids.push(id);
        id = L2_CLASS_META[id].parent;
    }
    return ids;
}

const at = (list, level) => (Array.isArray(list) ? list[Math.min(list.length, Math.max(1, level)) - 1] : 0);

/** What a cubic does: {share of the hit, drain, mend}. */
export function cubicTraits(name, level = 1) {
    const traits = {share: BASE_SHARE + PER_LEVEL * (level - 1), drain: 0, mend: 0};
    for (const [pattern, extra] of KINDS) if (pattern.test(name)) Object.assign(traits, extra);
    return traits;
}

/** The cubic skills of the class chain and the level the hero has reached. */
export function cubicSkills(session) {
    const level = n(session?.game?.stats?.lvl, 1);
    const rows = new Map();
    for (const classId of chain(session)) {
        for (const [skillId, skillLevel, need] of l2.learn[String(classId)] || []) {
            if (!CUBIC_IDS.has(skillId)) continue;
            if (!rows.has(skillId)) rows.set(skillId, []);
            rows.get(skillId).push({level: skillLevel, need});
        }
    }
    return [...rows].map(([id, list]) => {
        list.sort((a, b) => a.level - b.level);
        const open = list.filter(row => row.need <= level);
        return {id, info: l2.skills[String(id)], learned: open.at(-1)?.level || 0, max: list.at(-1).level, firstLevelAt: list[0].need, nextLevelAt: list.find(row => row.need > level)?.need || null};
    });
}

/** How many cubics a hero holds: one, and one more per level of Cubic Mastery it has learned. */
export function cubicLimit(session) {
    return 1 + Math.max(0, Math.floor(n(session?.game?.l2Passives?.[CUBIC_MASTERY_SKILL])));
}

export function activeCubics(session, now = Date.now()) {
    const list = Array.isArray(session?.game?.cubics) ? session.game.cubics : [];
    return list.filter(cubic => n(cubic.until) > now);
}

export const cubicCost = (id, level) => Math.max(1, Math.round(n(at(l2.skills[String(id)]?.mp, level))));

/** Rows for the buffs screen. */
export function cubicEntries(session, now = Date.now()) {
    const active = activeCubics(session, now);
    return cubicSkills(session).map(skill => {
        const level = Math.max(1, skill.learned);
        const traits = cubicTraits(skill.info.name, level);
        const running = active.find(cubic => cubic.id === skill.id);
        return {
            id: `l2:${skill.id}`, name: skill.info.name, kind: 'buff', group: CUBIC_GROUP, level: skill.learned, maxLevel: skill.max,
            firstLevelAt: skill.firstLevelAt, nextLevelAt: skill.nextLevelAt,
            effect: `Помощник: +${Math.round(traits.share * 100)}% к каждому удару${traits.drain ? `, ${Math.round(traits.drain * 100)}% урона возвращает здоровьем` : ''}${traits.mend ? `, лечит ${Math.round(traits.mend * 100)}% HP за удар` : ''}`,
            seconds: CUBIC_MS / 1000, toggle: false, cost: cubicCost(skill.id, level), costOthers: cubicCost(skill.id, level),
            cooldownUntil: n(session?.game?.l2CastAt?.[skill.id]),
            active: running ? {id: `l2:${skill.id}`, until: running.until} : null, cubic: true,
        };
    });
}

export function castCubic(session, rawId, {now = Date.now()} = {}) {
    const id = Number(String(rawId).replace(/^l2:/, ''));
    const skill = cubicSkills(session).find(entry => entry.id === id && entry.learned > 0);
    if (!skill) return {ok: false, reason: 'not_learned'};
    if (getCurrentHp(session) <= 0 || n(session.game.respawnTime) > now) return {ok: false, reason: 'player_dead'};
    if (n(session.game.l2CastAt?.[id]) > now) return {ok: false, reason: 'cooldown'};
    const cost = cubicCost(id, skill.learned);
    if (getCurrentMp(session) < cost) return {ok: false, reason: 'not_enough_mp'};

    session.game.gameClass.stats.mp = getCurrentMp(session) - cost;
    session.game.l2CastAt ||= {};
    session.game.l2CastAt[id] = now + Math.min(60000, n(at(skill.info.reuse, skill.learned), 5000));
    const give = member => {
        const list = activeCubics(member, now).filter(cubic => cubic.id !== id);
        list.push({id, level: skill.learned, until: now + CUBIC_MS});
        // the oldest cubics leave when there are more than the hero can hold
        list.sort((a, b) => a.until - b.until);
        while (list.length > cubicLimit(member)) list.shift();
        member.game.cubics = list;
        return list;
    };
    const list = give(session);
    // "Mass Summon ... Cubic": the whole party gets the cubic as well
    const chat = typeof session.ownerDocument === 'function' ? session.ownerDocument() : null;
    if (/^Mass /.test(skill.info.name) && chat) {
        for (const member of partyTargets(chat, session)) {
            if (member === session || getCurrentHp(member) <= 0) continue;
            give(member);
            member.needsSave = true;
        }
    }
    return {ok: true, buff: `l2:${id}`, level: skill.learned, summoned: true, cubic: true, until: now + CUBIC_MS, spent: cost, onSelf: true, results: [], removed: 0, changed: true, cubics: list.length};
}

/**
 * The blow a hero's cubics add to a hit of `damage`, and the health they give back: {damage, healed}. Called once per hit.
 */
export function cubicDamage(session, damage, now = Date.now()) {
    if (!(damage > 0)) return {damage: 0, healed: 0};
    let extra = 0, healed = 0;
    const stats = session?.game?.gameClass?.stats;
    const max = stats ? getMaxHp(session) : 0;
    for (const cubic of activeCubics(session, now)) {
        const traits = cubicTraits(l2.skills[String(cubic.id)]?.name || '', cubic.level);
        const blow = Math.floor(damage * traits.share);
        extra += blow;
        if (stats) healed += Math.floor(blow * traits.drain) + Math.floor(max * traits.mend);
    }
    if (stats && healed > 0) stats.hp = Math.min(max, n(stats.hp) + healed);
    return {damage: extra, healed};
}
