// The Scryde Buffer and the special skills of that server (template/scrydeSpells.js): a spell table of real High Five buffs
// by character level, songs and dances at half power, Mana Refresh, the Symphonies of the bards and Mass Buff.
//
// The Buffer works only in a peaceful place and out of combat (not on the hunting field, not in a fight): a hero cannot
// buff in the middle of PvP. Every buff is the real effect (l2Effects.js) at its top level; the power of the songs and
// dances is `scale` of the real one (the record keeps it, l2RawStat applies it).
import {
    SPELL_TABLE, BUFFER_MIN_LEVEL, BUFFER_SECONDS, MANA_REFRESH, SYMPHONIES, SYMPHONY_SECONDS, BARD_CLASSES, MASS_BUFF_CLASSES,
} from '../../../template/scrydeSpells.js';
import { applyL2Effect, resolveEffectSkill } from './l2Effects.js';
import { getMaterialCount, spendMaterials } from './materials.js';
import { partyTargets } from '../party/party.js';
import isPlayerInFight from './isPlayerInFight.js';
import getCurrentHp from './getters/getCurrentHp.js';
import getCurrentMp from './getters/getCurrentMp.js';

export const SCRYDE_PREFIX = 'scryde:';
export const SCRYDE_GROUP = 'Баффер Scryde';
const n = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const className = session => session?.game?.gameClass?.stats?.name || 'noClass';
export const isScrydeId = id => String(id).startsWith(SCRYDE_PREFIX);

/** Not on the hunting field and not in a fight: the buffer will not work in the middle of a battle. */
export function peaceReason(session, now = Date.now()) {
    if (getCurrentHp(session) <= 0 || n(session?.game?.respawnTime) > now) return 'player_dead';
    if (session?.game?.hunt?.field || session?.game?.hunt?.mob) return 'not_peaceful';
    if (isPlayerInFight(session)) return 'in_combat';
    return null;
}

const topLevel = id => resolveEffectSkill(id, 99)?.level || 1;
const levelOf = session => n(session?.game?.stats?.lvl, 1);

export function manaRefreshLevel(session) {
    const level = levelOf(session);
    return MANA_REFRESH.levels.filter(row => level >= row.level).at(-1) || null;
}

function symphonyLevel(session, symphony) {
    return symphony.levels.filter(need => levelOf(session) >= need).length;
}

/** Rows for the buffs screen (same shape as the effect skills of l2Buffs.js). */
export function bufferEntries(session, now = Date.now()) {
    const level = levelOf(session);
    const rows = [];
    const active = Object.fromEntries((session?.game?.effects || []).filter(effect => effect.l2SkillId && n(effect.until) > now).map(effect => [effect.l2SkillId, effect]));
    for (const entry of SPELL_TABLE) {
        const open = level >= Math.max(BUFFER_MIN_LEVEL, entry.level);
        rows.push({
            id: `${SCRYDE_PREFIX}${entry.key}`, name: entry.name, kind: 'buff', group: `${SCRYDE_GROUP}: ${entry.group}`, level: open ? 1 : 0, maxLevel: 1,
            firstLevelAt: Math.max(BUFFER_MIN_LEVEL, entry.level), nextLevelAt: open ? null : Math.max(BUFFER_MIN_LEVEL, entry.level),
            effect: `${entry.text}${entry.scale < 1 ? ` (мощность ${Math.round(entry.scale * 100)}%)` : ''}${entry.items ? ' · 40 Spirit Ore' : ''}`,
            seconds: entry.seconds || BUFFER_SECONDS, toggle: false, cost: 0, costOthers: 0, cooldownUntil: 0,
            active: active[entry.id] ? {id: `l2:${entry.id}`, until: active[entry.id].until} : null, scryde: true,
        });
    }
    const refresh = manaRefreshLevel(session);
    rows.push({
        id: `${SCRYDE_PREFIX}${MANA_REFRESH.key}`, name: MANA_REFRESH.name, kind: 'buff', group: `${SCRYDE_GROUP}: ${MANA_REFRESH.group}`, level: refresh ? 1 : 0, maxLevel: 1,
        firstLevelAt: MANA_REFRESH.levels[0].level, nextLevelAt: refresh ? null : MANA_REFRESH.levels[0].level,
        effect: `Восстановление маны +${refresh ? refresh.bonus : MANA_REFRESH.levels[0].bonus} на час`, seconds: MANA_REFRESH.seconds, toggle: false, cost: 0, costOthers: 0, cooldownUntil: 0,
        active: n(session?.game?.scryde?.manaRefreshUntil) > now ? {id: `${SCRYDE_PREFIX}${MANA_REFRESH.key}`, until: session.game.scryde.manaRefreshUntil} : null, scryde: true,
    });
    if (BARD_CLASSES.includes(className(session))) {
        for (const symphony of SYMPHONIES) {
            const reached = symphonyLevel(session, symphony);
            rows.push({
                id: `${SCRYDE_PREFIX}${symphony.key}`, name: symphony.name, kind: 'buff', group: `${SCRYDE_GROUP}: Симфонии`, level: reached, maxLevel: symphony.levels.length,
                firstLevelAt: symphony.levels[0], nextLevelAt: symphony.levels.find(need => need > level) ?? null,
                effect: `${symphony.text} · 5 минут, заменяет песни и танцы`, seconds: SYMPHONY_SECONDS, toggle: false,
                cost: 60 * (symphony.parts[Math.max(0, reached - 1)]?.length || 1), costOthers: 0, cooldownUntil: n(session?.game?.scryde?.cast?.[symphony.key]), active: null, scryde: true,
            });
        }
    }
    return rows;
}

