import {treasureDto} from './treasures.js';
import {getMaterialCount} from '../functions/game/player/materials.js';
import {vortexMarkers} from '../functions/game/world/dragonVortex.js';
import {seedDto} from '../functions/game/world/seedInstances.js';
import {regionLinks} from '../functions/game/world/regionAccess.js';
import {soulCrystalState} from '../functions/game/equipment/soulCrystals.js';
// Hunting fields: zones by level, a real-time fight with one mob at a time (skills, potions, shots) and
// the Blue / Red champions. The fight itself is functions/game/hunt/; this module is the Mini App face.
import { CHAMPIONS, HUNT } from '../functions/game/hunt/huntConfig.js';
import { getZones } from '../functions/game/hunt/huntMobs.js';
import { advanceHunt, ensureHunt, mobDto, enterHuntField, moveHuntField, selectHuntTarget, useHuntSkill } from '../functions/game/hunt/huntFight.js';
import { huntDropPreview, LOOT_KINDS } from '../functions/game/hunt/huntRewards.js';
import { getZone, getMobDef } from '../functions/game/hunt/huntMobs.js';
import { roomLayout, roomById, adjacent, groundHeight } from '../functions/game/hunt/huntRooms.js';
import {locationRaids,levelTransitions,locationLevel} from '../functions/game/hunt/locationLevels.js';
import {shipDto} from '../functions/game/world/zakenShip.js';
import {fieldPvpStatus,fieldPvpSkillBlock} from '../functions/game/hunt/fieldPvpState.js';
import {memberName} from './social.js';
import { potionBarDto, skillDto } from './boss.js';
import { playerEffectsDto } from './bossEffects.js';
import { getShotsState, setAutoShots } from '../functions/game/shots/shots.js';
import { getVitalityState, levelNeed } from '../functions/game/player/vitality.js';
import {playerLevelCap} from '../functions/game/player/classProgression.js';
import getCurrentHp from '../functions/game/player/getters/getCurrentHp.js';
import getCurrentMp from '../functions/game/player/getters/getCurrentMp.js';
import getCurrentCp from '../functions/game/player/getters/getCurrentCp.js';
import getMaxHp from '../functions/game/player/getters/getMaxHp.js';
import getMaxMp from '../functions/game/player/getters/getMaxMp.js';
import getMaxCp from '../functions/game/player/getters/getMaxCp.js';
import getSpeed from '../functions/game/player/getters/getSpeed.js';
import { getHotbar, setHotbar, activateLifeStone, HOTBAR_MAX } from '../functions/game/player/hotbar.js';
import { castL2Buff } from './l2Buffs.js';
import {battleSpecialDto,excludeToggleSkills} from './battleSpecial.js';
import {reviveEntries} from '../functions/game/player/revival.js';
import {markWorldDeath} from '../functions/game/world/death.js';
import {skillSpatial,weaponSpatial} from '../functions/game/hunt/huntSpatial.js';
import {advanceAutoSupplies,huntSuppliesDto} from './huntSupplies.js';
import {huntDropGroups} from '../functions/game/hunt/dropGroups.js';
import {getCombatParty} from './party.js';
import {populationCapacity,hellboundStage} from '../functions/game/hunt/sourcePopulation.js';
import {fieldStream} from '../functions/game/world/continuousField.js';

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const percent = (current, max) => (max > 0 ? Math.max(0, Math.min(100, current / max * 100)) : 0);

function zoneDto(zone, level) {
    return {
        id: zone.id,
        title: zone.title,
        kind:zone.kind||'field',
        entryMin:zone.entryMin,entryMax:zone.entryMax,
        level: zone.level,
        min: zone.min,
        max: zone.max,
        // The hero earns experience here while less than 11 levels apart (the real High Five rule).
        recommended: Math.abs(level - zone.level) <= 4,
        reachable: Math.abs(level - zone.level) < HUNT.expMaxGap,
        mobs: zone.mobs.map(mob => ({id: mob.id, name: mob.name, level: mob.level, element: mob.element})),
    };
}

