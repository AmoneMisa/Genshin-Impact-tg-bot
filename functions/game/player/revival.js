// Resurrection (Lineage II): a Cleric, Bishop or Oracle brings a fallen player back (Resurrection), a Bishop a whole party
// (Mass Resurrection). The skills come from the real class trees (template/l2Classes.js): the real learn levels, mana and reuse.
//
// A player is fallen when the hp is gone or the respawn timer runs (huntFight.js isDead). The real skill returns a share of
// the lost experience; this game has no experience loss, so the share becomes the health the hero stands up with.
// Salvation and Soul of the Phoenix are the other half of High Five resurrection (the target comes back by itself when it
// dies, effect ResurrectionSpecial in l2Effects.js).
import l2 from '../../../template/l2Classes.js';
import { L2_CLASS_META } from '../../../template/l2ClassMeta.js';
import classStats from '../../../template/classStatsTemplate.js';
import { resolveClassName } from '../classes/legacyClasses.js';
import { partyState } from '../party/party.js';
import getCurrentHp from './getters/getCurrentHp.js';
import getCurrentMp from './getters/getCurrentMp.js';
import getMaxHp from './getters/getMaxHp.js';

export const REVIVE_SKILLS = Object.freeze({1016: {mass: false}, 1254: {mass: true}});
export const REVIVE_IDS = new Set(Object.keys(REVIVE_SKILLS).map(Number));
export const REVIVE_GROUP = 'Воскрешение';

const n = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

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

/** The revival skills of the class chain with the level the hero has reached: [{id, name, learned, max, firstLevelAt, nextLevelAt}]. */
export function revivalSkills(session) {
    const level = n(session?.game?.stats?.lvl, 1);
    const rows = new Map();
    for (const classId of chain(session)) {
        for (const [skillId, skillLevel, need] of l2.learn[String(classId)] || []) {
            if (!REVIVE_IDS.has(skillId)) continue;
            if (!rows.has(skillId)) rows.set(skillId, []);
            rows.get(skillId).push({level: skillLevel, need});
        }
    }
    return [...rows].map(([id, list]) => {
        list.sort((a, b) => a.level - b.level);
        const open = list.filter(row => row.need <= level);
        const next = list.find(row => row.need > level);
        return {
            id,
            info: l2.skills[String(id)],
            learned: open.at(-1)?.level || 0,
            max: list.at(-1).level,
            firstLevelAt: list[0].need,
            nextLevelAt: next?.need || null,
        };
    });
}

const at = (list, level) => (Array.isArray(list) ? list[Math.min(list.length, Math.max(1, level)) - 1] : 0);
/** The share of health the revived hero stands up with: from a quarter at level 1 to two thirds at the top level. */
export const reviveShare = (id, level) => Math.min(0.9, 0.25 + n(at(l2.skills[String(id)]?.power, level)) / 100 * 0.6);
export const reviveCost = (id, level) => Math.max(1, Math.round(n(at(l2.skills[String(id)]?.mp, level))));

export const isFallen = (member, now = Date.now()) => Boolean(member?.game?.gameClass?.stats) && (getCurrentHp(member) <= 0 || n(member.game.respawnTime) > now);

/** Rows for the buffs screen (same shape as the effect skills of l2Buffs.js). */
export function reviveEntries(session, now = Date.now()) {
    return revivalSkills(session).map(skill => {
        const level = Math.max(1, skill.learned);
        const share = Math.round(reviveShare(skill.id, level) * 100);
        const reuse = n(at(skill.info.reuse, level));
        return {
            id: `l2:${skill.id}`, name: skill.info.name, kind: 'buff', group: REVIVE_GROUP, level: skill.learned, maxLevel: skill.max,
            firstLevelAt: skill.firstLevelAt, nextLevelAt: skill.nextLevelAt,
            effect: `${REVIVE_SKILLS[skill.id].mass ? 'Воскрешает павших членов отряда' : 'Воскрешает павшего игрока'}: здоровье ${share}%`,
            seconds: 0, toggle: false, cost: reviveCost(skill.id, level), costOthers: reviveCost(skill.id, level),
            cooldownUntil: n(session?.game?.l2CastAt?.[skill.id]), reuseMs: reuse, active: null, revive: true,
        };
    });
}

/**
 * Casts a resurrection. `targetId` is the fallen player (a mass resurrection takes the whole party instead).
 * Returns {ok, ...} like castL2Buff: reasons are not_learned, player_dead, unknown_player, not_fallen, not_enough_mp, cooldown.
 */
export function castRevival(session, rawId, targetId = null, {now = Date.now()} = {}) {
    const id = Number(String(rawId).replace(/^l2:/, ''));
    const skill = revivalSkills(session).find(entry => entry.id === id && entry.learned > 0);
    if (!skill) return {ok: false, reason: 'not_learned'};
    if (isFallen(session, now)) return {ok: false, reason: 'player_dead'};
    if (n(session.game.l2CastAt?.[id]) > now) return {ok: false, reason: 'cooldown'};

    const chat = typeof session.ownerDocument === 'function' ? session.ownerDocument() : null;
    let fallen;
    if (REVIVE_SKILLS[id].mass) {
        // the fallen are not "party targets" of a buff (those are the living), so the whole party is looked at
        fallen = (chat ? partyState(chat, session)?.members || [] : []).filter(member => member !== session && isFallen(member, now));
        if (!fallen.length) return {ok: false, reason: 'not_fallen'};
    } else {
        const target = targetId == null || targetId === '' ? null : chat?.members?.find(member => String(member.userId) === String(targetId) && !member.userChatData?.user?.is_bot);
        if (!target || target === session) return {ok: false, reason: 'unknown_player'};
        if (!isFallen(target, now)) return {ok: false, reason: 'not_fallen'};
        fallen = [target];
    }

    const cost = reviveCost(id, skill.learned);
    if (getCurrentMp(session) < cost) return {ok: false, reason: 'not_enough_mp'};
    session.game.gameClass.stats.mp = getCurrentMp(session) - cost;
    session.game.l2CastAt ||= {};
    session.game.l2CastAt[id] = now + n(at(skill.info.reuse, skill.learned), 30000);

    const share = reviveShare(id, skill.learned);
    const revived = fallen.map(member => {
        const stats = member.game.gameClass.stats;
        const max = getMaxHp(member, member.game.gameClass);
        stats.hp = Math.max(1, Math.round(max * share));
        member.game.respawnTime = 0;
        delete member.game.l2PendingDeath;
        member.needsSave = true;
        return {userId: String(member.userId), name: member.userChatData?.user?.first_name || member.userChatData?.user?.username || String(member.userId), hp: stats.hp};
    });
    return {ok: true, buff: `l2:${id}`, level: skill.learned, revived, share, spent: cost, onSelf: false, changed: true, results: [], removed: 0};
}
