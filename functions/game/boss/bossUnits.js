// A boss encounter is more than the boss: `boss.minions` holds the add units
// that fight beside it (see `minions` / `initial` / `phases` in bossTemplate.js).
//
//   minion  - small add. While any live, `combat.armored` of the damage dealt
//             to the boss is ignored, so clearing adds matters.
//   head / partner - `required`: the boss cannot drop below 1 hp until every
//             required unit is dead (heads of a hydra, the twin of a pair).
//             When a partner falls the boss reacts (`onDeath`: enrage / heal).
import bossTemplates from '../../../template/bossTemplate.js';

export const MINION_DEFAULT_DROPS = Object.freeze([{item: 'skill_scroll', chance: 0.06, min: 1, max: 1}]);

export function bossTemplateFor(boss) {
    return bossTemplates.find(item => item.name === boss?.name) || null;
}

export function aliveUnits(boss) {
    return (boss?.minions || []).filter(unit => unit.currentHp > 0);
}

export function aliveRequiredUnits(boss) {
    return aliveUnits(boss).filter(unit => unit.required);
}

/** Spawns minions by template key; returns the units added. */
export function spawnMinions(boss, keys, now = Date.now(), template = bossTemplateFor(boss)) {
    if (!template || !Array.isArray(keys) || !keys.length) return [];
    if (!Array.isArray(boss.minions)) boss.minions = [];

    const added = [];
    for (const key of keys) {
        const def = (template.minions || []).find(item => item.key === key);
        if (!def) continue;
        const hp = Math.max(1, Math.round((Number(boss.hp) || 0) * def.hpPct));
        added.push({
            id: `${key}-${now.toString(36)}-${boss.minions.length + added.length}`,
            key: def.key,
            name: def.name,
            icon: def.icon,
            kind: def.kind || 'minion',
            required: Boolean(def.required),
            hp,
            currentHp: hp,
            power: def.power ?? 0.5,
            defMul: def.defMul ?? 1,
            attackKey: def.attackKey || null,
            description: def.description || '',
            nextAttackAt: now + 4000 + added.length * 700,
        });
    }
    boss.minions.push(...added);
    boss.markModified?.('minions');
    return added;
}

export function findUnit(boss, id) {
    return (boss?.minions || []).find(unit => unit.id === id && unit.currentHp > 0) || null;
}

/** Share of damage the boss ignores because its minions shield it. */
export function armorShield(boss, template = bossTemplateFor(boss)) {
    const armored = Number(template?.combat?.armored) || 0;
    if (!armored) return 0;
    return aliveUnits(boss).some(unit => !unit.required) ? armored : 0;
}

/**
 * The boss's hp after taking damage, with the "required units" lock: it stays
 * at 1 hp while a head or a twin is still alive. Returns whether the lock held.
 */
export function lockBossHp(boss) {
    if (boss.currentHp <= 0 && aliveRequiredUnits(boss).length) {
        boss.currentHp = 1;
        return true;
    }
    return false;
}

/**
 * Hurts one unit. Returns {killed, unit, reaction} where `reaction` is what the
 * boss does about a fallen partner (enrage / heal), already applied to `boss`.
 */
export function damageUnit(boss, unit, dmg, template = bossTemplateFor(boss)) {
    unit.currentHp = Math.max(0, unit.currentHp - dmg);
    boss.markModified?.('minions');
    if (unit.currentHp > 0) return {killed: false, unit, reaction: null};

    const def = (template?.minions || []).find(item => item.key === unit.key);
    let reaction = null;
    if (def?.onDeath) {
        const {enrage = 0, heal = 0, say = ''} = def.onDeath;
        if (enrage) boss.enrage = (Number(boss.enrage) || 0) + enrage;
        if (heal) boss.currentHp = Math.min(boss.hp, boss.currentHp + Math.round(boss.hp * heal));
        reaction = {enrage, heal, say};
    }
    return {killed: true, unit, reaction};
}

/** Per-fighter extras for the kill: sp and material rolls (plain data, no side effects). */
export function unitRewards(unit, template, random = Math.random) {
    const def = (template?.minions || []).find(item => item.key === unit.key);
    const [spMin, spMax] = def?.sp || [0, 0];
    const sp = spMax > 0 ? spMin + Math.floor(random() * (spMax - spMin + 1)) : 0;
    const items = [];
    for (const drop of [...MINION_DEFAULT_DROPS, ...(def?.drops || [])]) {
        if (random() < drop.chance) {
            items.push({item: drop.item, amount: drop.min + Math.floor(random() * (drop.max - drop.min + 1))});
        }
    }
    return {sp, items};
}