/** The whole screen. Applies the mob swings that fell due, so the caller must save the session. */
export async function getHuntState(session, now = Date.now(), peers = []) {
    const swings = advanceHunt(session, now);
    const hunt = ensureHunt(session);
    const suppliesChanged = advanceAutoSupplies(session,now);
    const game = session.game;
    const gameClass = game.gameClass;
    const special = battleSpecialDto(session,now);
    if(hunt.field) hunt.field.seenAt=now;
    const level = Math.max(1, number(game.stats?.lvl, 1));
    const maxHp = getMaxHp(session, gameClass);
    const maxMp = getMaxMp(session, gameClass);
    const hp = getCurrentHp(session, gameClass);
    const mp = getCurrentMp(session, gameClass);
    const maxCp = number(getMaxCp(session, gameClass));
    const cp = number(getCurrentCp(session, gameClass));
    const respawnRemainMs = Math.max(0, number(game.respawnTime) - now);
    if(hp<=0)markWorldDeath(session,now);
    return {
        // true when mob swings were applied: the session has to be saved
        changed: swings.length > 0 || suppliesChanged,
        now,lastLoot:hunt.lastLoot||null,world:{mode:game.world?.mode,channel:game.world?.channel,walkHome:game.world?.walkHome,death:game.world?.death||null},
        resurrections:reviveEntries(session,now).filter(s=>s.level>0),
        soulCrystals:soulCrystalState(session),
        zones: getZones().map(zone => zoneDto(zone, level)),
        zone: hunt.zone,
        mob: hunt.mob ? {...mobDto(hunt.mob, now), drops: huntDropPreview(level, getMobDef(getZone(hunt.mob.zone), hunt.mob.mobId), hunt.mob.champion,session)} : null,
        field: hunt.field ? fieldDto(hunt, now, session) : null,
        players: peers.map(peer => fieldPlayerDto(peer,now)),
        party: getCombatParty(session),
        pvpLog: (game.worldPvp?.log || []).map(row=>({...row,agoMs:Math.max(0,now-row.at)})),
        kills: number(hunt.kills),
        last: hunt.last || null,
        log: hunt.log.map(row => ({id:row.id,icon: row.icon, text: row.text,combat:row.combat||null,loot:row.loot||null, at: number(row.at), agoMs: Math.max(0, now - number(row.at))})),
        champions: Object.values(CHAMPIONS).map(({id, label, chance, hp: hpMul, exp, drops}) => ({id, label, chance, hp: hpMul, exp, drops})),
        vitality: getVitalityState(session, now),
        shots: getShotsState(session),
        supplies: huntSuppliesDto(session),
        player: {
            name: memberName(session),
            clanName:game.clanName||null,
            level,
            currentExp: number(game.stats?.currentExp),
            needExp: levelNeed(level),
            maxLevel: playerLevelCap(session),
            className: gameClass?.stats?.name || 'noClass',
            gender: session.gender === 'female' ? 'female' : 'male',
            pvp:fieldPvpStatus(session,now),
            hp, maxHp, hpPercent: percent(hp, maxHp),
            mp, maxMp, mpPercent: percent(mp, maxMp),
            cp, maxCp, cpPercent: percent(cp, maxCp),
            effects: [...fieldPlayerDto(session,now).effects, ...playerEffectsDto([],respawnRemainMs,now), ...(hunt.playerDebuffs || []).filter(e => e.until > now).map(e => ({id: e.kind, kind:'debuff', label: 'Атаки ослаблены', value: e.amount, count: Math.ceil((e.until - now) / 1000)}))],
            respawnRemainMs,
            skills: excludeToggleSkills((gameClass?.skills || []).map((skill, index) => {const dto=skillDto(session,skill,index,now);const spatial=skillSpatial(session,skill,now);return {...dto,spatial,canUse:dto.canUse && Boolean(spatial) && !fieldPvpSkillBlock(session,skill,now)};}),special,session),
            potions: potionBarDto(session),
            hotbar: [...new Set([...getHotbar(session).map(index=>gameClass?.skills?.[index]?.name==='Attack'?'action:attack':index),...(!game.hotbar&&getHotbar(session).length<HOTBAR_MAX?['action:next-target']:[])])],
            hotbarMax: HOTBAR_MAX,
            special,
        },
    };
}

