// World bosses: every raid boss and epic of the Lineage II High Five data (template/worldBosses.js) is a boss of the
// game with its own level, location, drop, damage and set of skills. They are not summoned by a chat or a clan: each
// stands in its lair, anyone may challenge it when it is up and after a kill it respawns for everybody.
//
//   - a hero more than LEVEL_GAP levels away from the boss is turned to stone and gets no reward
//   - the fight of each boss runs in its own hidden "chat" (worldScopeId), shared by the players of all chats
//   - the drop table is the real one; the Life Stones (farm) and the eggs of the clans are added by level
import WORLD from '../../../template/worldBosses.js';
import LOOT from '../../../template/l2Loot.js';
import EPIC_REFERENCE from '../../../template/l2EpicReference.js';
import hunting from '../../../template/huntingTemplate.js';
import catacombs from '../../../template/catacombsTemplate.js';
import {lootInfo, itemRow} from '../hunt/lootTable.js';
import {lifestoneKey} from '../../../template/augmentData.js';
import {skillCombatType} from '../player/combatType.js';

/** A hero this many levels away (either way) is petrified by the raid curse and gets nothing. */
export const LEVEL_GAP = 11;

/** The hidden chat of a world boss. Below -4e12 nothing is sent to it (clanScope.js); clans use -4e12..-5.2e12. */
export const WORLD_SCOPE_BASE = 6e12;
export const worldScopeId = npcId => -(WORLD_SCOPE_BASE + Number(npcId));
export const isWorldScope = chatId => Number(chatId) <= -WORLD_SCOPE_BASE;

/** The grand bosses that the game already treats as epics (their jewellery, passes and weapons are theirs). */
export const EPIC_NPC = Object.freeze({
    29001: 'queenAnt', 29006: 'core', 29014: 'orfen', 29022: 'zaken', 29020: 'baium', 29047: 'frintezza', 29068: 'antharas', 29028: 'valakas',
    29118: 'beleth', 29179: 'freya', 29180: 'freyaExtreme',
});

/** Where the real bosses of the epics stand (the lairs of the raids of the original game). */
const EPIC_LOCATION = Object.freeze({
    beleth: 'Замок Белефа', freya: 'Ледяной чертог Фреи', freyaExtreme: 'Ледяной чертог Фреи (экстрим)',
    queenAnt: 'Муравейник (Ant Nest)', core: 'Башня Крумы, 3-й этаж (Cruma Tower)', orfen: 'Море Спор (Sea of Spores)', zaken: 'Остров Дьявола, корабль Закена (Devil\'s Isle)',
    baium: 'Башня Дерзости, 14-й этаж (Tower of Insolence)', frintezza: 'Имперская Гробница (Imperial Tomb)', antharas: 'Логово Антараса (Antharas\' Lair)', valakas: 'Кузница Богов, логово Валакаса (Forge of the Gods)',
});

/**
 * How an epic is entered.
 *   instance  every party fights its own copy; each hero may enter once per INSTANCE_LOCK_MS and gets the reward once
 *   adaptive  an open-world epic that grows with the hero: it is for heroes of the original level and above, its
 *             level, damage and reward follow the level of the hero who calls it
 * The others (Baium, Antharas, Valakas) stand in their lairs for everybody within the level range, and need a party.
 */
export const EPIC_RULES = Object.freeze({
    queenAnt: {adaptive: true}, core: {adaptive: true}, orfen: {adaptive: true},
    zaken: {instance: true}, frintezza: {instance: true}, freya: {instance: true}, freyaExtreme: {instance: true},
    baium: {}, antharas: {}, valakas: {}, beleth: {},
});
export const INSTANCE_LOCK_MS = 3 * 24 * 60 * 60 * 1000;
/** Casts of a bare warrior that one member of the required party has to land: a fight of a full party fits the 15 minutes. */
export const CASTS_PER_PARTY_MEMBER = 600;
export const HP_CAST_CAP = 9000;
/** The shortest pause between two casts of one hero in a world fight (a hero cannot be a machine gun). */
export const BOSS_GCD_MS = 1200;

