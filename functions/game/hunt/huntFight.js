// A real-time fight with one mob of a hunting zone. The mob lives in session.game.hunt.mob and swings
// every few seconds; the swings that fell due since the last request are applied when the player
// acts or the screen refreshes (nothing runs in the background). The player casts skills (cost,
// cooldown, shots as in a boss fight) and drinks potions through the normal inventory route.
import { CHAMPIONS, HUNT } from './huntConfig.js';
import {tickSoulDots} from '../equipment/soulCrystalCombat.js';
import { buildMob, getMobDef, getZone, heroStats } from './huntMobs.js';
import { grantKillRewards } from './huntRewards.js';
import castSkill from '../player/castSkill.js';
import isPlayerCanUseSkill from '../player/isPlayerCanUseSkill.js';
import skillUsagePayCost from '../player/skillUsagePayCost.js';
import setSkillCooldown from '../player/setSkillCooldown.js';
import getMaxHp from '../player/getters/getMaxHp.js';
import getCurrentHp from '../player/getters/getCurrentHp.js';
import getDefence from '../player/getters/getDefence.js';
import getIncomingDamageModifier from '../player/getters/getIncomingDamageModifier.js';
import damageMitigation from '../player/damageMitigation.js';
import { getEffectiveSkillCost } from '../player/skillEnchant.js';
import { evadeChance, guardReduction } from '../player/skillEffects.js';
import { bossDebuffAmount, isBossStunned } from '../boss/bossDebuffs.js';
import { attributeProfile, resistFactor } from '../equipment/attributes.js';
import { armShots, clearShots } from '../shots/shots.js';
import { recordQuestEvent } from '../classes/classQuests.js';
import { AI_ROLES, AI_LABELS, aggroNearby, provokeMob, mobBuff, mobAiTurn, pursuePlayer, canMobReach } from './huntAi.js';
import {fieldPvpSkillBlock,reduceHuntKarma,fieldPvpEffect} from './fieldPvpState.js';

// A mob that was not attacked for this long loses interest and leaves.
export const IDLE_MS = 2 * 60 * 1000;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export function ensureHunt(session) {
    const game = session.game;
    if (!game.hunt || typeof game.hunt !== 'object') game.hunt = {zone: null, mob: null, kills: 0, log: []};
    if (!Array.isArray(game.hunt.log)) game.hunt.log = [];
    if (game.hunt.field) game.hunt.mob = game.hunt.field.mobs.find(m => m.instanceId === game.hunt.field.target) || null;
    return game.hunt;
}

function pushLog(hunt, icon, text, now) {
    hunt.log = [{at: now, icon, text}, ...hunt.log].slice(0, HUNT.logSize);
}

/** castSkill() wants a boss: give the stored mob the one method it calls (not saved with it). */
function asBoss(mob) {
    if (typeof mob.markModified !== 'function') Object.defineProperty(mob, 'markModified', {value() {}, enumerable: false, configurable: true, writable: true});
    return mob;
}

const isDead = (session, now) => getCurrentHp(session, session.game.gameClass) <= 0 || number(session.game.respawnTime) > now;

/** One swing of the mob at the hero: the damage after defence, element resistance, debuffs and guard. */
export function mobHit(session, mob, now, random = Math.random) {
    const gameClass = session.game.gameClass;
    const level = Math.max(1, number(session.game.stats?.lvl, 1));
    const gap = clamp(mob.level - level, HUNT.levelHitMin, HUNT.levelHitMax);
    const base = getMaxHp(session, gameClass) * HUNT.hitPct / 100 * mob.hunt.atk * (1 + HUNT.levelHitStep * gap);
    const mitigation = damageMitigation(getDefence(session, gameClass) * (1-fieldPvpEffect(session,'armorBreak',now)), level);
    const incoming = getIncomingDamageModifier(session, gameClass);
    const weaken = 1 - bossDebuffAmount(mob, 'weaken', now);
    const resist = resistFactor(attributeProfile(session).resist, mob.hunt.element);
    const spread = 0.9 + random() * 0.2;
    const crit = random() < 0.05 ? 1.5 : 1;
    return Math.max(1, Math.round(base * mitigation * incoming * weaken * resist * spread * crit * (1 + mobBuff(mob, 'power', now))));
}

/** Shield first, then HP; a hero at 0 HP starts the respawn timer. */
function applyHit(session, dmg, now) {
    const stats = session.game.gameClass.stats;
    stats.hp = Math.min(number(stats.hp), getMaxHp(session, session.game.gameClass));
    const shield = (session.game.effects || []).find(effect => effect.name === 'shield' && effect.value > 0);
    const absorbed = shield ? Math.min(shield.value, dmg) : 0;
    if (shield) shield.value -= absorbed;
    const lost = Math.min(stats.hp, dmg - absorbed);
    stats.hp = Math.max(0, stats.hp - lost);
    const killed = stats.hp === 0;
    if (killed) session.game.respawnTime = now + HUNT.respawnMs;
    return {absorbed, lost, killed};
}

