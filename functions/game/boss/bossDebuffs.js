// Debuffs that player skills put on a boss (skill.debuff, see classSkillsTemplate.js):
//   armorBreak - the boss's defence drops by x% for a while
//   weaken     - the boss deals x% less damage for a while
//   stun       - the boss skips its casts and any ultimate it was charging is
//                interrupted. A stunned boss shrugs off further stuns for a
//                while, so it cannot be chain-locked.
export const STUN_IMMUNITY_MS = 20 * 1000;
const AMOUNT_CAP = {armorBreak: 0.6, weaken: 0.5,slow:0.5,accuracyDown:0.5,mute:1};

function mark(boss, field) {
    boss.markModified?.(field);
}

/**
 * Applies one debuff. Returns {kind, applied, resisted?, interrupted?} so the
 * caller can tell the player what happened.
 */
export function applyBossDebuff(boss, debuff, now = Date.now(), power = 1, durationBonus = 0) {
    if (!boss || !debuff?.kind) return null;

    if (debuff.kind === 'stun') {
        if (Number(boss.stunImmuneUntil) > now) return {kind: 'stun', applied: false, resisted: true};
        const until = now + (debuff.seconds || 3) * 1000 * (1 + durationBonus);
        boss.stunUntil = Math.max(Number(boss.stunUntil) || 0, until);
        boss.stunImmuneUntil = boss.stunUntil + STUN_IMMUNITY_MS;
        const interrupted = Boolean(boss.charging);
        boss.charging = null;
        mark(boss, 'charging');
        return {kind: 'stun', applied: true, seconds: debuff.seconds || 3, interrupted};
    }

    if (!(debuff.kind in AMOUNT_CAP)) return null;
    const amount = Math.min(AMOUNT_CAP[debuff.kind], (debuff.amount / 100) * power);
    const until = now + (debuff.seconds || 10) * 1000 * (1 + durationBonus);
    const list = Array.isArray(boss.debuffs) ? boss.debuffs.filter(item => Number(item.until) > now) : [];
    const existing = list.find(item => item.kind === debuff.kind);
    if (existing) {
        existing.amount = Math.max(existing.amount, amount);
        existing.until = Math.max(existing.until, until);
    } else {
        list.push({kind: debuff.kind, amount, until});
    }
    boss.debuffs = list;
    mark(boss, 'debuffs');
    return {kind: debuff.kind, applied: true, amount, seconds: debuff.seconds || 10};
}

/** Current strength (0 – cap) of a timed debuff. */
export function bossDebuffAmount(boss, kind, now = Date.now()) {
    const found = (boss?.debuffs || []).find(item => item.kind === kind && Number(item.until) > now);
    return found ? Number(found.amount) || 0 : 0;
}

export function isBossStunned(boss, now = Date.now()) {
    return Number(boss?.stunUntil) > now;
}

/** Display rows for the HUD. */
export function bossDebuffList(boss, now = Date.now()) {
    const rows = (boss?.debuffs || [])
        .filter(item => Number(item.until) > now)
        .map(item => ({kind: item.kind, amount: item.amount, remainMs: Number(item.until) - now}));
    if (isBossStunned(boss, now)) rows.push({kind: 'stun', amount: 0, remainMs: Number(boss.stunUntil) - now});
    return rows;
}
