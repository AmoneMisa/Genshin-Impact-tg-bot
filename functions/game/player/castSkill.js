import userDealDamage from './userDealDamage.js';
import {l2OnHostileAction, applyL2Effect, classEffectSkills} from './l2Effects.js';
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

/**
 * A kit skill that has a real High Five effect (skill.l2Cast) applies it: a buff to the caster (and the party for a party
 * buff), a debuff to the monster of the hunt (`l2Target`). Returns null when the real effect has no one to land on, so the
 * engine numbers of the skill are used instead.
 */
function castRealEffect(session, skill, {now = Date.now(), l2Target = null, random = Math.random} = {}) {
    const {id, hostile} = skill.l2Cast;
    const known = classEffectSkills(session).find(entry => entry.id === id);
    const level = Math.max(1, known?.learnedLevel || 1);
    if (hostile) {
        if (!l2Target || number(l2Target.currentHp, 1) <= 0) return null;
        const result = applyL2Effect(session, l2Target, id, level, {now, random});
        return {type: 'debuff', l2: id, name: skill.name, debuffs: [], resisted: Boolean(result.resisted), applied: Boolean(result.applied), until: result.until};
    }
    const party = known?.fields?.targetType === 'PARTY' && typeof session.ownerDocument === 'function' ? partyTargets(session.ownerDocument(), session) : [session];
    const audience = party.includes(session) ? party : [session, ...party];
    let applied = 0, until = null;
    for (const member of audience) {
        const result = applyL2Effect(session, member, id, level, {now, random});
        if (result.applied) applied += 1;
        until = result.until ?? until;
        if (member !== session) member.needsSave = true;
    }
    return {type: 'buff', l2: id, name: skill.name, buffs: [], applied, until};
}

function resolveSkill(session, boss, skill, options = {}) {
    const {targetId = null, now = Date.now()} = options;
    pruneExpiredEffects(session, now);

    if (skill.l2Cast && !skill.isDealDamage) {
        const real = castRealEffect(session, skill, options);
        if (real) return real;
    }

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