/**
 * Applies the mob's swings that fell due up to `now`. Returns the log rows it wrote. A mob left alone
 * for IDLE_MS walks away; a hero that dies ends the fight.
 */
export function advanceHunt(session, now = Date.now(), random = Math.random) {
    const hunt = ensureHunt(session);
    if (!hunt.field) return advanceSingleHunt(session, now, random);
    if (now - number(hunt.lastActionAt) > IDLE_MS) {
        hunt.field = null;
        hunt.mob = null;
        pushLog(hunt, '💨', 'Ты покинул поле боя после долгого бездействия.', now);
        return [{text: 'Поле боя покинуто.'}];
    }
    aggroNearby(hunt, now);
    pursuePlayer(hunt, now);
    const selected = hunt.field.target;
    const written = [];
    for (const mob of [...hunt.field.mobs]) {
        if (!mob.aggro || mob.currentHp <= 0) continue;
        hunt.mob = mob;
        written.push(...advanceSingleHunt(session, now, random));
        if (isDead(session, now)) { hunt.field = null; hunt.mob = null; return written; }
    }
    // Re-select a surviving actor after a kill; selecting alone never provokes it.
    hunt.field.target = hunt.field.mobs.some(m => m.instanceId === selected) ? selected : hunt.field.mobs[0]?.instanceId || null;
    hunt.mob = hunt.field.mobs.find(m => m.instanceId === hunt.field.target) || null;
    return written;
}

function advanceSingleHunt(session, now = Date.now(), random = Math.random) {
    const hunt = session.game.hunt;
    const mob = hunt.mob;
    if (!mob) return [];
    const written = [];
    const note = (icon, text) => { pushLog(hunt, icon, text, now); written.push({icon, text}); };

    if (now - Math.max(number(hunt.lastActionAt), number(mob.spawnedAt)) > IDLE_MS) {
        hunt.mob = null;
        note('💨', `${mob.name} ушёл — ты долго не нападал.`);
        return written;
    }
    if (isDead(session, now)) return written;
    const dotDamage=tickSoulDots(mob,now);
    if(dotDamage)note('🩸',`Эффект SA: −${dotDamage} HP у ${mob.name}.`);
    if(mob.currentHp<=0){finishKill(session,hunt,mob,{random,now});note('🏆',`${mob.name} повержен эффектом SA.`);return written;}

    let swings = 0;
    while (mob.currentHp > 0 && mob.nextAttackAt <= now && swings < HUNT.maxCatchUp) {
        const at = mob.nextAttackAt;
        mob.nextAttackAt = at + mob.attackMs / (1-bossDebuffAmount(mob,'slow',at));
        swings++;
        if (isBossStunned(mob, at)) { note('💫', `${mob.name} оглушён и пропускает удар.`); continue; }
        if(mob.hunt?.magic&&bossDebuffAmount(mob,'mute',at)>0)continue;
        if (bossDebuffAmount(mob, 'mute', at) <= 0 && mobAiTurn(session, mob, at, note)) continue;
        if (!canMobReach(hunt, mob)) continue;
        if (random() < Math.min(.75,evadeChance(session, at)+bossDebuffAmount(mob,'accuracyDown',at))) { note('💨', `Ты уклонился от удара ${mob.name}.`); continue; }
        const raw = mobHit(session, mob, at, random);
        const dmg = Math.max(1, Math.round(raw * (1 - guardReduction(session, at))));
        const hit = applyHit(session, dmg, at);
        note('⚔️', `${mob.name} бьёт: −${hit.lost + hit.absorbed}${hit.absorbed ? ` (щит ${hit.absorbed})` : ''}`);
        if (hit.killed) {
            hunt.mob = null;
            note('💀', `${mob.name} победил тебя. Ты воскреснешь через минуту.`);
            return written;
        }
    }
    // Swings still overdue after the cap are dropped: a pause is not a stack of hits.
    if (mob.nextAttackAt <= now) mob.nextAttackAt = now + mob.attackMs;
    return written;
}

