import {recordDeath} from '../player/deathPenalties.js';
import {l2OnDamageReceived,l2PreventDeath,l2TransferDamage} from '../player/l2Effects.js';
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
import { spendAmmo } from '../shots/ammo.js';
import { recordQuestEvent } from '../classes/classQuests.js';
import { AI_ROLES, AI_LABELS, aggroNearby, provokeMob, mobBuff, mobAiTurn, pursuePlayer, canMobReach } from './huntAi.js';
import {fieldPvpSkillBlock,reduceHuntKarma,fieldPvpEffect} from './fieldPvpState.js';
import {tickL2Effects,l2ActionBlock,l2HasControl,l2RawStat,l2MoveMultiplier} from '../player/l2Effects.js';
import {roomLayout, roomById, adjacent, slotPositions} from './huntRooms.js';
import {findPath, advancePath} from '../world/navigation.js';
import getSpeed from '../player/getters/getSpeed.js';

// A mob that was not attacked for this long loses interest and leaves.
export const IDLE_MS = 2 * 60 * 1000;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export function ensureHunt(session) {
    const game = session.game;
    if (!game.hunt || typeof game.hunt !== 'object') game.hunt = {zone: null, mob: null, kills: 0, log: []};
    if (!Array.isArray(game.hunt.log)) game.hunt.log = [];
    const field = game.hunt.field;
    if (field && !field.room) {
        // a field saved before the rooms: it is the entrance room of its zone
        field.room = roomLayout(getZone(game.hunt.zone)).startId;
        field.rooms = {};
        field.visited = [field.room];
        field.respawns = [];
    }
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
    const damageType = mob.hunt?.magic ? 'magic' : 'physical';
    const mitigation = damageMitigation(getDefence(session, gameClass, damageType) * (damageType === 'physical' ? 1-fieldPvpEffect(session,'armorBreak',now) : 1), level);
    const incoming = getIncomingDamageModifier(session, gameClass);
    const weaken = 1 - bossDebuffAmount(mob, 'weaken', now);
    const resist = resistFactor(attributeProfile(session).resist, mob.hunt.element, mob.hunt.attributeAttack || 0);
    const spread = 0.9 + random() * 0.2;
    const crit = random() < 0.05 ? 1.5 : 1;
    return Math.max(1, Math.round(base * mitigation * incoming * weaken * resist * spread * crit * (1 + mobBuff(mob, 'power', now))*l2RawStat(mob,mob.hunt?.magic?'mAtk':'pAtk',true,now)));
}

/** Shield first, then HP; a hero at 0 HP starts the respawn timer. */
function applyHit(session, dmg, now) {
    if(l2HasControl(session,'Invincible',now))return {absorbed:dmg,lost:0,killed:false};
    dmg=l2TransferDamage(session,dmg,now);
    const stats = session.game.gameClass.stats;
    stats.hp = Math.min(number(stats.hp), getMaxHp(session, session.game.gameClass));
    const shield = (session.game.effects || []).find(effect => effect.name === 'shield' && effect.value > 0);
    const absorbed = shield ? Math.min(shield.value, dmg) : 0;
    if (shield) shield.value -= absorbed;
    const lost = Math.min(stats.hp, dmg - absorbed);
    stats.hp = Math.max(0, stats.hp - lost);
    l2OnDamageReceived(session,null,lost,now);
    const killed = stats.hp === 0 && !l2PreventDeath(session,now);
    if (killed) {session.game.respawnTime = now + HUNT.respawnMs;recordDeath(session,{now});}
    return {absorbed, lost, killed};
}

/**
 * Applies the mob's swings that fell due up to `now`. Returns the log rows it wrote. A mob left alone
 * for IDLE_MS walks away; a hero that dies ends the fight.
 */