/** The battle area: the monsters of the room the hero stands in, the room itself and the map of a catacomb. */
function fieldDto(hunt, now, session) {
    const field = hunt.field;
    const zone = getZone(hunt.zone);
    const layout = roomLayout(zone,field.floor||1);
    const current = roomById(zone, field.room,field.floor||1) || layout.rooms[0];
    const level=locationLevel(zone.id,field.floor||1);
    const stream=fieldStream(zone,layout,current);
    const capacity=room=>room.spawns?populationCapacity(room,session,zone.id):room.cap;
    const visited = new Set(field.visited || [current.id]);
    const pending = (field.respawns || []).filter(entry => entry.room === current.id);
    const nextSpawnMs = pending.length ? Math.max(0, Math.min(...pending.map(entry => entry.at)) - now) : 0;
    return {
    x: field.x, y: field.y, runSpeed:getSpeed(session), walls:field.walls||[], path: field.path || [], moveAt: field.moveAt, floor: field.floor || 1, floors:zone?.floors||(zone?.id==='tower-of-insolence'?14:1), target: field.target,
        continuous:stream,
        autoAttack:Boolean(field.autoAttack),attack:weaponSpatial(session,now),pendingRoom:field.pendingRoom||null,ship:shipDto(session,now),seed:seedDto(session,now),treasure:treasureDto(session,now),vortices:vortexMarkers(session),vortexBoneCount:getMaterialCount(session,'l2_17248'),raids:locationRaids(hunt.zone,field),links:regionLinks(hunt.zone,field),
        lastStrike:field.lastStrike&&now-field.lastStrike.at<900?field.lastStrike:null,
        action:field.action?{...field.action,name:session.game.gameClass.skills[field.action.index]?.name,
            spatial:skillSpatial(session,session.game.gameClass.skills[field.action.index],now)}:null,
        exits:layout.map?layout.rooms.filter(r=>adjacent(current,r)).map(r=>({id:r.id,name:visited.has(r.id)?r.name:'Не исследовано',
            side:r.col>current.col?'east':r.col<current.col?'west':r.row>current.row?'south':'north'})):[],
        title:level?.title||zone?.title,level:levelTransitions(zone.id,field),sceneKey:`${hunt.zone}:${current.id}${level?':floor-'+(field.floor||1):current.sceneVariant?':area-'+current.sceneVariant:''}`,environment:current.environment,layoutSource:current.layoutSource,
        phase:zone.id==='hellbound'?{stage:hellboundStage(session),locked:hellboundStage(session)===0}:null,
        room: {id: current.id, name: current.name, landmark:stream?null:level?(layout.map?'Зал '+(current.row*layout.cols+current.col+1):null):current.landmark||null, big: current.big, cap: capacity(current), height: groundHeight(capacity(current))},
        map: layout.map ? {
            cols: layout.cols, rows: layout.rows,exploration:Boolean(layout.exploration),
            rooms: layout.rooms.map(room => ({
                id: room.id, row: room.row, col: room.col, big: room.big, cap: capacity(room),
                current: room.id === current.id,
                visited: visited.has(room.id),
                adjacent: adjacent(current, room),
                passages:levelTransitions(zone.id,{...field,room:room.id})?.destinations.filter(d=>d.room===room.id).map(d=>d.title)||[],
                // a room the hero knows shows its name and how many monsters stand there now
                name: visited.has(room.id) ? room.name : '',
                mobs: room.id === current.id ? field.mobs.length : visited.has(room.id) ? (field.rooms?.[room.id]?.mobs.length ?? 0) : null,
            })),
        } : null,
        respawning: pending.length,
        nextSpawnMs,
        mobs: field.mobs.map(m => mobDto(m, now)),
    };
}

