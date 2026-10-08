// Self buffs cast by profession skills (skill.buffs, see classSkillsTemplate.js).
// They live in session.game.effects next to the shop potions, in two flavours:
//
//   charge based - reuse the effects calcDamage already understands, spent one
//     per attack (`count`): addDamageToBoss (%), addCritChanceToBoss (points),
//     addCritDamageToBoss (%)
//   timed        - guard (damage taken -x), taunt (boss prefers you), evade
//     (chance to dodge a boss hit), haste (skill cooldowns -x); each carries an
//     `until` timestamp and is ignored once it passes
import { getSkillPowerMultiplier } from './skillEnchant.js';
import { getRouteBonus } from './skillRoutes.js';

const CHARGE_EFFECT = Object.freeze({
    damage: 'addDamageToBoss',
    critChance: 'addCritChanceToBoss',
    critDamage: 'addCritDamageToBoss',
});

const TIMED_CAP = Object.freeze({guard: 0.8, evade: 0.75, haste: 0.5, taunt: 1});

function effectsOf(session) {
    if (!Array.isArray(session.game.effects)) session.game.effects = [];
    return session.game.effects;
}

function upsert(effects, effect) {
    const existing = effects.find(item => item?.name === effect.name);
    if (!existing) {
        effects.push(effect);
        return effect;
    }
    // A weaker or shorter recast never downgrades what is already active.
    existing.amount = Math.max(Number(existing.amount) || 0, effect.amount || 0);
    if (effect.count !== undefined) existing.count = Math.max(Number(existing.count) || 0, effect.count);
    if (effect.until !== undefined) existing.until = Math.max(Number(existing.until) || 0, effect.until);
    return existing;
}

/** Puts every buff of `skill` (or the given list) on the caster; returns what was applied. */
export function applySkillBuffs(session, skill, buffs = skill?.buffs, now = Date.now()) {
    const effects = effectsOf(session);
    const power = getSkillPowerMultiplier(skill);
    const applied = [];

    for (const buff of buffs || []) {
        if (CHARGE_EFFECT[buff.kind]) {
            applied.push(upsert(effects, {
                name: CHARGE_EFFECT[buff.kind],
                amount: Math.round(buff.amount * power * 10) / 10,
                count: buff.charges || 1,
            }));
        } else if (TIMED_CAP[buff.kind] !== undefined) {
            const amount = buff.kind === 'taunt' ? 1 : Math.min(TIMED_CAP[buff.kind], (buff.amount / 100) * power);
            applied.push(upsert(effects, {
                name: buff.kind,
                amount: Math.round(amount * 1000) / 1000,
                until: now + (buff.seconds || 10) * 1000 * (1 + getRouteBonus(skill).duration),
            }));
        }
    }
    return applied;
}

export function getTimedEffect(session, name, now = Date.now()) {
    const effect = (session?.game?.effects || []).find(item => item?.name === name);
    return effect && Number(effect.until) > now ? effect : null;
}

/** Share of boss damage the guard absorbs (0 – 0.8). */
export function guardReduction(session, now = Date.now()) {
    return Number(getTimedEffect(session, 'guard', now)?.amount) || 0;
}

export function isTaunting(session, now = Date.now()) {
    return Boolean(getTimedEffect(session, 'taunt', now));
}

/** Chance (0 – 0.75) that a boss hit misses the player. */
export function evadeChance(session, now = Date.now()) {
    return Number(getTimedEffect(session, 'evade', now)?.amount) || 0;
}

/** Share of every skill cooldown shaved off while haste is up (0 – 0.5). */
export function hasteReduction(session, now = Date.now()) {
    return Number(getTimedEffect(session, 'haste', now)?.amount) || 0;
}

/** Drops timed effects that ran out. */
export function pruneExpiredEffects(session, now = Date.now()) {
    if (!Array.isArray(session?.game?.effects)) return;
    session.game.effects = session.game.effects.filter(effect => !effect || effect.until === undefined || Number(effect.until) > now);
}