/** The hidden chat of one party's copy of an instanced boss. */
export function instanceScopeId(name, partyId) {
    let hash = 5381;
    for (const char of `${name}|${partyId}`) hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
    return -(7e12 + hash);
}

const zones = [...hunting, ...catacombs];
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const nearestZone = level => zones.reduce((best, zone) => (Math.abs(zone.level - level) < Math.abs(best.level - level) ? zone : best), zones[0]);

const RACE_ELEMENT = {UNDEAD: 'dark', DRAGON: 'fire', DEMON: 'dark', FAIRY: 'holy', SPIRIT: 'holy', PLANT: 'earth', ANIMAL: 'earth', INSECT: 'earth', ELEMENTAL: 'wind'};
const ART = ['kivaha', 'avrora', 'fjorina', 'radjahal', 'carnevorusIsse', 'terrax', 'zephyrion', 'veraxis', 'tiamara', 'ignar', 'selene'];

// What a real boss skill does in the fight, by its name: area hits, control, healing, strengthening or a plain strike.
const AREA = /(area|wide|range|storm|wave|blast|breath|tail|quake|hurricane|meteor|hellfire|cry|roar|frost|flame strike|spiral|tornado|whirl|shock|burst)/i;
const CONTROL = /(stun|hold|paraly|sleep|poison|curse|decrease|slow|blind|silence|cancel|seal|fear|root|shock|bleed|weak|dispel|mute)/i;
const HEAL = /heal|regenerat|recharge|drain/i;
// the names of passives of the data that are not casts: weapon types, resistances, damage kinds
const PASSIVE_NAME = /(weapons?|attacks?|hands|armor|resist(ance)?|stances?|types?|mastery|immunity|stun resistance)[.!]?$/i;
const BUFF = /(haste|might|shield|resist|buff|power|speed up|berserk|rage|concentration)/i;

const attackOf = (skill, index) => {
    const name = skill.name.replace(/^BOSS\s+/i, '');
    const key = `l2_${skill.id}_${index}`;
    const damageType = skillCombatType(skill);
    if (AREA.test(name)) return {key, name, damageType, icon: '🌋', target: 'all', power: 0.75, weight: 2, description: `${name}: hits the whole party.`};
    if (CONTROL.test(name)) return {key, name, damageType, icon: '☠', target: 'multi', count: 2, power: 1, weight: 2, description: `${name}: hits two fighters.`};
    return {key, name, damageType, icon: '⚔', target: 'single', power: 1.5, weight: 3, description: `${name}: hits the strongest fighter.`};
};

/** The engine attacks of a boss, from the real skills it casts. */
export function attacksOf(row) {
    const casts = row.skills.filter(skill => !PASSIVE_NAME.test(skill.name) && (!HEAL.test(skill.name) && !BUFF.test(skill.name) || CONTROL.test(skill.name) || AREA.test(skill.name)));
    const unique = [...new Map(casts.map(skill => [skill.name, skill])).values()].slice(0, 6);
    const attacks = unique.map((skill, index) => attackOf(skill, index));
    if (!attacks.some(attack => attack.target === 'single')) {
        attacks.unshift({key: 'strike', name: 'Strike', damageType: 'physical', icon: '⚔', target: 'single', power: 1.5, weight: 3, description: 'A heavy blow at the strongest fighter.'});
    }
    // the strongest skill of a boss that has several is its charged ultimate
    if (attacks.length >= 3) {
        const top = attacks.filter(attack => attack.target === 'all').sort((a, b) => b.power - a.power)[0] || attacks.at(-1);
        attacks.push({...Object.fromEntries(Object.entries(top).filter(([key]) => key !== 'weight')), key: `${top.key}_ult`, name: `${top.name} (charged)`, power: top.power * 2, ultimate: true});
    }
    return attacks;
}

const phasesOf = row => {
    const phases = [];
    if (row.skills.some(skill => HEAL.test(skill.name) && /heal/i.test(skill.name))) phases.push({at: 0.5, icon: '✚', say: `${row.name} heals its wounds!`, heal: 0.1});
    if (row.skills.some(skill => BUFF.test(skill.name))) phases.push({at: 0.3, icon: '💢', say: `${row.name} is enraged!`, enrage: 0.25});
    return phases;
};

