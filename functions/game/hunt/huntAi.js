// Encounter behaviour on our combat scale; NPC stats and drops remain the HF source data.
export const AI_ROLES = ['fighter', 'healer', 'mage'];
export const AI_LABELS = {fighter: 'Воин', healer: 'Целитель', mage: 'Маг'};
import {isBossStunned} from '../boss/bossDebuffs.js';

export function huntDebuff(session, kind, now) {
    return (session.game.hunt?.playerDebuffs || []).find(e => e.kind === kind && e.until > now)?.amount || 0;
}

export function mobBuff(mob, kind, now) {
    return (mob.buffs || []).find(e => e.kind === kind && e.until > now)?.amount || 0;
}

export function aggroNearby(hunt, now) {
    for (const mob of hunt.field?.mobs || []) {
        if (mob.currentHp <= 0 || mob.aggro || !mob.aggressive) continue;
        const distance = Math.hypot(mob.x - hunt.field.x, mob.y - hunt.field.y);
        if (distance <= .33) {
            mob.aggro = true;
            mob.nextAttackAt = now + mob.attackMs;
            mob.lastMoveAt = now;
        }
    }
}

export function provokeMob(hunt, target, now) {
    for (const mob of hunt.field?.mobs || []) {
        if (mob.currentHp <= 0 || mob.aggro) continue;
        if (mob === target || Math.hypot(mob.x - target.x, mob.y - target.y) <= .4) {
            mob.aggro = true;
            mob.nextAttackAt = now + mob.attackMs;
            mob.lastMoveAt = now;
        }
    }
}

export function pursuePlayer(hunt, now) {
    let moved = false;
    for (const mob of hunt.field?.mobs || []) {
        if (!mob.aggro || mob.currentHp <= 0) continue;
        const seconds = Math.max(0, Math.min(5, (now - (mob.lastMoveAt ?? now)) / 1000));
        mob.lastMoveAt = now;
        if (isBossStunned(mob, now)) continue;
        const dx = hunt.field.x - mob.x, dy = hunt.field.y - mob.y, distance = Math.hypot(dx, dy);
        const stop = mob.ai === 'mage' ? .4 : .2;
        const step = Math.min(Math.max(0, distance - stop), seconds * .09);
        if (step > 0) {mob.x += dx / distance * step; mob.y += dy / distance * step; moved = true;}
    }
    return moved;
}

export function canMobReach(hunt, mob) {
    if (!hunt.field || !mob.ai) return true;
    return Math.hypot(mob.x - hunt.field.x, mob.y - hunt.field.y) <= (mob.ai === 'mage' ? .45 : .26);
}

/** One scheduled turn, interrupted by stun/silence in the fight loop. */
export function mobAiTurn(session, mob, at, note) {
    if (!mob.ai) return false;
    mob.buffs = (mob.buffs || []).filter(e => e.until > at);
    mob.turn = (mob.turn || 0) + 1;
    if (at < (mob.nextAbilityAt || 0)) return false;
    const allies = session.game.hunt.field?.mobs || [mob];
    if (mob.ai === 'healer') {
        const ally = allies.filter(m => m.currentHp > 0 && m.currentHp < m.hp * .75).sort((a, b) => a.currentHp / a.hp - b.currentHp / b.hp)[0];
        if (ally) {
            const heal = Math.min(ally.hp - ally.currentHp, Math.round(ally.hp * .12));
            ally.currentHp += heal;
            mob.nextAbilityAt = at + 16000;
            note('✚', `${mob.name} лечит ${ally.name}: +${heal} HP.`);
            return true;
        }
    }
    if (mob.ai === 'mage' && mob.turn % 3 === 0) {
        const hunt = session.game.hunt;
        hunt.playerDebuffs = (hunt.playerDebuffs || []).filter(e => e.until > at && e.kind !== 'weaken');
        hunt.playerDebuffs.push({kind: 'weaken', amount: .15, until: at + 8000});
        mob.nextAbilityAt = at + 18000;
        note('✦', `${mob.name} ослабляет твои атаки на 15%.`);
        return true;
    }
    if (!mobBuff(mob, 'power', at)) {
        mob.buffs.push({kind: 'power', amount: .15, until: at + 12000});
        mob.nextAbilityAt = at + 22000;
        note('↑', `${mob.name} усиливает свои атаки на 15%.`);
        return true;
    }
    return false;
}