function setRecord(target, id, startedAt, patch) {
    const record = (target.game?.effects || []).find(effect => effect.l2SkillId === id && effect.startedAt === startedAt);
    if (record) Object.assign(record, patch);
    return record;
}

function audienceOf(session, party) {
    if (!party) return [session];
    const chat = typeof session.ownerDocument === 'function' ? session.ownerDocument() : null;
    return chat ? partyTargets(chat, session) : [session];
}

/**
 * Casts a buffer entry. `targetId` 'party' (Mass Buff of the Elders and the Prophet) buffs the whole party, anything else the hero.
 * Returns {ok, ...} like castL2Buff.
 */
export function castScryde(session, rawId, targetId = null, {now = Date.now(), random = Math.random} = {}) {
    const key = String(rawId).slice(SCRYDE_PREFIX.length);
    const block = peaceReason(session, now);
    if (block) return {ok: false, reason: block};
    const party = targetId === 'party';
    if (party && !MASS_BUFF_CLASSES.includes(className(session))) return {ok: false, reason: 'self_only'};

    if (key === MANA_REFRESH.key) {
        const row = manaRefreshLevel(session);
        if (!row) return {ok: false, reason: 'level_too_low'};
        const members = audienceOf(session, false);
        for (const member of members) {
            member.game.scryde = {...(member.game.scryde || {}), manaRefreshUntil: now + MANA_REFRESH.seconds * 1000, manaRefreshBonus: row.bonus};
        }
        return {ok: true, buff: rawId, level: 1, onSelf: true, until: now + MANA_REFRESH.seconds * 1000, spent: 0, results: [], removed: 0, changed: true};
    }

    const symphony = SYMPHONIES.find(entry => entry.key === key);
    if (symphony) {
        if (!BARD_CLASSES.includes(className(session))) return {ok: false, reason: 'not_learned'};
        const reached = symphonyLevel(session, symphony);
        if (!reached) return {ok: false, reason: 'level_too_low'};
        if (n(session.game.scryde?.cast?.[key]) > now) return {ok: false, reason: 'cooldown'};
        const parts = symphony.parts[reached - 1];
        const cost = 60 * parts.length;
        if (getCurrentMp(session) < cost) return {ok: false, reason: 'not_enough_mp'};
        session.game.gameClass.stats.mp = getCurrentMp(session) - cost;
        session.game.scryde = {...(session.game.scryde || {}), cast: {...(session.game.scryde?.cast || {}), [key]: now + 60 * 1000}};
        const members = audienceOf(session, true);
        for (const member of members) {
            for (const id of parts) {
                const result = applyL2Effect(session, member, id, topLevel(id), {now, random});
                if (result.applied) setRecord(member, id, now, {until: now + SYMPHONY_SECONDS * 1000, symphony: key});
            }
            if (member !== session) member.needsSave = true;
        }
        return {ok: true, buff: rawId, level: reached, onSelf: true, until: now + SYMPHONY_SECONDS * 1000, spent: cost, results: [], removed: 0, changed: true};
    }

    const entry = SPELL_TABLE.find(item => item.key === key);
    if (!entry) return {ok: false, reason: 'not_learned'};
    if (levelOf(session) < Math.max(BUFFER_MIN_LEVEL, entry.level)) return {ok: false, reason: 'level_too_low', needLevel: Math.max(BUFFER_MIN_LEVEL, entry.level)};
    if (entry.items) {
        for (const [item, count] of Object.entries(entry.items)) if (getMaterialCount(session, item) < count) return {ok: false, reason: 'not_enough_items', item};
    }
    if (entry.items) spendMaterials(session, entry.items);
    const seconds = entry.seconds || BUFFER_SECONDS;
    const members = audienceOf(session, party);
    let until = null;
    for (const member of members) {
        if (getCurrentHp(member) <= 0) continue;
        const result = applyL2Effect(session, member, entry.id, topLevel(entry.id), {now, random});
        if (result.applied) {
            setRecord(member, entry.id, now, {until: now + seconds * 1000, ...(entry.scale === 1 ? {} : {scale: entry.scale})});
            until = now + seconds * 1000;
        }
        if (member !== session) member.needsSave = true;
    }
    return {ok: true, buff: rawId, level: 1, onSelf: !party, until, spent: 0, results: [], removed: 0, changed: true, targets: members.length};
}

/** Mana Refresh as a stat delta: the extra mana regeneration while it lasts. */
export function scrydeModifiers(session, now = Date.now()) {
    const state = session?.game?.scryde;
    if (!state || n(state.manaRefreshUntil) <= now) return {};
    return {mpRestoreSpeed: n(state.manaRefreshBonus)};
}