/** The drop of a boss: the real list as materials of the game, Life Stones for the farm and the usual boss goods. */
export function dropsOf(row) {
    const reference = EPIC_REFERENCE[row.id];
    const source = reference ? reference.drops.filter(drop => drop.id !== 57 && drop.id !== reference.jewelId)
        .map(drop => [drop.id, drop.min, drop.max, drop.chance]) : (LOOT[row.id] || []);
    const real = source.map(([id, min, max, chance]) => {
        const info = lootInfo(id);
        return {item: info.key, chance: Math.min(1, chance / 100), min, max};
    });
    // one stone per kill with a fair chance: Life Stone grades follow the level of the boss
    const grade = row.level >= 80 ? 'S80' : row.level >= 76 ? 'S' : row.level >= 61 ? 'A' : row.level >= 52 ? 'B' : 'C';
    const tier = row.level >= 65 ? 3 : row.level >= 45 ? 2 : 1;
    const items = [
        ...real,
        {item: lifestoneKey(grade), chance: [0.25, 0.35, 0.5][tier - 1], min: 1, max: 1},
        {item: 'skill_scroll', chance: [0.45, 0.55, 0.65][tier - 1], min: 1, max: tier + 1},
        ...(tier >= 2 ? [{item: 'ancient_seal', chance: tier === 2 ? 0.22 : 0.35, min: 1, max: tier - 1}] : []),
    ];
    // the same item more than once in a list: keep the best chance
    const best = new Map();
    for (const drop of items) {
        const known = best.get(drop.item);
        if (!known || drop.chance > known.chance) best.set(drop.item, drop);
    }
    return {sp: [Math.round(row.level * 4), Math.round(row.level * 7)], items: [...best.values()]};
}

/** The drop of an adaptive epic for a hero of this level: Life Stones and the egg follow the higher of the two levels. */
export function adaptiveDrops(drops, level) {
    const grade = level >= 80 ? 'S80' : level >= 76 ? 'S' : level >= 61 ? 'A' : level >= 52 ? 'B' : 'C';
    return {...drops, items: drops.items.map(item => (item.item.startsWith('lifestone_') ? {...item, item: lifestoneKey(grade)} : item))};
}

/** The egg every clan with a fighter gets for the kill: wyverns of the middle levels, dragons, then the ancient. */
export const eggOf = level => (level >= 75 ? {key: 'egg_ancient', count: 1} : level >= 60 ? {key: 'egg_dragon', count: 1} : level >= 40 ? {key: 'egg_wyvern', count: 1} : null);

/** What the real stats of a boss ask of the engine (all the formulas are the ones of the hunting fields). */
export function combatOf(row) {
    const attack = Math.max(row.pAtk, row.mAtk);
    const reference = 10 + row.level * 12;
    const rel = clamp(attack / reference, 0.8, 5);
    return {
        hpMul: 1,
        dangerPct: Math.round((3 + rel * 1.2) * 10) / 10,
        armored: 0,
        ultimateEvery: 6,
        defenceRel: clamp(row.pDef / reference, 0.7, 2.5),
        magicDefenceRel: clamp((row.mDef ?? row.pDef) / reference, 0.7, 2.5),
        magic: row.mAtk > row.pAtk,
    };
}

const respawnOf = level => {
    const hours = clamp(Math.round(3 + level * 0.4), 6, 36);
    return [hours, Math.max(1, Math.round(hours * 0.2))];
};

