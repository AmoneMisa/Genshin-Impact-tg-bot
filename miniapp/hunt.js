import {soulCrystalState,soulChargeInfo} from '../functions/game/equipment/soulCrystals.js';
// Hunting fields: zones by level, a real-time fight with one mob at a time (skills, potions, shots) and
// the Blue / Red champions. The fight itself is functions/game/hunt/; this module is the Mini App face.
import { CHAMPIONS, HUNT } from '../functions/game/hunt/huntConfig.js';
import { getZones } from '../functions/game/hunt/huntMobs.js';
import { advanceHunt, ensureHunt, fleeHunt, mobDto, enterHuntField, moveHuntField, selectHuntTarget, useHuntSkill } from '../functions/game/hunt/huntFight.js';
import { huntDropPreview, LOOT_KINDS } from '../functions/game/hunt/huntRewards.js';
import { getZone, getMobDef } from '../functions/game/hunt/huntMobs.js';
import {fieldPvpStatus,fieldPvpSkillBlock} from '../functions/game/hunt/fieldPvpState.js';
import {memberName} from './social.js';
import { potionBarDto, skillDto } from './boss.js';
import { playerEffectsDto } from './bossEffects.js';
import { getShotsState, setAutoShots } from '../functions/game/shots/shots.js';
import { getVitalityState } from '../functions/game/player/vitality.js';
import getCurrentHp from '../functions/game/player/getters/getCurrentHp.js';
import getCurrentMp from '../functions/game/player/getters/getCurrentMp.js';
import getCurrentCp from '../functions/game/player/getters/getCurrentCp.js';
import getMaxHp from '../functions/game/player/getters/getMaxHp.js';
import getMaxMp from '../functions/game/player/getters/getMaxMp.js';
import getMaxCp from '../functions/game/player/getters/getMaxCp.js';
import getUserName from '../functions/getters/getUserName.js';
import { getHotbar, setHotbar, activateLifeStone, HOTBAR_MAX } from '../functions/game/player/hotbar.js';
import { castL2Buff } from './l2Buffs.js';
import {battleSpecialDto,excludeToggleSkills} from './battleSpecial.js';

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
    return {
        // true when mob swings were applied: the session has to be saved
        changed: swings.length > 0,
        soulCrystals:{...soulCrystalState(session),charge:soulChargeInfo(session,hunt.mob)},
        zones: getZones().map(zone => zoneDto(zone, level)),
        zone: hunt.zone,
        mob: hunt.mob ? {...mobDto(hunt.mob, now), drops: huntDropPreview(level, getMobDef(getZone(hunt.mob.zone), hunt.mob.mobId), hunt.mob.champion)} : null,
        field: hunt.field ? {x: hunt.field.x, y: hunt.field.y, target: hunt.field.target, title: getZone(hunt.zone)?.title, mobs: hunt.field.mobs.map(m => mobDto(m, now))} : null,
        players: peers.map(peer => fieldPlayerDto(peer,now)),
        pvpLog: (game.worldPvp?.log || []).map(row=>({...row,agoMs:Math.max(0,now-row.at)})),
        kills: number(hunt.kills),
        last: hunt.last || null,
        log: hunt.log.map(row => ({icon: row.icon, text: row.text, agoMs: Math.max(0, now - number(row.at))})),
        champions: Object.values(CHAMPIONS).map(({id, label, chance, hp: hpMul, exp, drops}) => ({id, label, chance, hp: hpMul, exp, drops})),
        vitality: getVitalityState(session, now),
        shots: getShotsState(session),
        player: {
            name: session.userId ? (await getUserName(session.userId, 'name') || 'Игрок') : 'Игрок',
            level,
            className: gameClass?.stats?.name || 'noClass',
            gender: session.gender === 'female' ? 'female' : 'male',
            pvp:fieldPvpStatus(session,now),
            hp, maxHp, hpPercent: percent(hp, maxHp),
            mp, maxMp, mpPercent: percent(mp, maxMp),
            cp, maxCp, cpPercent: percent(cp, maxCp),
            effects: [...fieldPlayerDto(session,now).effects, ...playerEffectsDto([],respawnRemainMs,now), ...(hunt.playerDebuffs || []).filter(e => e.until > now).map(e => ({id: e.kind, label: 'Атаки ослаблены', value: e.amount, count: Math.ceil((e.until - now) / 1000)}))],
            respawnRemainMs,
            skills: excludeToggleSkills((gameClass?.skills || []).map((skill, index) => {const dto=skillDto(session,skill,index,now);return {...dto,canUse:dto.canUse && !fieldPvpSkillBlock(session,skill,now)};}),special,session),
            potions: potionBarDto(session),
            hotbar: getHotbar(session),
            hotbarMax: HOTBAR_MAX,
            special,
        },
    };
}

