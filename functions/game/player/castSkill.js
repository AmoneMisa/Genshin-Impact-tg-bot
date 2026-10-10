import userDealDamage from './userDealDamage.js';
import {l2OnHostileAction} from './l2Effects.js';
import {applySoulSpell} from '../equipment/soulCrystalCombat.js';
import {partyTargets} from '../party/party.js';
import useHealSkill from './useHealSkill.js';
import useShieldSkill from './useShieldSkill.js';
import getMaxHp from './getters/getMaxHp.js';
import getMaxMp from './getters/getMaxMp.js';
import { applySkillBuffs, pruneExpiredEffects } from './skillEffects.js';
import { getRouteBonus } from './skillRoutes.js';
import { applyBossDebuff } from '../boss/bossDebuffs.js';
import { advanceBossPhases } from '../boss/bossPhases.js';

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

function restoreMana(session, share) {
    const stats = session.game.gameClass.stats;
    const max = getMaxMp(session, session.game.gameClass);
    const before = number(stats.mp);
    stats.mp = Math.min(max, before + Math.ceil(max * share));
    return stats.mp - before;
}

/**
 * Resolves one skill use (cost and cooldown are paid by the caller). Returns a
 * result with a `type`:
 *   damage  - see userDealDamage
 *   heal / shield - {heal} / {shield}, shields may also return mana
 *   buff    - {buffs: [...]} on yourself
 *   debuff  - {debuffs: [...]} on the boss
 *   restore - {restoredMp}
 */
/** A buff skill reaches the whole party of the caster: the same buffs, at the caster's skill level. */
function shareBuffsWithParty(session, skill, now) {
    if (!session?.game?.party?.id || typeof session.ownerDocument !== 'function') return [];
    if (!skill.buffs?.length || skill.isDealDamage) return [];
    const shared = [];
    for (const member of partyTargets(session.ownerDocument(), session)) {
        if (member === session) continue;
        applySkillBuffs(member, skill, skill.buffs, now);
        member.needsSave = true;
        shared.push(String(member.userId));
    }
    return shared;
}

export default function castSkill(session, boss, skill, options = {}) {
    if(skill.isDealDamage||skill.debuff||skill.debuffs?.length)l2OnHostileAction(session,options.now??Date.now());
    const result = resolveSkill(session, boss, skill, options);
    const party = shareBuffsWithParty(session, skill, options.now ?? Date.now());
    if (party.length) result.party = party;
    applySoulSpell(session,skill,options.now??Date.now());
    // Route bonuses that apply to any kind of skill.
    const route = getRouteBonus(skill);
    const now = options.now ?? Date.now();
    if (route.guard > 0) {
        applySkillBuffs(session, {...skill, enchantLevel: 0, routeKind: undefined}, [{kind: 'guard', amount: route.guard * 100, seconds: route.guardSeconds}], now);
        result.guard = route.guard;
    }
    if (route.mpRestore > 0 && !skill.isDealDamage) {
        result.routeMp = restoreMana(session, route.mpRestore);
    }
    return result;
}

function resolveSkill(session, boss, skill, {targetId = null, now = Date.now()} = {}) {
    pruneExpiredEffects(session, now);

    if (skill.isDealDamage) {
        return {type: 'damage', ...userDealDamage(session, boss, skill, {targetId, now})};
    }

    if (skill.isHeal) {
        const heal = useHealSkill(session, skill);
        const stats = session.game.gameClass.stats;
        stats.hp = Math.min(getMaxHp(session, session.game.gameClass), number(stats.hp) + heal);
        return {type: 'heal', heal};
    }

    if (skill.isShield) {
        const shield = useShieldSkill(session, skill);
        if (!Array.isArray(session.game.effects)) session.game.effects = [];
        const shieldEffect = session.game.effects.find(effect => effect.name === 'shield');
        if (shieldEffect) shieldEffect.value = shield;
        else session.game.effects.push({name: 'shield', value: shield, time: 0});
        const result = {type: 'shield', shield};
        if (skill.restoreMp) result.restoredMp = restoreMana(session, skill.restoreMp);
        return result;
    }

    // Everything else: buffs, debuffs on the boss, mana restore - or a mix.
    const result = {type: skill.isBuff ? 'buff' : 'utility'};
    if (skill.buffs?.length) {
        result.buffs = applySkillBuffs(session, skill, skill.buffs, now).map(({name, amount, count, until}) => ({name, amount, count, until}));
    }
    if (skill.shieldPower) {
        const shield = useShieldSkill(session, skill);
        if (!Array.isArray(session.game.effects)) session.game.effects = [];
        const shieldEffect = session.game.effects.find(effect => effect.name === 'shield');
        if (shieldEffect) shieldEffect.value = shield;
        else session.game.effects.push({name: 'shield', value: shield, time: 0});
        result.shield = shield;
    }
    if (skill.debuff && boss) {
        const power = (1 + 0.05 * (skill.enchantLevel || 0)) * (1 + getRouteBonus(skill).debuff);
        result.type = 'debuff';
        result.debuffs = [applyBossDebuff(boss, skill.debuff, now, power, getRouteBonus(skill).duration)].filter(Boolean);
        result.events = advanceBossPhases(boss, now);
    }
    if (skill.restoreMp) {
        result.type = 'restore';
        result.restoredMp = restoreMana(session, skill.restoreMp);
    }
    return result;
}