export function fieldPlayerDto(session,now=Date.now()) {
    const cp=getCurrentCp(session),hp=getCurrentHp(session),mp=getCurrentMp(session);
    const maxCp=getMaxCp(session),maxHp=getMaxHp(session),maxMp=getMaxMp(session);
    const fx=session.game.worldPvp?.effects || {};
    const effects=playerEffectsDto(session.game.effects,0,now);
    for(const e of fx.debuffs || []) if(e.until>now) effects.push({id:e.kind,kind:'debuff',label:e.kind,count:Math.ceil((e.until-now)/1000)});
    if(fx.stunUntil>now)effects.push({id:'stun',kind:'debuff',label:'Оглушён',count:Math.ceil((fx.stunUntil-now)/1000)});
    return {userId:session.userId,name:memberName(session),clanName:session.game.clanName||null,level:session.game.stats.lvl,className:session.game.gameClass.stats.name,gender:session.gender || 'male',cp,hp,mp,maxCp,maxHp,maxMp,effects,pvp:fieldPvpStatus(session,now),x:session.game.hunt?.field?.x,y:session.game.hunt?.field?.y};
}

export function startHuntForMiniApp(session, zoneId, now = Date.now()) {
    return enterHuntField(session, String(zoneId || ''), {now});
}

export const moveHuntForMiniApp = (session, direction) => moveHuntField(session, direction);
export const targetHuntForMiniApp = (session, targetId) => selectHuntTarget(session, targetId);

export const useHuntSkillForMiniApp = (session, skillIndex, now = Date.now()) => useHuntSkill(session, skillIndex, {now});
export const setHotbarForMiniApp = (session, slots) => setHotbar(session, slots);
export function getHuntDropForMiniApp(session,targetId){
    const mob=ensureHunt(session).field?.mobs?.find(m=>m.instanceId===targetId);
    if(!mob)return {ok:false,reason:'no_mob'};
    const definition=getMobDef(getZone(mob.zone),mob.mobId);
    if(!definition)return {ok:false,reason:'combat_data_missing'};
    const rows=huntDropPreview(session.game.stats.lvl,definition,mob.champion,session);
    return {ok:true,dropPreview:{name:mob.name,targetId:mob.instanceId,groups:huntDropGroups(rows)}};
}
/** The second tab of the skill bar: a Life Stone skill (`ls`) or a toggle skill of the class (`l2:<id>`). */
export function useSpecialForMiniApp(session, id, now = Date.now()) {
    if (String(id).startsWith('ls:')) {
        const result = activateLifeStone(session, now);
        return result.ok ? {ok: true, name: result.name, seconds: result.seconds, changed: true} : {ok: false, reason: result.reason, cooldownMs: result.cooldownMs};
    }
    if (String(id).startsWith('l2:')) return castL2Buff(session, id, null, {now});
    return {ok: false, reason: 'unknown_special'};
}
export const setAutoShotsForMiniApp = (session, enabled, kind=null) => {
    if(kind!==null&&!['soulshot','blessed'].includes(kind))return {ok:false,reason:'invalid_shot_kind'};
    return {ok:true,enabled:setAutoShots(session,enabled,kind),shots:getShotsState(session)};
};

/** The real drop tables of one zone, per monster, for the level of the viewer (heavy, so not part of the screen state). */
export function getZoneLoot(session, zoneId) {
    const zone = getZones().find(entry => entry.id === String(zoneId));
    if (!zone) return {ok: false, reason: 'unknown_zone'};
    const level = Math.max(1, number(session.game.stats?.lvl, 1));
    return {
        ok: true,
        zone: zone.id,
        kinds: LOOT_KINDS.map(kind => ({id: kind.id, label: kind.label, icon: kind.icon})),
        mobs: zone.mobs.map(mob => ({id: mob.id, name: mob.name, level: mob.level, drops: huntDropPreview(level, mob,null,session)})),
    };
}
