// Hunting fields: zones by level, a real-time fight with one mob at a time (skills, potions, shots) and
// the Blue / Red champions. The fight itself is functions/game/hunt/; this module is the Mini App face.
import { CHAMPIONS, HUNT } from '../functions/game/hunt/huntConfig.js';
import { getZones } from '../functions/game/hunt/huntMobs.js';
import { advanceHunt, ensureHunt, fleeHunt, mobDto, startHunt, useHuntSkill } from '../functions/game/hunt/huntFight.js';
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

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const percent = (current, max) => (max > 0 ? Math.max(0, Math.min(100, current / max * 100)) : 0);

function zoneDto(zone, level) {
    return {
        id: zone.id,
        title: zone.title,
        level: zone.level,
        min: zone.min,
        max: zone.max,
        // The hero earns experience here while less than 11 levels apart (the real High Five rule).
        recommended: Math.abs(level - zone.level) <= 4,
        reachable: Math.abs(level - zone.level) < HUNT.expMaxGap,
        mobs: zone.mobs.map(mob => ({name: mob.name, level: mob.level, element: mob.element})),
    };
}

/** The whole screen. Applies the mob swings that fell due, so the caller must save the session. */
export async function getHuntState(session, now = Date.now()) {
    const swings = advanceHunt(session, now);
    const hunt = ensureHunt(session);
    const game = session.game;
    const gameClass = game.gameClass;
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
        zones: getZones().map(zone => zoneDto(zone, level)),
        zone: hunt.zone,
        mob: mobDto(hunt.mob, now),
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
            hp, maxHp, hpPercent: percent(hp, maxHp),
            mp, maxMp, mpPercent: percent(mp, maxMp),
            cp, maxCp, cpPercent: percent(cp, maxCp),
            effects: playerEffectsDto(game.effects, respawnRemainMs),
            respawnRemainMs,
            skills: (gameClass?.skills || []).map((skill, index) => skillDto(session, skill, index, now)),
            potions: potionBarDto(session),
        },
    };
}

export function startHuntForMiniApp(session, zoneId, now = Date.now()) {
    return startHunt(session, String(zoneId || ''), {now});
}

export const useHuntSkillForMiniApp = (session, skillIndex, now = Date.now()) => useHuntSkill(session, skillIndex, {now});
export const fleeHuntForMiniApp = (session, now = Date.now()) => fleeHunt(session, now);
export const setAutoShotsForMiniApp = (session, enabled) => ({ok: true, enabled: setAutoShots(session, enabled), shots: getShotsState(session)});
