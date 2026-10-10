// The battle skill bar: a player chooses up to HOTBAR_MAX skills of the class kit (the kit grows with the profession) and
// keeps Life Stone and toggle skills on a second tab. The choice is session.game.hotbar = [skill index, ...] in the order
// the player put them.
import { skillById, equippedSkills, activateSkill } from '../equipment/lifestoneSkills.js';
import { uniqueEquipped } from '../equipment/itemBonuses.js';
import { classEffectSkills, l2EffectRows } from './l2Effects.js';

export const HOTBAR_MAX = 16;
const n = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

const kit = session => (Array.isArray(session?.game?.gameClass?.skills) ? session.game.gameClass.skills : []);

function clean(session, slots) {
    const total = kit(session).length;
    const toggles = new Set(classEffectSkills(session,{includeLocked:true}).filter(s=>s.operate==='T').map(s=>s.name));
    const seen = new Set();
    const result = [];
    for (const raw of Array.isArray(slots) ? slots : []) {
        const index = Number(raw);
        if (!Number.isInteger(index) || index < 0 || index >= total || seen.has(index) || toggles.has(kit(session)[index]?.name)) continue;
        seen.add(index);
        result.push(index);
        if (result.length >= HOTBAR_MAX) break;
    }
    return result;
}

/** The chosen skills in order; a player who never chose gets the first skills of the kit that fit. */
export function getHotbar(session) {
    const stored = clean(session, session?.game?.hotbar);
    if (stored.length) return stored;
    return clean(session,kit(session).map((_, index) => index));
}

/** Saves a choice: at least one and at most HOTBAR_MAX skills of the kit. */
export function setHotbar(session, slots) {
    const list = clean(session, slots);
    if (!list.length) return { ok: false, reason: 'empty_hotbar', hotbar: getHotbar(session) };
    if (Array.isArray(slots) && new Set(slots.map(Number)).size > HOTBAR_MAX) return { ok: false, reason: 'too_many', hotbar: getHotbar(session), max: HOTBAR_MAX };
    session.game.hotbar = list;
    return { ok: true, hotbar: list, max: HOTBAR_MAX };
}

/** The second tab: the active skill of the Life Stone of the worn weapon and the toggle skills of the class. */
export function specialSkills(session, now = Date.now()) {
    const rows = [];
    for (const { skill, level } of equippedSkills(session)) {
        if (skill.kind !== 'active') continue;
        const buff = session.game.lsBuff;
        const running = n(buff?.until) > now && buff?.id === skill.id;
        const cooldownMs = Math.max(0, n(buff?.readyAt) - now);
        rows.push({ type: 'ls', id: `ls:${skill.id}`, name: skill.name, level, running, cooldownMs, canUse: !running && cooldownMs <= 0 });
    }
    const active = new Set(l2EffectRows(session, now).map(row => row.id));
    for (const entry of classEffectSkills(session, { includeLocked: false })) {
        if (entry.operate !== 'T') continue;
        rows.push({ type: 'toggle', id: `l2:${entry.id}`, name: entry.name, level: entry.learnedLevel, running: active.has(`l2:${entry.id}`), cooldownMs: Math.max(0, n(session.game.l2CastAt?.[entry.id]) - now), canUse: true });
    }
    return rows;
}

/** Uses the Life Stone skill of the worn weapon (the toggles go through the buffs endpoint, castL2Buff). */
export function activateLifeStone(session, now = Date.now()) {
    for (const item of uniqueEquipped(session?.game?.equipmentStats || {})) {
        const skill = skillById(item?.augment?.skill?.id);
        if (skill?.kind === 'active' && item.mainType === 'weapon') return activateSkill(session, item, now);
    }
    return { ok: false, reason: 'no_active_skill' };
}