export function advanceHunt(session, now = Date.now(), random = Math.random) {
    tickL2Effects(session,now,{hp:getMaxHp(session)});
    const hunt = ensureHunt(session);
    if(session.game.world&&isDead(session,now))return [];
    if (!hunt.field) return advanceSingleHunt(session, now, random);
    const field = hunt.field;
    if (l2ActionBlock(session,{move:true},now)) {field.path=[];delete field.pendingRoom;field.moveAt=now;}
    else advancePath(field,now,getSpeed(session)*l2MoveMultiplier(session,now));
    if (field.pendingRoom && !field.path?.length) {
        const next = field.pendingRoom;delete field.pendingRoom;
        enterRoom(session,hunt,next,now,random);
    }
    if (now - number(hunt.lastActionAt) > IDLE_MS) {
        if(session.game.world?.mode==='location'){
            for(const mob of hunt.field.mobs){mob.aggro=false;mob.nextAttackAt=now+mob.attackMs;}
            hunt.lastActionAt=now;
        } else {
        hunt.field = null;
        hunt.mob = null;
        pushLog(hunt, '💨', 'Ты покинул поле боя после долгого бездействия.', now);
        return [{text: 'Поле боя покинуто.'}];
        }
    }
    settleRespawns(session, hunt, now, random);
    aggroNearby(hunt, now,session);
    pursuePlayer(hunt, now);
    const selected = hunt.field.target;
    const written = [];
    for (const mob of [...hunt.field.mobs]) {
        if (!mob.aggro) continue;
        hunt.mob = mob;
        written.push(...advanceSingleHunt(session, now, random));
        if (isDead(session, now)) { if(session.game.world){field.path=[];delete field.pendingRoom;for(const mob of field.mobs)mob.aggro=false;}else {hunt.field = null; hunt.mob = null;}return written; }
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
    tickL2Effects(mob,now);
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
    if(mob.currentHp<=0){finishKill(session,hunt,mob,{random,now});note('🏆',`${mob.name} повержен боевым эффектом.`);return written;}

    let swings = 0;
    while (mob.currentHp > 0 && mob.nextAttackAt <= now && swings < HUNT.maxCatchUp) {
        const at = mob.nextAttackAt;
        mob.nextAttackAt = at + mob.attackMs / (1-bossDebuffAmount(mob,'slow',at)) / Math.max(.05,l2RawStat(mob,mob.hunt?.magic?'mAtkSpd':'pAtkSpd',true,at));
        swings++;
        if (isBossStunned(mob, at)) { note('💫', `${mob.name} оглушён и пропускает удар.`); continue; }
        if(mob.hunt?.magic&&(bossDebuffAmount(mob,'mute',at)>0||l2HasControl(mob,'Mute',at)))continue;
        if (bossDebuffAmount(mob, 'mute', at) <= 0 && mobAiTurn(session, mob, at, note)) continue;
        if (!canMobReach(hunt, mob,session,at)) continue;
        if (random() < Math.min(.75,evadeChance(session, at)+bossDebuffAmount(mob,'accuracyDown',at))) { note('💨', `Ты уклонился от удара ${mob.name}.`); continue; }
        const raw = mobHit(session, mob, at, random);
        const dmg = Math.max(1, Math.round(raw * (1 - guardReduction(session, at))));
        const hit = applyHit(session, dmg, at);
        if(!mob.hunt?.magic&&hit.lost>0){mob.currentHp=Math.max(0,mob.currentHp-Math.ceil(hit.lost*Math.min(100,l2RawStat(session,'reflectDam',false,at))/100));}
        note('⚔️', `${mob.name} бьёт: −${hit.lost + hit.absorbed}${hit.absorbed ? ` (щит ${hit.absorbed})` : ''}`);
        if (hit.killed) {
            hunt.mob = null;
            note('💀', `${mob.name} победил тебя. Ты воскреснешь через минуту.`);
            return written;
        }
        if(mob.currentHp<=0){finishKill(session,hunt,mob,{random,now});return written;}
    }
    // Swings still overdue after the cap are dropped: a pause is not a stack of hits.
    if (mob.nextAttackAt <= now) mob.nextAttackAt = now + mob.attackMs;
    return written;
}


/** Builds every monster of a room at its slots: roles cycle fighter / healer / mage, a third of them start aggressive. */
function populateRoom(session, zone, room, {now, random, count = room.cap, prefix = `${now}:${room.id}`}) {
    const stage=zone.instance?.stages?.[(session.game.hunt?.field?.floor||1)-1];
    const definitions=zone.mobs.filter(m=>(stage||room.mobIds||zone.mobs.map(m=>m.id)).includes(m.id));
    const pool=definitions.length?definitions:zone.mobs;
    const offset = Math.min(pool.length - 1, Math.floor(random() * pool.length));
    return slotPositions(count).map((slot, index) => {
        const mob = buildMob(zone, pool[(offset + index) % pool.length], {now, random, className: session.game.gameClass.stats.name});
        const legacy = count === 3;
        return {...mob, instanceId: `${prefix}:${index}`, ai: AI_ROLES[index % AI_ROLES.length], aggressive: legacy ? index !== 1 : index % 3 === 0,
            aggro: false, x: slot.x, y: slot.y, buffs: []};
    });
}

/** Monsters killed in the room come back after HUNT.mobRespawnMs; those of the rooms left behind wait there. */
function settleRespawns(session, hunt, now, random) {
    const field = hunt.field;
    if (!field.respawns?.length) return;
    const due = field.respawns.filter(entry => entry.at <= now);
    if (!due.length) return;
    field.respawns = field.respawns.filter(entry => entry.at > now);
    const zone = getZone(hunt.zone);
    for (const entry of due) {
        const room = roomById(zone, entry.room);
        if (!room) continue;
        const bucket = entry.room === field.room ? field.mobs : (field.rooms[entry.room] ||= {mobs: []}).mobs;
        if (bucket.length >= room.cap) continue;
        field.seq = number(field.seq) + 1;
        const [fresh] = populateRoom(session, zone, room, {now, random, count: 1, prefix: `${now}:${room.id}:r${field.seq}`});
        // a new monster appears somewhere in the upper part of the area
        fresh.x = .12 + random() * .76;
        fresh.y = .12 + random() * .43;
        fresh.aggressive = random() < .35;
        fresh.ai = AI_ROLES[Math.floor(random() * AI_ROLES.length)];
        bucket.push(fresh);
    }
    if (!field.target && field.mobs.length) field.target = field.mobs[0].instanceId;
    hunt.mob = field.mobs.find(m => m.instanceId === field.target) || null;
}

/** Walks into a neighbouring room of a catacomb. A hero in a fight with a monster cannot walk away. */
function enterRoom(session, hunt, roomIdValue, now, random) {
    const zone = getZone(hunt.zone);
    const field = hunt.field;
    const from = roomById(zone, field.room), to = roomById(zone, roomIdValue);
    if (!to || !adjacent(from, to)) return {ok: false, reason: 'room_not_adjacent'};
    const train = field.mobs.filter(m => m.aggro && m.currentHp > 0);
    field.rooms[from.id] = {mobs: field.mobs.filter(m => !train.includes(m))};
    const stored = field.rooms[to.id];
    delete field.rooms[to.id];
    field.seq = number(field.seq) + 1;
    field.mobs = stored ? stored.mobs : populateRoom(session, zone, to, {now, random, prefix: `${now}:${to.id}:e${field.seq}`});
    field.mobs.push(...train.map(m => ({...m,x:.5,y:.85,lastMoveAt:now})));
    // monsters killed there while the hero was away that were due to return come in at once
    for (const mob of field.mobs) { mob.lastMoveAt = now; }
    field.room = to.id;
    field.walls=to.walls||[];
    field.x = .5;
    field.y = .95;
    field.target = field.mobs[0]?.instanceId || null;
    field.visited = [...new Set([...(field.visited || []), to.id])];
    hunt.mob = field.mobs[0] || null;
    hunt.lastActionAt = now;
    pushLog(hunt, '🚪', `${to.name}: ${field.mobs.length ? `монстров здесь ${field.mobs.length}.` : 'здесь пусто, монстры вернутся позже.'}`, now);
    return {ok: true, room: to.id};
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
    const layout = roomLayout(zone);
    const room = roomById(zone, layout.startId);
    const mobs = populateRoom(session, zone, room, {now, random});
    hunt.zone = zone.id;
    hunt.field = {mobs, target: mobs[0]?.instanceId || null, x: .5, y: .95, seenAt: now, moveAt:now, path:[], walls:room.walls||[], room: room.id, rooms: {}, visited: [room.id], respawns: [], seq: mobs.length};
    hunt.mob = mobs[0] || null;
    hunt.playerDebuffs = [];
    hunt.lastActionAt = now;
    pushLog(hunt, '⚑', `${zone.title}: выбери цель или подойди к монстрам.`, now);
    return {ok: true};
}

export function resetInstanceRoom(session,roomId,now=Date.now(),floor=1){
    const hunt=ensureHunt(session),zone=getZone(hunt.zone),room=roomById(zone,roomId);if(!room)return false;
    const field=hunt.field;field.floor=floor;field.room=room.id;field.mobs=populateRoom(session,zone,room,{now,random:Math.random,count:zone.instance?.kind==='labyrinth'&&floor>=3?1:room.cap});field.target=field.mobs[0]?.instanceId||null;field.walls=room.walls||[];field.path=[];field.x=.5;field.y=.95;field.moveAt=now;delete field.pendingRoom;hunt.mob=field.mobs[0]||null;hunt.lastActionAt=now;return true;
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

export function moveHuntField(session, direction, now = Date.now(), random = Math.random) {
    const abnormal=l2ActionBlock(session,{move:true},now);if(abnormal)return {ok:false,reason:abnormal};
    const changed = advanceHunt(session, now).length > 0;
    const hunt = ensureHunt(session);
    if (!hunt.field || isDead(session, now)) return {ok: false, reason: 'no_field', changed};
    const field=hunt.field,zone=getZone(hunt.zone),room=roomById(zone,field.room);
    if(zone.instance?.kind==='rift'&&typeof direction==='string')return {ok:false,reason:'rift_jump_only'};
    let target=direction;
    if (typeof direction === 'string' && direction.startsWith('room:')) {
        const to=roomById(zone,direction.slice(5));
        if(!adjacent(room,to))return {ok:false,reason:'room_not_adjacent'};
        target={x:to.col>room.col?.95:to.col<room.col?.05:.5,y:to.row>room.row?.95:to.row<room.row?.05:.5};
        field.pendingRoom=to.id;
    } else if (typeof direction !== 'object' || !direction) return {ok:false,reason:'invalid_move'};
    else delete field.pendingRoom;
    const path=findPath(field,{x:Number(target.x),y:Number(target.y)},room.walls||[]);
    if(!path){delete field.pendingRoom;return {ok:false,reason:'path_blocked'};}
    field.path=path;field.moveAt=now;
    if(session.game.world)session.game.world.channel=null;
    hunt.lastActionAt = now;
    aggroNearby(hunt, now,session);
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
    if (usable === 4) return fail('no_ammo');
    if (usable === 5) return fail('effect_blocked');

    if (hunt.field && (skill.isDealDamage || skill.debuff || skill.debuffs?.length || skill.buffs?.some(b => b.kind === 'taunt'))) provokeMob(hunt, mob, now);

    const {cost, costHp} = getEffectiveSkillCost(skill, getMaxHp(session, session.game.gameClass), session);
    skillUsagePayCost(session, costHp > 0 ? 'hp' : 'mp', costHp > 0 ? costHp : cost);
    spendAmmo(session, skill);

    const shots = armShots(session, skill);
    const result = castSkill(session, asBoss(mob), skill, {now, l2Target: mob, random});
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
        pushLog(hunt, '🏆', `${mob.name} повержен: +${rewards.exp} опыта, +${rewards.sp} SP${rewards.gold ? `, +${rewards.gold} золота` : ''}.${rewards.party?.length ? ' Группа получила свою долю.' : ''}`, now);
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
        const index=hunt.field.mobs.findIndex(m=>m.instanceId===mob.instanceId);
        if(index>=0)hunt.field.mobs.splice(index,1);
        if(!session.game.world?.instanceId)(hunt.field.respawns ||= []).push({at: now + HUNT.mobRespawnMs, room: hunt.field.room});
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