export function fieldPlayerDto(session,now=Date.now()) {
    const cp=getCurrentCp(session),hp=getCurrentHp(session),mp=getCurrentMp(session);
    const maxCp=getMaxCp(session),maxHp=getMaxHp(session),maxMp=getMaxMp(session);
    const fx=session.game.worldPvp?.effects || {};
    const effects=playerEffectsDto(session.game.effects,0,now);
    for(const e of fx.debuffs || []) if(e.until>now) effects.push({id:e.kind,label:e.kind,count:Math.ceil((e.until-now)/1000)});
    if(fx.stunUntil>now)effects.push({id:'stun',label:'Оглушён',count:Math.ceil((fx.stunUntil-now)/1000)});
    return {userId:session.userId,name:memberName(session),level:session.game.stats.lvl,className:session.game.gameClass.stats.name,gender:session.gender || 'male',cp,hp,mp,maxCp,maxHp,maxMp,effects,pvp:fieldPvpStatus(session,now),x:session.game.hunt?.field?.x,y:session.game.hunt?.field?.y};
}

export function startHuntForMiniApp(session, zoneId, now = Date.now()) {
    return enterHuntField(session, String(zoneId || ''), {now});
}

export const moveHuntForMiniApp = (session, direction) => moveHuntField(session, direction);
export const targetHuntForMiniApp = (session, targetId) => selectHuntTarget(session, targetId);

export const useHuntSkillForMiniApp = (session, skillIndex, now = Date.now()) => useHuntSkill(session, skillIndex, {now});
export const setHotbarForMiniApp = (session, slots) => setHotbar(session, slots);
/** The second tab of the skill bar: a Life Stone skill (`ls`) or a toggle skill of the class (`l2:<id>`). */
export function useSpecialForMiniApp(session, id, now = Date.now()) {
    if (String(id).startsWith('ls:')) {
        const result = activateLifeStone(session, now);
        return result.ok ? {ok: true, name: result.name, seconds: result.seconds, changed: true} : {ok: false, reason: result.reason, cooldownMs: result.cooldownMs};
    }
    if (String(id).startsWith('l2:')) return castL2Buff(session, id, null, {now});
    return {ok: false, reason: 'unknown_special'};
}
export const fleeHuntForMiniApp = (session, now = Date.now()) => fleeHunt(session, now);
export const setAutoShotsForMiniApp = (session, enabled) => ({ok: true, enabled: setAutoShots(session, enabled), shots: getShotsState(session)});

/** The real drop tables of one zone, per monster, for the level of the viewer (heavy, so not part of the screen state). */
export function getZoneLoot(session, zoneId) {
    const zone = getZones().find(entry => entry.id === String(zoneId));
    if (!zone) return {ok: false, reason: 'unknown_zone'};
    const level = Math.max(1, number(session.game.stats?.lvl, 1));
    return {
        ok: true,
        zone: zone.id,
        kinds: LOOT_KINDS.map(kind => ({id: kind.id, label: kind.label, icon: kind.icon})),
        mobs: zone.mobs.map(mob => ({id: mob.id, name: mob.name, level: mob.level, drops: huntDropPreview(level, mob)})),
    };
}
