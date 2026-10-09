// Zones and mobs of the hunting fields: lookup, reference curves, and building a fresh mob for a fight.
import zones from '../../../template/huntingTemplate.js';
import getClassStats from '../player/getters/getGameClassStatsFromTemplate.js';
import { CHAMPIONS, CHAMPION_MIN_LEVEL, HUNT } from './huntConfig.js';
import { MAX_LEVEL } from '../player/vitality.js';
import changePlayerGameClass from '../player/changePlayerGameClass.js';
import updatePlayerStats from '../player/updatePlayerStats.js';
import calcDamage from '../boss/calcDamage.js';

export const getZones = () => zones;
export const getZone = id => zones.find(zone => zone.id === id) || null;
export const getMobDef = (zone, mobId) => zone?.mobs.find(mob => mob.id === String(mobId)) || null;

// "A typical mob of that level": the median of a real stat over every extracted mob within WINDOW levels, so
// each mob can be compared with its neighbours (hp x1.4 means 40% tougher than usual there).
const WINDOW = 5;
const allMobs = zones.flatMap(zone => zone.mobs);
const medians = new Map();
function typical(key, level) {
    const cacheKey = `${key}:${level}`;
    if (!medians.has(cacheKey)) {
        const values = allMobs.filter(mob => Math.abs(mob.level - level) <= WINDOW && mob[key] > 0).map(mob => mob[key]).sort((a, b) => a - b);
        medians.set(cacheKey, values[values.length >> 1] || 1);
    }
    return medians.get(cacheKey);
}
const relative = (mob, key) => mob[key] / typical(key, mob.level);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const heroLevel = level => clamp(Math.round(level), 1, MAX_LEVEL);

/** The bare warrior of that level: the yardstick mob strength is built on. */
export const heroStats = level => getClassStats('warrior', heroLevel(level));


const defenceFor = (level, relativeDefence) => heroStats(level).attack * HUNT.defencePerAttack / HUNT.damageScale * relativeDefence;

// What the basic skill of a bare hero of that class and level deals to a mob of average defence (crits
// averaged in): the yardstick for a mob's hit points, measured with the real damage code so the balance
// follows it and every class needs about the same number of casts.
const hits = new Map();
export function referenceHit(level, className = 'warrior') {
    const lvl = heroLevel(level);
    const key = `${className}:${lvl}`;
    if (!hits.has(key)) {
        const session = {userId: 0, userChatData: {user: {id: 0}}, game: {stats: {lvl, currentExp: 0}, inventory: {}, equipmentStats: {}, effects: [], respawnTime: 0}};
        changePlayerGameClass(session, className);
        updatePlayerStats(session);
        const mob = {name: 'reference', stats: {lvl}, hp: 1, currentHp: 1, debuffs: [], hunt: {defence: defenceFor(lvl, 1), element: null}};
        let total = 0;
        const samples = 48;
        for (let i = 0; i < samples; i += 1) total += calcDamage(session, session.game.gameClass.skills[0], mob, {consume: false}).dmg;
        hits.set(key, Math.max(1, total / samples));
    }
    return hits.get(key);
}

/** Rolls the champion tier of a new mob: 'red', 'blue' or null. */
export function rollChampion(level, random = Math.random) {
    if (level < CHAMPION_MIN_LEVEL) return null;
    const roll = random();
    if (roll < CHAMPIONS.red.chance) return 'red';
    if (roll < CHAMPIONS.red.chance + CHAMPIONS.blue.chance) return 'blue';
    return null;
}

/** Share of the mob's real attack against a typical mob of its level (the attack ones hit harder). */
export const attackRelative = mob => clamp(relative(mob, 'pAtk'), 0.5, 2);

/**
 * A fresh mob for a fight. It has the fields castSkill() and calcDamage() read from a boss (hp, currentHp,
 * stats.lvl, listOfDamage, debuffs, ...) plus `hunt` with the numbers only hunts use.
 */
export function buildMob(zone, mobDef, {now = Date.now(), random = Math.random, champion = rollChampion(mobDef.level, random), className = 'warrior'} = {}) {
    const tier = champion ? CHAMPIONS[champion] : null;
    const hp = Math.max(1, Math.round(HUNT.killCasts * referenceHit(mobDef.level, className) * clamp(relative(mobDef, 'hp'), 0.4, 3) * (tier ? tier.hp : 1)));
    const defence = defenceFor(mobDef.level, clamp(relative(mobDef, 'pDef'), 0.5, 2));
    const attackMs = Math.round(HUNT.attackMs * 253 / (mobDef.attackSpeed || 253));
    return {
        zone: zone.id,
        mobId: mobDef.id,
        name: mobDef.name,
        level: mobDef.level,
        champion: champion || null,
        element: mobDef.element || null,
        hp,
        currentHp: hp,
        stats: {lvl: mobDef.level},
        hunt: {defence, element: mobDef.element || null, atk: attackRelative(mobDef) * (tier ? tier.atk : 1)},
        listOfDamage: [],
        minions: [],
        debuffs: [],
        eventLog: [],
        skill: null,
        enrage: 0,
        attackMs,
        spawnedAt: now,
        nextAttackAt: now + attackMs,
    };
}
