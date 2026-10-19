import {recordSeedKill} from '../world/seedInstances.js';
import {recordDeath} from '../player/deathPenalties.js';
import {playerName} from '../player/playerName.js';
import {armAttackRune, clearAttackRune, defenseRuneFactor} from '../runes/labRunes.js';
import {l2OnDamageReceived,l2PreventDeath,l2TransferDamage} from '../player/l2Effects.js';
// A real-time fight with one mob of a hunting zone. The mob lives in session.game.hunt.mob and swings
// every few seconds; the swings that fell due since the last request are applied when the player
// acts or the screen refreshes (nothing runs in the background). The player casts skills (cost,
// cooldown, shots as in a boss fight) and drinks potions through the normal inventory route.
import { CHAMPIONS, HUNT } from './huntConfig.js';
import {tickSoulDots} from '../equipment/soulCrystalCombat.js';
import { buildMob, getMobDef, getZone, heroStats } from './huntMobs.js';
import {locationLevel,locationLevels} from './locationLevels.js';
import {initialPopulationSlots,populationSlots,populationCapacity,occupiedPopulationSlots,randomPopulationRespawn,hellboundStage} from './sourcePopulation.js';
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
import {findPath, advancePath,travelPath,ROOM_SIZE,nearestOpenPoint,insideObstacle} from '../world/navigation.js';
import {continuousField,planFieldCrossing} from '../world/continuousField.js';
import {syncResidentRooms,neighborhood,battleField,battleWalls,battleActor,removeBattleActor,firstBoundary} from './huntNeighborhood.js';
import getSpeed from '../player/getters/getSpeed.js';
import {BASIC_ATTACK, hostileSkill, skillSpatial, weaponSpatial, needsTarget, inSkillReach, spatialTargets, spatialDistance,clearLine} from './huntSpatial.js';
import {skillCombatType} from '../player/combatType.js';

// A mob that was not attacked for this long loses interest and leaves.
export const IDLE_MS = 2 * 60 * 1000;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export function ensureHunt(session, now = Date.now(),random=Math.random) {
    const game = session.game;
    if (!game.hunt || typeof game.hunt !== 'object') game.hunt = {zone: null, mob: null, kills: 0, log: []};
    if (!Array.isArray(game.hunt.log)) game.hunt.log = [];
    const field = game.hunt.field;
    if (field && !field.room) {
        // a field saved before the rooms: it is the entrance room of its zone
        field.room = roomLayout(getZone(game.hunt.zone),field.floor||1).startId;
        field.rooms = {};
        field.visited = [field.room];
        field.respawns = [];
    }
    if(field&&field.layoutVersion!==4){
        const room=roomById(getZone(game.hunt.zone),field.room,field.floor||1);
        field.walls=room?.walls||[];field.layoutVersion=4;field.path=[];delete field.action;delete field.autoAttack;delete field.pendingRoom;delete field.crossing;
        for(const actor of [field,...(field.mobs||[])]){Object.assign(actor,nearestOpenPoint(actor,field.walls));actor.path=[];}
    }
    if(field&&locationLevels(game.hunt.zone)&&field.levelVersion!==1){
        const zone=getZone(game.hunt.zone);field.floor=locationLevel(zone.id,field.floor||1)?.number||1;
        const layout=roomLayout(zone,field.floor),room=roomById(zone,field.room,field.floor)||layout.rooms[0],old=[...(field.mobs||[])];
        field.mobs=populateRoom(session,zone,room,{now,random:Math.random}).map(fresh=>{
            const index=old.findIndex(m=>m.mobId===fresh.mobId);if(index<0)return fresh;
            const [saved]=old.splice(index,1);return {...fresh,instanceId:saved.instanceId,currentHp:Math.min(fresh.hp,saved.currentHp)};
        });
        Object.assign(field,{room:room.id,rooms:{},floorStates:{},respawns:[],visited:[room.id],walls:room.walls||[],target:field.mobs[0]?.instanceId||null,levelVersion:1,path:[]});
        stopHuntAction(field,now);Object.assign(field,nearestOpenPoint(field,field.walls));
    }
    if(field&&game.hunt.zone==='hellbound'){
        const stage=hellboundStage(session);
        if(field.populationStage===undefined)field.populationStage=stage;
        else if(field.populationStage!==stage){
            field.populationStage=stage;field.populationRevision=(field.populationRevision||0)+1;
            const zone=getZone(game.hunt.zone);
            const old=[...(field.mobs||[]),...Object.values(field.rooms||{}).flatMap(r=>r.mobs||[])];
            // HellboundEngine.doSpawn restores active actors on a stage change. Polling the same stage must not heal them.
            for(const id of new Set([field.room,...Object.keys(field.rooms||{})])){
                const room=roomById(zone,id,field.floor||1);if(!room)continue;
                const mobs=populateRoom(session,zone,room,{now,random:Math.random,prefix:`${now}:hb${field.populationRevision}:${id}`}).map(fresh=>{
                    const saved=old.find(m=>m.sourceRoom===id&&m.sourceSlot===fresh.sourceSlot);
                    return saved?{...fresh,instanceId:saved.instanceId}:fresh;
                });
                if(id===field.room)field.mobs=mobs;else field.rooms[id]={...field.rooms[id],mobs};
            }
            field.respawns=[];field.target=field.mobs[0]?.instanceId||null;stopHuntAction(field,now);
        }
    }
    syncResident(session,game.hunt,now,random);
    if (game.hunt.field) game.hunt.mob = battleActor(game.hunt,game.hunt.field.target);
    return game.hunt;
}