/** Starts a fight in a zone (a random mob of it unless `mobId` names one). */
export function startHunt(session, zoneId, {now = Date.now(), random = Math.random, mobId = null, champion} = {}) {
    const zone = getZone(zoneId);
    if (!zone) return {ok: false, reason: 'unknown_zone'};
    const hunt = ensureHunt(session);
    advanceHunt(session, now, random);
    if (hunt.mob || hunt.field) return {ok: false, reason: 'already_fighting'};
    if (isDead(session, now)) return {ok: false, reason: 'dead'};
    if (!session.game.gameClass?.skills?.length) return {ok: false, reason: 'no_combat_class'};

    const mobDef = mobId ? getMobDef(zone, mobId) : zone.mobs[Math.min(zone.mobs.length - 1, Math.floor(random() * zone.mobs.length))];
    if (!mobDef) return {ok: false, reason: 'unknown_mob'};
    hunt.zone = zone.id;
    hunt.mob = buildMob(zone, mobDef, {now, random, className: session.game.gameClass?.stats?.name || 'warrior', ...(champion === undefined ? {} : {champion})});
    hunt.lastActionAt = now;
    const tier = hunt.mob.champion ? CHAMPIONS[hunt.mob.champion] : null;
    pushLog(hunt, tier ? (hunt.mob.champion === 'red' ? '🔴' : '🔵') : '👾', `${tier ? `${tier.label}: ` : ''}${hunt.mob.name} (ур. ${hunt.mob.level}) нападает!`, now);
    return {ok: true, mob: hunt.mob};
}

/** A persistent small battlefield. Moves/selection/attacks all run under the inventory lock. */
export function enterHuntField(session, zoneId, {now = Date.now(), random = Math.random} = {}) {
    const zone = getZone(zoneId);
    if (!zone) return {ok: false, reason: 'unknown_zone'};
    const hunt = ensureHunt(session);
    advanceHunt(session, now, random);
    if (hunt.mob || hunt.field) return {ok: false, reason: 'already_fighting'};
    if (isDead(session, now)) return {ok: false, reason: 'dead'};
    if (!session.game.gameClass?.skills?.length) return {ok: false, reason: 'no_combat_class'};
    const offset = Math.min(zone.mobs.length - 1, Math.floor(random() * zone.mobs.length));
    const mobs = Array.from({length: 3}, (_, index) => {
        const mob = buildMob(zone, zone.mobs[(offset + index) % zone.mobs.length], {now, random, className: session.game.gameClass.stats.name});
        return {...mob, instanceId: `${now}:${index}`, ai: AI_ROLES[index], aggressive: index !== 1, aggro: false, x: [.2, .5, .8][index], y: [.3, .5, .3][index], buffs: []};
    });
    hunt.zone = zone.id;
    hunt.field = {mobs, target: mobs[0].instanceId, x: .5, y: .95, seenAt: now};
    hunt.mob = mobs[0];
    hunt.playerDebuffs = [];
    hunt.lastActionAt = now;
    pushLog(hunt, '⚑', `${zone.title}: выбери цель или подойди к монстрам.`, now);
    return {ok: true};
}

export function selectHuntTarget(session, targetId, now = Date.now()) {
    const changed = advanceHunt(session, now).length > 0;
    const hunt = ensureHunt(session);
    const target = hunt.field?.mobs.find(m => m.instanceId === targetId && m.currentHp > 0);
    if (!target) return {ok: false, reason: 'no_mob', changed};
    hunt.field.target = target.instanceId;
    hunt.mob = target;
    hunt.lastActionAt = now;
    return {ok: true};
}

export function moveHuntField(session, direction, now = Date.now()) {
    const changed = advanceHunt(session, now).length > 0;
    const hunt = ensureHunt(session);
    if (!hunt.field || isDead(session, now)) return {ok: false, reason: 'no_field', changed};
    if (!['forward', 'back', 'left', 'right'].includes(direction)) return {ok: false, reason: 'invalid_move', changed};
    if (direction === 'forward' || direction === 'back') hunt.field.y = clamp(hunt.field.y + (direction === 'forward' ? -.2 : .2), .15, .95);
    else hunt.field.x = clamp(hunt.field.x + (direction === 'left' ? -.2 : .2), .1, .9);
    hunt.lastActionAt = now;
    aggroNearby(hunt, now);
    return {ok: true};
}

/** Leaves the fight; the mob is gone and pays nothing. */
export function fleeHunt(session, now = Date.now()) {
    const hunt = ensureHunt(session);
    if (!hunt.mob && !hunt.field) return {ok: false, reason: 'no_mob'};
    pushLog(hunt, '🏃', 'Ты покинул поле боя.', now);
    hunt.mob = null;
    hunt.field = null;
    hunt.playerDebuffs = [];
    return {ok: true};
}