/** A boss template of the engine (template/bossTemplate.js) for a raid boss of the data. */
export function worldTemplate(row) {
    const zone = nearestZone(row.level);
    const [respawnHours, windowHours] = respawnOf(row.level);
    const tier = row.level >= 65 ? 3 : row.level >= 45 ? 2 : 1;
    const combat = combatOf(row);
    return {
        name: row.name,
        nameCall: row.name,
        title: `Рейд-босс · ${row.level} ур.`,
        element: RACE_ELEMENT[row.race] || null,
        tier,
        weight: 0,
        epic: {respawnHours, windowHours, minLevel: Math.max(1, row.level - LEVEL_GAP), maxLevel: row.level + LEVEL_GAP, jewelChance: 0},
        world: {raid: true, npcId: row.id, level: row.level, location: `Логово ${row.name} · ${zone.title}`, zone: zone.id, race: row.race, hp: row.hp, defenceRel: combat.defenceRel, magicDefenceRel: combat.magicDefenceRel, magic: combat.magic, egg: eggOf(row.level)},
        art: ART[row.id % ART.length],
        description: `${row.name}: рейд-босс ${row.level} уровня. Логово — ${zone.title}.`,
        listOfDamage: [],
        availableSkills: ['reflect', 'hp_regen'],
        stats: {attack: Math.max(1, Math.round(row.pAtk / 20)), defence: Math.max(1, Math.round(row.pDef / 20)), pDef: Math.max(1, Math.round(row.pDef / 20)), mDef: Math.max(1, Math.round((row.mDef ?? row.pDef) / 20)), minDamage: Math.round(row.pAtk * 0.6), maxDamage: Math.round(row.pAtk),
            criticalChance: clamp(row.critical * 10, 20, 50), criticalDamage: 1.8, lvl: 1, currentSummons: 0, needSummons: 3},
        combat: {hpMul: combat.hpMul, dangerPct: combat.dangerPct, armored: 0, ultimateEvery: combat.ultimateEvery},
        minions: [],
        initial: [],
        phases: phasesOf(row),
        drops: dropsOf(row),
        lootMod: {gold: 1 + row.level / 60, crystals: 1 + row.level / 80, experience: 1.5 + row.level / 25},
        skill: {},
        attacks: attacksOf(row),
    };
}

const byId = new Map(WORLD.map(row => [row.id, row]));
const epicIds = new Set(Object.keys(EPIC_NPC).map(Number));

/** Custom RB weapon: half the rarest original full weapon's chance, at most 10%. */
export function epicWeaponChance(name) {
    const reference = Object.values(EPIC_REFERENCE).find(row => row.name === name);
    const chances = reference?.drops.filter(drop => itemRow(drop.id)?.type === 'Weapon' && drop.chance > 0).map(drop => drop.chance / 100) || [];
    return chances.length ? Math.min(0.1, Math.min(...chances) / 2) : 0;
}

/** The world data of an epic of the game: its real level, stats, location and drop. */
export function epicWorld(name) {
    const id = Number(Object.keys(EPIC_NPC).find(key => EPIC_NPC[key] === name));
    const row = byId.get(id);
    if (!row) return null;
    const combat = combatOf(row);
    return {
        ...(EPIC_RULES[name] || {}),
        npcId: id, level: row.level, location: EPIC_LOCATION[name] || nearestZone(row.level).title, zone: nearestZone(row.level).id, race: row.race,
        hp: row.hp, defenceRel: combat.defenceRel, magicDefenceRel: combat.magicDefenceRel, magic: combat.magic, egg: null, drops: dropsOf(row), dangerPct: combat.dangerPct,
        jewelChance: EPIC_REFERENCE[id]?.drops.find(drop => drop.id === EPIC_REFERENCE[id].jewelId)?.chance / 100,
        reference: EPIC_REFERENCE[id]?.stats,
        attacks: row.skills.length >= 2 ? attacksOf(row) : null,
    };
}

/** The raid bosses that become world bosses: real raid bosses of an unused name, not the instance and quest copies. */
const rows = WORLD.filter(row => !row.grand && row.level >= 20 && row.level <= 85 && !epicIds.has(row.id));
const names = new Set();
export const worldRows = rows.filter(row => (names.has(row.name) ? false : names.add(row.name)));

export const worldTemplates = () => worldRows.map(worldTemplate);

/** Scope id of a world boss by its template name. */
export function scopeOfName(name) {
    const row = worldRows.find(item => item.name === name);
    if (row) return worldScopeId(row.id);
    const id = Object.keys(EPIC_NPC).find(key => EPIC_NPC[key] === name);
    return id ? worldScopeId(id) : null;
}