/** Keeps the 3x3 window of cells populated; population itself stays in populateRoom. */
function syncResident(session,hunt,now,random){
    return syncResidentRooms(hunt,now,(zone,room,prefix)=>populateRoom(session,zone,room,{now,random,prefix}));
}

function pushLog(hunt, icon, text, now,extra={}) {
    hunt.logSeq=(hunt.logSeq||0)+1;
    hunt.log = [{id:hunt.logSeq,at: now, icon, text,...extra}, ...hunt.log].slice(0, HUNT.logSize);
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
    return Math.max(1, Math.round(base * mitigation * incoming * weaken * resist * spread * crit * (1 + mobBuff(mob, 'power', now)) * defenseRuneFactor(session, now)*l2RawStat(mob,mob.hunt?.magic?'mAtk':'pAtk',true,now)));
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
    if(lost>0&&session.game.hunt?.field){session.game.hunt.field.treasureHitAt=now;delete session.game.hunt.field.treasureCast;}
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
    const hunt = ensureHunt(session,now,random);
    if(isDead(session,now)){if(hunt.field)stopHuntAction(hunt.field,now);return [];}
    if (!hunt.field) return advanceSingleHunt(session, now, random);
    const field = hunt.field;
    // A client that stopped polling is away: monsters do not stack the swings they "made" meanwhile.
    const away = now - number(field.polledAt, now) > HUNT.pollGapMs;
    field.polledAt = now;
    if((field.action||field.autoAttack)&&now-number(field.seenAt)>5000)stopHuntAction(field,now);
    if (l2ActionBlock(session,{move:true},now)) {field.path=[];delete field.pendingRoom;delete field.crossing;field.moveAt=now;}
    else if(field.crossing){
        const speed=getSpeed(session)*l2MoveMultiplier(session,now);
        const remaining=travelPath(field,Math.max(0,(now-(field.moveAt??now))/1000)*Math.max(0,speed)/ROOM_SIZE);field.moveAt=now;
        if(!field.path.length){
            const crossing=field.crossing;
            const intent=crossing.combat?{action:field.action,autoAttack:field.autoAttack,target:field.target}:null;
            const atEdge=Math.hypot(field.x-crossing.exit.x,field.y-crossing.exit.y)<1e-7;
            const entered=atEdge?enterRoom(session,hunt,crossing.room,now,random,{entry:crossing.entry,silent:true}):{ok:false};
            if(entered.ok){
                if(intent&&battleActor(hunt,intent.target)){field.action=intent.action;field.autoAttack=intent.autoAttack;field.target=intent.target;hunt.mob=battleActor(hunt,intent.target);}
                field.path=findPath(field,crossing.destination,field.walls,{margin:0})||[];
                travelPath(field,remaining);field.moveAt=now;
            }else stopHuntAction(field,now);
        }
    }else advancePath(field,now,getSpeed(session)*l2MoveMultiplier(session,now));
    if (field.pendingRoom && !field.path?.length) {
        const next = field.pendingRoom;delete field.pendingRoom;
        enterRoom(session,hunt,next,now,random);
    }
    if(neighborhood(hunt)){syncResident(session,hunt,now,random);hunt.mob=battleActor(hunt,field.target);}
    if (now - number(hunt.lastActionAt) > IDLE_MS) {
        if(session.game.world?.mode==='location'){
            for(const mob of battleField(hunt).mobs){mob.aggro=false;mob.nextAttackAt=now+mob.attackMs;}
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
    const swarm = battleField(hunt).mobs;
    if (away) for (const mob of swarm) if (mob.aggro) mob.nextAttackAt = Math.max(number(mob.nextAttackAt), now - HUNT.catchUpWindowMs);
    if (away) field.gapGuard = true;
    try {
    for (const mob of swarm) {
        if (!mob.aggro) continue;
        hunt.mob = mob;
        written.push(...advanceSingleHunt(session, now, random));
        if (isDead(session, now)) { if(session.game.world){field.path=[];delete field.pendingRoom;delete field.crossing;for(const mob of field.mobs)mob.aggro=false;}else {hunt.field = null; hunt.mob = null;}return written; }
    }
    } finally { delete field.gapGuard; }
    // Re-select a surviving actor after a kill; selecting alone never provokes it.
    hunt.field.target = battleActor(hunt,selected)?.instanceId || hunt.field.mobs[0]?.instanceId || null;
    hunt.mob = battleActor(hunt,hunt.field.target);
    written.push(...advanceHuntAction(session,now,random));
    return written;
}

/** A movement command, target change, room transition or Stop cancels the current combat intention. */
export function stopHuntAction(field,now=Date.now()) {
    if(!field)return;
    delete field.treasureCast;
    delete field.action;delete field.autoAttack;
    delete field.pendingRoom;
    delete field.crossing;
    field.path=[];field.moveAt=now;
}

function approachTarget(session,mob,geometry,now) {
    const field=session.game.hunt.field;
    if(l2ActionBlock(session,{move:true},now))return {ok:false,reason:'effect_blocked'};
    if(field.crossing?.combat)return {ok:true};
    const distance=spatialDistance(field,mob),share=Math.min(1,geometry.range*.85/Math.max(1,distance));
    let destination={x:mob.x+(field.x-mob.x)*share,y:mob.y+(field.y-mob.y)*share};
    const area=neighborhood(session.game.hunt),edge=area&&firstBoundary(field,destination);
    if(edge){
        const to=area.layout.rooms.find(r=>r.col===area.current.col+edge.dx&&r.row===area.current.row+edge.dy);
        if(!to||insideObstacle(edge.entry,to.walls))return {ok:false,reason:'path_blocked'};
        const path=findPath(field,edge.exit,field.walls,{margin:0});if(!path)return {ok:false,reason:'path_blocked'};
        const rest={x:destination.x-edge.dx,y:destination.y-edge.dy};
        const landing=rest.x>=0&&rest.x<=1&&rest.y>=0&&rest.y<=1&&findPath(edge.entry,rest,to.walls,{margin:0})?rest:edge.entry;
        field.crossing={room:to.id,exit:edge.exit,entry:edge.entry,destination:landing,combat:true};field.path=path;field.moveAt=now;return {ok:true};
    }
    destination={x:Math.max(.02,Math.min(.98,destination.x)),y:Math.max(.02,Math.min(.98,destination.y))};
    const path=findPath(field,destination,field.walls||[]);
    if(!path)return {ok:false,reason:'path_blocked'};
    field.path=path;field.moveAt=now;
    return {ok:true};
}

export function setHuntAttack(session,enabled,now=Date.now()) {
    const hunt=ensureHunt(session,now),field=hunt.field;
    if(!field)return {ok:false,reason:'no_mob'};
    if(!enabled){stopHuntAction(field,now);return {ok:true};}
    advanceHunt(session,now);
    if(isDead(session,now))return {ok:false,reason:'dead'};
    if(!hunt.mob)return {ok:false,reason:'no_mob'};
    if(!weaponSpatial(session,now))return {ok:false,reason:'combat_data_missing'};
    if(l2ActionBlock(session,{attack:true},now))return {ok:false,reason:'effect_blocked'};
    delete field.pendingRoom;
    delete field.crossing;
    delete field.action;field.path=[];
    field.seenAt=now;hunt.lastActionAt=now;
    field.autoAttack={targetId:hunt.mob.instanceId,nextAt:Math.max(now,number(field.nextAttackAt))};
    if(session.game.world)session.game.world.channel=null;
    advanceHuntAction(session,now);
    return {ok:true};
}

function advanceHuntAction(session,now,random=Math.random) {
    const hunt=session.game.hunt,field=hunt.field;
    if(!field||(!field.action&&!field.autoAttack))return [];
    const action=field.action||{kind:'attack',targetId:field.autoAttack.targetId};
    const skill=action.kind==='attack'?{...BASIC_ATTACK,cost:weaponSpatial(session,now)?.costMp||0}:session.game.gameClass.skills[action.index];
    const geometry=skill&&skillSpatial(session,skill,now);
    const combat=battleField(hunt),mob=battleActor(hunt,action.targetId);
    if(!geometry||(needsTarget(geometry)&&!mob)||isDead(session,now)){stopHuntAction(field,now);return [];}
    if(mob)field.facing=Math.atan2(mob.y-field.y,mob.x-field.x);
    if(!inSkillReach(combat,mob,geometry)) {
        if(action.phase==='cast'){delete field.action;return [];}
        const move=approachTarget(session,mob,geometry,now);
        if(!move.ok){stopHuntAction(field,now);pushLog(hunt,'⚑','Не удаётся подойти к цели.',now);}
        return [];
    }
    field.path=[];
    delete field.crossing;
    if(l2ActionBlock(session,{attack:hostileSkill(skill),magic:skillCombatType(skill,session.game.gameClass)==='magic'},now)){
        if(field.action)delete field.action;
        return [];
    }
    if(action.kind!=='attack'&&geometry.windup>0&&action.phase!=='cast'){
        action.phase='cast';action.until=now+geometry.windup;field.action=action;return [];
    }
    if(action.phase==='cast'&&now<action.until)return [];
    if(action.kind==='attack'&&now<field.autoAttack.nextAt)return [];
    const done=performHuntCast(session,skill,mob,geometry,{now,random});
    if(action.kind==='attack'){
        field.nextAttackAt=now+weaponSpatial(session,now).interval;
        field.autoAttack.nextAt=field.nextAttackAt;
        if(!done.ok||!battleActor(hunt,mob?.instanceId))delete field.autoAttack;
    }else delete field.action;
    if(!done.ok)pushLog(hunt,'⚑',done.reason==='cooldown'?'Умение ещё восстанавливается.':'Действие прервано: проверь состояние персонажа и ресурсы.',now);
    return [{action:action.kind,ok:done.ok}];
}

function advanceSingleHunt(session, now = Date.now(), random = Math.random) {
    const hunt = session.game.hunt;
    const mob = hunt.mob;
    if (!mob) return [];
    tickL2Effects(mob,now);
    const written = [];
    const note = (icon, text,extra={}) => { pushLog(hunt, icon, text, now,extra); written.push({icon, text,...extra}); };

    if (now - Math.max(number(hunt.lastActionAt), number(mob.spawnedAt)) > IDLE_MS) {
        hunt.mob = null;
        note('💨', `${mob.name} ушёл — ты долго не нападал.`);
        return written;
    }
    if (isDead(session, now)) return written;
    const dotDamage=tickSoulDots(mob,now);
    if(dotDamage)note('🩸',`Эффект SA: −${dotDamage} HP у ${mob.name}.`,{combat:{kind:'outgoing',actor:playerName(session),target:mob.name,amount:dotDamage}});
    if(mob.currentHp<=0){finishKill(session,hunt,mob,{random,now});note('🏆',`${mob.name} повержен боевым эффектом.`);return written;}

    let swings = 0;
    while (mob.currentHp > 0 && mob.nextAttackAt <= now && swings < HUNT.maxCatchUp) {
        const at = mob.nextAttackAt;
        mob.nextAttackAt = at + mob.attackMs / (1-bossDebuffAmount(mob,'slow',at)) / Math.max(.05,l2RawStat(mob,mob.hunt?.magic?'mAtkSpd':'pAtkSpd',true,at));
        swings++;
        if (isBossStunned(mob, at)) { note('💫', `${mob.name} оглушён и пропускает удар.`); continue; }
        if(mob.hunt?.magic&&(bossDebuffAmount(mob,'mute',at)>0||l2HasControl(mob,'Mute',at)))continue;
        if (bossDebuffAmount(mob, 'mute', at) <= 0 && mobAiTurn(session, mob, at, note)) continue;
        if(hunt.field&&!clearLine(mob,hunt.field,battleWalls(hunt)))continue;
        if (!canMobReach(hunt, mob,session,at)) continue;
        if (random() < Math.min(.75,evadeChance(session, at)+bossDebuffAmount(mob,'accuracyDown',at))) { note('💨', `Ты уклонился от удара ${mob.name}.`,{combat:{kind:'evade',actor:playerName(session),evader:playerName(session),target:mob.name}}); continue; }
        const raw = mobHit(session, mob, at, random);
        let dmg = Math.max(1, Math.round(raw * (1 - guardReduction(session, at))));
        // After a pause in polling a swing may wound but cannot finish the hero.
        if (hunt.field?.gapGuard) {
            const shield = (session.game.effects || []).find(effect => effect.name === 'shield' && effect.value > 0);
            dmg = Math.min(dmg, Math.max(0, number(session.game.gameClass.stats.hp) - 1 + (shield?.value || 0)));
        }
        const hit = applyHit(session, dmg, at);
        if(!mob.hunt?.magic&&hit.lost>0){mob.currentHp=Math.max(0,mob.currentHp-Math.ceil(hit.lost*Math.min(100,l2RawStat(session,'reflectDam',false,at))/100));}
        note('⚔️', `${mob.name} бьёт: −${hit.lost + hit.absorbed}${hit.absorbed ? ` (щит ${hit.absorbed})` : ''}`,{combat:{kind:'incoming',actor:mob.name,target:playerName(session),amount:hit.lost+hit.absorbed}});
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


/** Builds room actors with original NPC aggression and social clans. */
function populateRoom(session, zone, room, {now, random, count = room.cap, prefix = `${now}:f${session.game.hunt?.field?.floor||1}:${room.id}`,sourceSlot=null}) {
    const stage=zone.instance?.stages?.[(session.game.hunt?.field?.floor||1)-1];
    if(zone.instance?.kind==='labyrinth'&&(session.game.hunt?.field?.floor||1)>=3)count=Math.min(count,1);
    const definitions=zone.mobs.filter(m=>(stage||room.mobIds||zone.mobs.map(m=>m.id)).includes(m.id));
    const source=room.spawns?(sourceSlot===null?initialPopulationSlots(room,session,zone.id,random):populationSlots(room,session,zone.id).filter(s=>s.slot===sourceSlot)):null;
    if(source&&source.length===0)return [];
    const pool=definitions.length?definitions:zone.mobs;
    const offset = Math.min(pool.length - 1, Math.floor(random() * pool.length));
    return slotPositions(source?Math.min(count,source.length):count).map((slot, index) => {
        const placement=source?.[index];
        const def=placement?getMobDef(zone,placement.id):pool[(offset + index) % pool.length];
        const mob = buildMob(zone, def, {now, random,champion:def.rewardless?null:undefined, className: session.game.gameClass.stats.name});
        if(placement)Object.assign(mob,{sourceRoom:room.id,sourceSlot:placement.slot,sourceRandomGroup:placement.randomGroup,sourceNativeRespawn:Boolean(locationLevels(zone.id)?.population),sourcePosition:placement.coordinateSource==='point'?{x:placement.x,y:placement.y,z:placement.z}:null,sourceTerritory:placement.polygon?.length?{polygon:placement.polygon,minZ:placement.minZ,maxZ:placement.maxZ}:null,sourceRespawnMs:placement.respawnMs,sourceRespawnRandomMs:placement.respawnRandomMs});
        return {...mob, instanceId: `${prefix}:${index}`, ai: AI_ROLES[index % AI_ROLES.length],
            aggro: false, ...nearestOpenPoint(slot,room.walls), buffs: []};
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
        const room = roomById(zone, entry.room,field.floor||1);
        if (!room) continue;
        const bucket = entry.room === field.room ? field.mobs : (field.rooms[entry.room] ||= {mobs: []}).mobs;
        if(locationLevels(zone.id)?.population){if(Number.isInteger(entry.sourceSlot)&&occupiedPopulationSlots(field,room.id,{pending:false}).has(entry.sourceSlot))continue;}
        else if (bucket.length >= room.cap) continue;
        field.seq = number(field.seq) + 1;
        const [fresh] = populateRoom(session, zone, room, {now, random, count: 1,sourceSlot:entry.sourceSlot??null, prefix: `${now}:${room.id}:r${field.seq}`});
        if(!fresh)continue;
        // a new monster appears somewhere in the upper part of the area
        fresh.x = .12 + random() * .76;
        fresh.y = .12 + random() * .43;
        Object.assign(fresh,nearestOpenPoint(fresh,room.walls));
        fresh.ai = AI_ROLES[Math.floor(random() * AI_ROLES.length)];
        bucket.push(fresh);
    }
    if (!field.target && field.mobs.length) field.target = field.mobs[0].instanceId;
    hunt.mob = battleActor(hunt,field.target);
}

/** Walks into a neighbouring room; pursuing monsters follow through the same exit. */
function enterRoom(session, hunt, roomIdValue, now, random,{entry=null,silent=false}={}) {
    const zone = getZone(hunt.zone);
    const field = hunt.field;
    const from = roomById(zone, field.room,field.floor||1), to = roomById(zone, roomIdValue,field.floor||1);
    if (!to || !adjacent(from, to)) return {ok: false, reason: 'room_not_adjacent'};
    const seamless=continuousField(zone,roomLayout(zone,field.floor||1)),selected=field.target;
    const train = session.game.world?.instanceId||seamless?[]:field.mobs.filter(m => m.aggro && m.currentHp > 0);
    field.rooms[from.id] = {mobs: field.mobs.filter(m => !train.includes(m))};
    const stored = field.rooms[to.id];
    delete field.rooms[to.id];
    field.seq = number(field.seq) + 1;
    field.mobs = stored ? stored.mobs : populateRoom(session, zone, to, {now, random, prefix: `${now}:${to.id}:e${field.seq}`});
    field.mobs.push(...train.map(m => ({...m,x:to.col>from.col?.025:to.col<from.col?.975:.5,
        y:to.row>from.row?.025:to.row<from.row?.975:.5,lastMoveAt:now,path:[]})));
    // monsters killed there while the hero was away that were due to return come in at once
    for (const mob of field.mobs) { mob.lastMoveAt = now;Object.assign(mob,nearestOpenPoint(mob,to.walls));mob.path=[]; }
    field.room = to.id;
    field.walls=to.walls||[];
    stopHuntAction(field,now);
    field.x = entry?.x??(to.col>from.col?.05:to.col<from.col?.95:.5);
    field.y = entry?.y??(to.row>from.row?.05:to.row<from.row?.95:.5);
    field.target = seamless&&battleActor(hunt,selected)?selected:field.mobs[0]?.instanceId || null;
    field.visited = [...new Set([...(field.visited || []), to.id])];
    hunt.mob = battleActor(hunt,field.target);
    hunt.lastActionAt = now;
    if(!silent)pushLog(hunt, '🚪', `${to.name}: ${field.mobs.length ? `монстров здесь ${field.mobs.length}.` : 'здесь пусто, монстры вернутся позже.'}`, now);
    return {ok: true, room: to.id};
}

/** Starts a fight in a zone (a random mob of it unless `mobId` names one). */
export function startHunt(session, zoneId, {now = Date.now(), random = Math.random, mobId = null, champion} = {}) {
    const zone = getZone(zoneId);
    if (!zone) return {ok: false, reason: 'unknown_zone'};
    const hunt = ensureHunt(session,now,random);
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
export function enterHuntField(session, zoneId, {now = Date.now(), random = Math.random, targetMobId = null,floor=null} = {}) {
    const zone = getZone(zoneId);
    if (!zone) return {ok: false, reason: 'unknown_zone'};
    floor??=locationLevels(zoneId)?.entryFloor||1;
    let entryRoom=null;
    if(targetMobId&&locationLevels(zoneId)){
        const sourceFloor=locationLevels(zoneId).floors.find(f=>f.rooms.some(r=>r.spawns.some(s=>s.id===String(targetMobId))));
        if(!sourceFloor)return {ok:false,reason:'unknown_zone'};
        floor=sourceFloor.number;entryRoom=sourceFloor.rooms.find(r=>r.spawns.some(s=>s.id===String(targetMobId))).id;
    }
    const hunt = ensureHunt(session,now,random);
    advanceHunt(session, now, random);
    if (hunt.mob || hunt.field) return {ok: false, reason: 'already_fighting'};
    if (isDead(session, now)) return {ok: false, reason: 'dead'};
    if (!session.game.gameClass?.skills?.length) return {ok: false, reason: 'no_combat_class'};
    const layout = roomLayout(zone,floor);
    const room = roomById(zone, entryRoom||layout.startId,floor);
    const mobs = populateRoom(session, zone, room, {now, random,prefix:`${now}:f${floor}:${room.id}`});
    if(targetMobId&&!locationLevels(zoneId)){
        const definition=getMobDef(zone,targetMobId);
        if(!definition)return {ok:false,reason:'unknown_zone'};
        const slot=mobs[0];
        mobs[0]={...buildMob(zone,definition,{now,random,className:session.game.gameClass.stats.name}),instanceId:slot.instanceId,ai:slot.ai,aggressive:slot.aggressive,aggro:false,x:slot.x,y:slot.y,buffs:[]};
    }
    hunt.zone = zone.id;
    const initialTarget=targetMobId?mobs.find(m=>m.mobId===String(targetMobId))||mobs[0]:mobs[0];
    hunt.field = {floor,mobs, target: mobs[0]?.instanceId || null, x: .5, y: .95, seenAt: now, moveAt:now, path:[], walls:room.walls||[],layoutVersion:4,levelVersion:locationLevel(zone.id,floor)?1:null, room: room.id, rooms: {}, visited: [room.id], respawns: [], seq: mobs.length};
    if(zone.id==='hellbound')hunt.field.populationStage=hellboundStage(session);
    hunt.field.target=initialTarget?.instanceId||null;
    hunt.mob = initialTarget || null;
    hunt.playerDebuffs = [];
    hunt.lastActionAt = now;
    pushLog(hunt, '⚑', `${zone.title}: выбери цель или подойди к монстрам.`, now);
    return {ok: true};
}

export function resetInstanceRoom(session,roomId,now=Date.now(),floor=1){
    const hunt=ensureHunt(session),zone=getZone(hunt.zone),room=roomById(zone,roomId,floor);if(!room)return false;
    const field=hunt.field;stopHuntAction(field,now);field.floor=floor;field.room=room.id;field.mobs=populateRoom(session,zone,room,{now,random:Math.random,count:zone.instance?.kind==='labyrinth'&&floor>=3?1:room.cap});field.target=field.mobs[0]?.instanceId||null;field.walls=room.walls||[];field.path=[];field.x=.5;field.y=.95;field.moveAt=now;delete field.pendingRoom;hunt.mob=field.mobs[0]||null;hunt.lastActionAt=now;return true;
}

/** Bank the entire floor, including pending respawns. A staircase never rerolls it. */
export function changeHuntFloor(session,floor,{now=Date.now(),random=Math.random,arrival=null}={}){
 const hunt=ensureHunt(session,now,random),field=hunt.field,zone=getZone(hunt.zone);
 if(!field||!Number.isInteger(floor)||floor<1||floor>(zone.floors||1))return {ok:false,reason:'invalid_floor'};
 const previous=field.floor||1;
 if(previous===floor)return {ok:false,reason:'invalid_floor'};
 const banks=field.floorStates||={};
 const snapshot=()=>Object.fromEntries(['mobs','room','rooms','respawns','visited','walls','target','seq','levelVersion'].map(k=>[k,field[k]]));
 banks[previous]=snapshot();stopHuntAction(field,now);
 const layout=roomLayout(zone,floor),level=locationLevel(zone.id,floor);
 const landing=arrival||level?.stairs[floor>previous?'down':'up'];
 const room=roomById(zone,landing?.room||layout.startId,floor);
 field.floor=floor;
 if(banks[floor])Object.assign(field,banks[floor]);
 else Object.assign(field,{mobs:[],room:room.id,rooms:{},respawns:[],visited:[room.id],walls:room.walls||[],target:null,seq:0,levelVersion:level?1:null});
 // Walk into the landing while retaining the rest of that floor's rooms.
 if(field.room!==room.id){field.rooms[field.room]={mobs:field.mobs};field.mobs=field.rooms[room.id]?.mobs||populateRoom(session,zone,room,{now,random});delete field.rooms[room.id];field.room=room.id;field.walls=room.walls||[];}
 else if(!banks[floor])field.mobs=populateRoom(session,zone,room,{now,random});
 field.target=field.mobs[0]?.instanceId||null;field.visited=[...new Set([...field.visited,room.id])];
 Object.assign(field,landing?.point||{x:.9,y:.1},{floor,seenAt:now,moveAt:now,path:[]});
 for(const mob of field.mobs){mob.lastMoveAt=now;mob.nextAttackAt=Math.max(mob.nextAttackAt||0,now+mob.attackMs);}
 hunt.mob=field.mobs.find(m=>m.instanceId===field.target)||null;
 return {ok:true,floor};
}
export function selectHuntTarget(session, targetId, now = Date.now()) {
    const changed = advanceHunt(session, now).length > 0;
    const hunt = ensureHunt(session,now);
    const target = battleActor(hunt,targetId);
    if (!target) return {ok: false, reason: 'no_mob', changed};
    hunt.field.target = target.instanceId;
    stopHuntAction(hunt.field,now);
    hunt.mob = target;
    hunt.lastActionAt = now;
    return {ok: true};
}

export function moveHuntField(session, direction, now = Date.now(), random = Math.random) {
    const abnormal=l2ActionBlock(session,{move:true},now);if(abnormal)return {ok:false,reason:abnormal};
    const changed = advanceHunt(session, now).length > 0;
    const hunt = ensureHunt(session,now,random);
    if (!hunt.field || isDead(session, now)) return {ok: false, reason: 'no_field', changed};
    const field=hunt.field,zone=getZone(hunt.zone),room=roomById(zone,field.room,field.floor||1);
    if(zone.instance?.kind==='rift'&&typeof direction==='string')return {ok:false,reason:'rift_jump_only'};
    let target=direction;
    let crossing=null;
    if (typeof direction === 'string' && direction.startsWith('room:')) {
        const to=roomById(zone,direction.slice(5),field.floor||1);
        if(!adjacent(room,to))return {ok:false,reason:'room_not_adjacent'};
        target={x:to.col>room.col?.95:to.col<room.col?.05:.5,y:to.row>room.row?.95:to.row<room.row?.05:.5};
        field.pendingRoom=to.id;
    } else if (typeof direction !== 'object' || !direction) return {ok:false,reason:'invalid_move'};
    else {
        const point={x:Number(direction.x),y:Number(direction.y)};
        if(continuousField(zone,roomLayout(zone,field.floor||1))&&(point.x<0||point.x>1||point.y<0||point.y>1)){
            crossing=planFieldCrossing(field,point,roomLayout(zone,field.floor||1),room);
            if(!crossing)return {ok:false,reason:'room_not_adjacent'};
            const to=roomById(zone,crossing.room,field.floor||1);
            if(insideObstacle(crossing.entry,to.walls)||!findPath(crossing.entry,crossing.destination,to.walls,{margin:0}))return {ok:false,reason:'path_blocked'};
            target=crossing.exit;
        }
        delete field.pendingRoom;
    }
    const path=findPath(field,{x:Number(target.x),y:Number(target.y)},room.walls||[],{margin:crossing?0:.02});
    if(!path){delete field.pendingRoom;return {ok:false,reason:'path_blocked'};}
    const pendingRoom=field.pendingRoom;
    stopHuntAction(field,now);
    if(pendingRoom)field.pendingRoom=pendingRoom;
    if(crossing)field.crossing=crossing;
    field.path=path;field.moveAt=now;
    if(session.game.world)session.game.world.channel=null;
    hunt.lastActionAt = now;
    aggroNearby(hunt, now,session);
    return {ok: true};
}

/** Leaves the fight; the mob is gone and pays nothing. */
export function fleeHunt(session, now = Date.now()) {
    const hunt = ensureHunt(session,now);
    if (!hunt.mob && !hunt.field) return {ok: false, reason: 'no_mob'};
    pushLog(hunt, '🏃', 'Ты покинул поле боя.', now);
    hunt.mob = null;
    hunt.field = null;
    hunt.playerDebuffs = [];
    return {ok: true};
}

/** One skill against the mob. Returns {ok, result, killed, rewards, shots, log} or {ok: false, reason}. */
export function useHuntSkill(session, rawIndex, {now = Date.now(), random = Math.random} = {}) {
    const hunt = ensureHunt(session,now,random);
    const swings = advanceHunt(session, now, random);
    if (isDead(session, now)) return {ok: false, reason: 'dead', log: swings, changed: swings.length > 0};
    const mob = hunt.mob;
    const index = Number(rawIndex);
    const skill = session.game.gameClass.skills?.[index];
    const fail = reason => ({ok: false, reason, log: swings, changed: swings.length > 0});
    if (!Number.isInteger(index) || !skill) return fail('invalid_skill');
    const geometry=skillSpatial(session,skill,now);
    if(hunt.field){
        if(geometry?.weapon)return setHuntAttack(session,true,now);
        if(!geometry)return fail('combat_data_missing');
        if(needsTarget(geometry)&&!mob)return fail('no_mob');
        const usable=isPlayerCanUseSkill(session,skill,now);
        if(usable)return fail(['','not_enough_resource','cooldown','skill_locked','no_ammo','effect_blocked'][usable]);
        const blocked=fieldPvpSkillBlock(session,skill,now);if(blocked)return fail(blocked);
        delete hunt.field.pendingRoom;
        delete hunt.field.crossing;
        hunt.field.action={kind:'skill',index,targetId:mob?.instanceId,phase:'approach'};
        if(session.game.world)session.game.world.channel=null;
        hunt.field.seenAt=now;hunt.lastActionAt=now;
        if(!inSkillReach(battleField(hunt),mob,geometry)){
            const move=approachTarget(session,mob,geometry,now);
            if(!move.ok){delete hunt.field.action;return fail(move.reason);}
            return {ok:true,queued:true,phase:'approach'};
        }
        hunt.field.path=[];
        if(geometry.windup>0){hunt.field.action.phase='cast';hunt.field.action.until=now+geometry.windup;return {ok:true,queued:true,phase:'cast'};}
        delete hunt.field.action;
    }else if(!mob&&hostileSkill(skill))return fail('no_mob');
    return {...performHuntCast(session,skill,mob,geometry,{now,random}),log:swings};
}

function performHuntCast(session,skill,mob,geometry,{now,random}) {
    const hunt=ensureHunt(session,now,random),fail=reason=>({ok:false,reason});
    if(isDead(session,now))return fail('dead');
    const pvpBlock = fieldPvpSkillBlock(session,skill,now);
    if (pvpBlock) return fail(pvpBlock);
    const usable = isPlayerCanUseSkill(session, skill,now);
    if (usable === 3) return {...fail('skill_locked'), needLevel: number(skill.needLvl)};
    if (usable === 1) return fail('not_enough_resource');
    if (usable === 2) return fail('cooldown');
    if (usable === 4) return fail('no_ammo');
    if (usable === 5) return fail('effect_blocked');

    const targets=hostileSkill(skill)&&hunt.field?spatialTargets(battleField(hunt),mob,geometry,random):[mob];
    if(hostileSkill(skill)&&!targets.length)return fail('no_mob');
    if(hunt.field&&hostileSkill(skill))for(const target of targets)provokeMob(hunt,target,now);

    const {cost, costHp} = getEffectiveSkillCost(skill, getMaxHp(session, session.game.gameClass), session);
    skillUsagePayCost(session, costHp > 0 ? 'hp' : 'mp', costHp > 0 ? costHp : cost);
    spendAmmo(session, skill);

    const shots = armShots(session, skill);
    armAttackRune(session, now);
    let result;const targetResults=[];
    try {
        // Resolve secondary targets before consuming the caster's one-action buff charges.
        for(const target of [...targets.slice(1),targets[0]]) {
            if(isDead(session,now))break;
            const ordinal=targets.indexOf(target);
            const damageScale=geometry?.weapon&&geometry.radius&&ordinal>0?.85/Math.pow(1.15,ordinal-1):1;
            const hit=castSkill(session,target?asBoss(target):null,skill,{now,l2Target:target,random,secondary:target!==targets[0],damageScale});
            targetResults.push({targetId:target?.instanceId,...hit});
            if(target===targets[0])result=hit;
        }
        result ||= targetResults[0];
    } finally {
        // never leave the one-cast boosts armed for the next fight if the cast throws
        clearShots(session);
        clearAttackRune(session);
    }
    if (shots) result.shots = shots;
    if(!geometry?.weapon)setSkillCooldown(skill, session,now);
    hunt.lastActionAt = now;
    const questGains = recordQuestEvent(session, {type: 'skill', skill}).gains;

    let killed = false;
    let rewards = null;const rewardRows=[];
    for(const mob of targets.filter(target=>target&&target.currentHp<=0))if (skill.isDealDamage) {
        killed = true;
        mob.currentHp = 0;
        rewards = finishKill(session,hunt,mob,{random,now,deferLoot:true});
        rewardRows.push(rewards);
        if (!hunt.field) hunt.mob = null;
    }
    if(rewardRows.length)rewards=notifyLoot(hunt,rewardRows,now);
    if(targetResults.length>1)result.targets=targetResults;
    const affected=targetResults.filter(hit=>hit.type==='damage');
    if(hunt.field)hunt.field.lastStrike={at:now,name:skill.name,kind:result?.type||'damage',magic:skillCombatType(skill,session.game.gameClass)==='magic',facing:mob?Math.atan2(mob.y-hunt.field.y,mob.x-hunt.field.x):hunt.field.facing||0,spatial:geometry,x:hunt.field.x,y:hunt.field.y,
        targets:affected.map(hit=>{const target=targets.find(m=>m?.instanceId===hit.targetId);return {id:hit.targetId,x:target.x,y:target.y,damage:hit.dealt,critical:Boolean(hit.isHasCritical),missed:Boolean(hit.missed)};})};
    for(const hit of affected)pushLog(hunt,'⚔️',`${skill.name}: ${targets.find(m=>m?.instanceId===hit.targetId)?.name||''} −${hit.dealt}.`,now,{combat:{kind:hit.evaded?'evade':hit.missed?'miss':'outgoing',actor:playerName(session),target:targets.find(m=>m?.instanceId===hit.targetId)?.name||'',amount:Number(hit.dealt)||0}});
    for(const hit of targetResults.filter(hit=>hit.type==='heal'))pushLog(hunt,'✚',`${playerName(session)} восстанавливает ${Number(hit.heal)||0} HP.`,now,{combat:{kind:'heal',actor:playerName(session),target:playerName(session),amount:Number(hit.heal)||0}});
    return {ok: true, result, killed, rewards, shots: shots || null, questGains};
}

function notifyLoot(hunt,rows,now){
    const items=new Map();
    for(const row of rows)for(const item of row.items||[]){const key=item.item||item.name;const old=items.get(key);items.set(key,{...item,amount:(old?.amount||0)+item.amount});}
    const sum=key=>rows.reduce((n,row)=>n+(Number(row[key])||0),0);
    const rewards={...rows.at(-1),exp:sum('exp'),sp:sum('sp'),gold:sum('gold'),items:[...items.values()],leveledUp:rows.some(r=>r.leveledUp)};
    const notice={at:now,exp:rewards.exp,sp:rewards.sp,gold:rewards.gold,items:rewards.items,leveledUp:rewards.leveledUp};
    hunt.lastLoot=notice;
    pushLog(hunt,'🏆',`Получено: ${rewards.exp} опыта, ${rewards.sp} SP${rewards.gold?`, ${rewards.gold} адены`:''}${rewards.items.map(i=>`, ${i.name} ×${i.amount}`).join('')}.${rewards.leveledUp?' Новый уровень!':''}${rows.some(r=>r.party?.length)?' Группа получила свою долю.':''}`,now,{loot:notice});
    return rewards;
}

function finishKill(session,hunt,mob,{random,now,deferLoot=false}){
    if (mob.rewarded) return mob.rewarded;
    const rewards=grantKillRewards(session,mob,getMobDef(getZone(mob.zone),mob.mobId),{random,now});
    rewards.karmaReduced=reduceHuntKarma(session,rewards);
    mob.rewarded = rewards;
    recordSeedKill(session,mob,now);
    hunt.kills=number(hunt.kills)+1;hunt.last={name:mob.name,level:mob.level,champion:mob.champion,...rewards};
    if(!deferLoot)notifyLoot(hunt,[rewards],now);
    if (hunt.field) {
        removeBattleActor(hunt,mob.instanceId);
        if(!session.game.world?.instanceId&&(!mob.rewardless||mob.sourceNativeRespawn)&&mob.sourceRespawnMs!==0){
            const room=roomById(getZone(hunt.zone),mob.sourceRoom||hunt.field.room,hunt.field.floor||1);
            const replacement=randomPopulationRespawn(hunt.field,mob,room,now,random);
            if(replacement)(hunt.field.respawns ||= []).push(replacement);
            else if(replacement===undefined)(hunt.field.respawns ||= []).push({at:now+(mob.sourceRespawnMs??HUNT.mobRespawnMs)+Math.round((random()*2-1)*(mob.sourceRespawnRandomMs||0)),room:mob.sourceRoom||hunt.field.room,sourceSlot:mob.sourceSlot??null});
        }
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
        social: Boolean(mob.clanHelpRange>0&&mob.socialClans?.length),
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