/** One skill against the mob. Returns {ok, result, killed, rewards, shots, log} or {ok: false, reason}. */
export function useHuntSkill(session, rawIndex, {now = Date.now(), random = Math.random} = {}) {
    const hunt = ensureHunt(session);
    const swings = advanceHunt(session, now, random);
    if (isDead(session, now)) return {ok: false, reason: 'dead', log: swings, changed: swings.length > 0};
    const mob = hunt.mob;
    if (!mob) return {ok: false, reason: 'no_mob', log: swings, changed: swings.length > 0};

    const index = Number(rawIndex);
    const skill = session.game.gameClass.skills?.[index];
    const fail = reason => ({ok: false, reason, log: swings, changed: swings.length > 0});
    if (!Number.isInteger(index) || !skill) return fail('invalid_skill');
    const pvpBlock = fieldPvpSkillBlock(session,skill,now);
    if (pvpBlock) return fail(pvpBlock);
    const usable = isPlayerCanUseSkill(session, skill);
    if (usable === 3) return {...fail('skill_locked'), needLevel: number(skill.needLvl)};
    if (usable === 1) return fail('not_enough_resource');
    if (usable === 2) return fail('cooldown');

    if (hunt.field && (skill.isDealDamage || skill.debuff || skill.debuffs?.length || skill.buffs?.some(b => b.kind === 'taunt'))) provokeMob(hunt, mob, now);

    const {cost, costHp} = getEffectiveSkillCost(skill, getMaxHp(session, session.game.gameClass), session);
    skillUsagePayCost(session, costHp > 0 ? 'hp' : 'mp', costHp > 0 ? costHp : cost);

    const shots = armShots(session, skill);
    const result = castSkill(session, asBoss(mob), skill, {now});
    clearShots(session);
    if (shots) result.shots = shots;
    setSkillCooldown(skill, session);
    hunt.lastActionAt = now;
    const questGains = recordQuestEvent(session, {type: 'skill', skill}).gains;

    let killed = false;
    let rewards = null;
    if (skill.isDealDamage && mob.currentHp <= 0) {
        killed = true;
        mob.currentHp = 0;
        rewards = finishKill(session,hunt,mob,{random,now});
        pushLog(hunt, '🏆', `${mob.name} повержен: +${rewards.exp} опыта, +${rewards.sp} ОП${rewards.gold ? `, +${rewards.gold} золота` : ''}.`, now);
        if (!hunt.field) hunt.mob = null;
    }
    return {ok: true, result, killed, rewards, shots: shots || null, questGains, log: swings};
}

function finishKill(session,hunt,mob,{random,now}){
    if (mob.rewarded) return mob.rewarded;
    const rewards=grantKillRewards(session,mob,getMobDef(getZone(mob.zone),mob.mobId),{random,now});
    rewards.karmaReduced=reduceHuntKarma(session,rewards);
    mob.rewarded = rewards;
    hunt.kills=number(hunt.kills)+1;hunt.last={name:mob.name,level:mob.level,champion:mob.champion,...rewards};
    if (hunt.field) {
        hunt.field.mobs = hunt.field.mobs.filter(m => m.instanceId !== mob.instanceId);
        hunt.field.target = hunt.field.mobs[0]?.instanceId || null;
        hunt.mob = hunt.field.mobs[0] || null;
    } else hunt.mob=null;
    if(rewards.soulCrystal?.outcome==='success')pushLog(hunt,'💠',`Кристалл души: ${rewards.soulCrystal.from} → ${rewards.soulCrystal.stage}.`,now);
    return rewards;
}

/** Plain numbers of the mob for the screen. */
export function mobDto(mob, now = Date.now()) {
    if (!mob) return null;
    const tier = mob.champion ? CHAMPIONS[mob.champion] : null;
    return {
        id: mob.mobId,
        instanceId: mob.instanceId || null,
        role: AI_LABELS[mob.ai] || null,
        aggro: Boolean(mob.aggro),
        aggressive: Boolean(mob.aggressive),
        x: mob.x, y: mob.y,
        buffs: (mob.buffs || []).filter(e => e.until > now).map(e => ({...e, remainMs: e.until - now})),
        name: mob.name,
        level: mob.level,
        champion: mob.champion || null,
        championLabel: tier?.label || null,
        element: mob.element || null,
        hp: mob.hp,
        currentHp: Math.max(0, mob.currentHp),
        hpPercent: mob.hp > 0 ? Math.max(0, Math.min(100, mob.currentHp / mob.hp * 100)) : 0,
        nextAttackMs: Math.max(0, mob.nextAttackAt - now),
        attackMs: mob.attackMs,
        stunned: isBossStunned(mob, now),
        debuffs: (mob.debuffs || []).filter(item => number(item.until) > now).map(item => ({kind: item.kind, amount: item.amount, remainMs: item.until - now})),
    };
}

export {heroStats};
