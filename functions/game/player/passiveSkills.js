// Passive skills (Lineage II): the passive skills of the real class trees (template/l2Classes.js), learned level by
// level with skill points. A class learns the passives of its own tree and of every parent class; each level has the
// real character level it opens at and the real SP price (scaled to the SP this game pays, SP_SCALE), some of them
// need the real spellbook item (a material `l2_<item id>`).
//
// The stats of a passive are the real stat nodes of the skill converted to game stats (STAT_MAP): a flat P.Atk of a
// weapon mastery becomes a share of the attack, a "when using a bow" condition keeps it off unless the bow is worn.
// Learned levels live in session.game.l2Passives = {skillId: level}; only the passives of the current class chain
// count, so a class change keeps what was learned but switches it off.
import l2 from '../../../template/l2Classes.js';
import {L2_CLASS_META} from '../../../template/l2ClassMeta.js';
import classStats from '../../../template/classStatsTemplate.js';
import {getMaterialCount, spendMaterials, materialInfo} from './materials.js';
import {resolveClassName} from '../classes/legacyClasses.js';

/** Real SP -> game SP: the whole tree of a 3rd profession costs a few thousand SP, about what a hero earns. */
export const SP_SCALE = 1 / 20000;
export const MAX_PASSIVE_CHARACTER_LEVEL = 85;
/** No single passive moves a stat by more than this share. */
const DELTA_CAP = 0.3;

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

// What a flat real number is worth against a character of the game: the real value / REF is the share it adds.
const REF = {atk: 800, def: 500, hp: 9000, mp: 6000, cp: 4000};

/**
 * Real stat -> game stat: [game stat, kind] with kind 'share' (flat real value / reference, or factor - 1),
 * 'points' (flat value as it is), 'regen' (value / 10) or 'cooldown' (a speed factor cuts the cooldown).
 */
const STAT_MAP = {
    pAtk: ['attackMul', 'share', REF.atk], mAtk: ['attackMul', 'share', REF.atk],
    pDef: ['defenceMul', 'share', REF.def], mDef: ['defenceMul', 'share', REF.def],
    maxHp: ['maxHpMul', 'share', REF.hp], maxMp: ['maxMpMul', 'share', REF.mp], maxCp: ['maxCpMul', 'share', REF.cp],
    rCrit: ['criticalChance', 'points', 10], mCritRate: ['criticalChance', 'points', 10],
    cAtk: ['criticalDamage', 'share', 1],
    accCombat: ['accuracy', 'points', 1], accMagic: ['accuracy', 'points', 1],
    rEvas: ['evasion', 'points', 1],
    runSpd: ['speed', 'points', 1],
    pAtkSpd: ['skillCooltimeMul', 'cooldown', 0.5], mAtkSpd: ['skillCooltimeMul', 'cooldown', 0.5],
    regHp: ['hpRestoreSpeed', 'regen', 10], regMp: ['mpRestoreSpeed', 'regen', 10], regCp: ['cpRestoreSpeed', 'regen', 10],
    sDef: ['block', 'points', 10], rShld: ['block', 'points', 10],
    physicalMpConsumeRate: ['skillMpCostMul', 'share', 1], magicalMpConsumeRate: ['skillMpCostMul', 'share', 1],
};
const STAT_LABEL = {
    attackMul: 'Атака', defenceMul: 'Защита', maxHpMul: 'Макс. HP', maxMpMul: 'Макс. MP', maxCpMul: 'Макс. CP', criticalChance: 'Шанс крита',
    criticalDamage: 'Крит. урон', accuracy: 'Точность', evasion: 'Уклонение', speed: 'Скорость', skillCooltimeMul: 'Перезарядка', hpRestoreSpeed: 'Восст. HP',
    mpRestoreSpeed: 'Восст. MP', cpRestoreSpeed: 'Восст. CP', block: 'Блок', skillMpCostMul: 'Расход MP',
};
const POINT_STATS = new Set(['criticalChance', 'accuracy', 'evasion', 'speed', 'block', 'hpRestoreSpeed', 'mpRestoreSpeed', 'cpRestoreSpeed']);

// "when using a ..." conditions of the real nodes -> our weapon kinds / armor kinds
const WEAPON_KINDS = {
    SWORD: ['oneHandedSword'], DUAL: ['oneHandedSword'], BIGSWORD: ['twoHandedSword'], ANCIENTSWORD: ['twoHandedSword'],
    BLUNT: ['blunt', 'mace'], BIGBLUNT: ['blunt'], DAGGER: ['dagger'], DUALDAGGER: ['dagger'], BOW: ['bow'], CROSSBOW: ['crossbow'],
    FIST: ['fists'], DUALFIST: ['fists'], POLE: [], RAPIER: [], NONE: [],
};
const ARMOR_KINDS = {HEAVY: ['heavy'], LIGHT: ['light'], MAGIC: ['robe']};

/** The class ids of a class and its parents, the class itself first. */
function chainOf(classId) {
    const ids = [];
    let current = classId;
    while (current !== null && current !== undefined && L2_CLASS_META[current] && !ids.includes(current)) {
        ids.push(current);
        current = L2_CLASS_META[current].parent;
    }
    return ids;
}

const classIdOf = session => {
    const name = resolveClassName(session?.game?.gameClass?.stats?.name || 'noClass');
    return classStats.find(item => item.name === name)?.l2Id;
};

const treeCache = new Map();
/** The passive skills of a class chain: [{id, name, levels: [{level, need, sp, items}], info}], by name. */
export function passiveTree(classId) {
    if (treeCache.has(classId)) return treeCache.get(classId);
    const skills = new Map();
    for (const id of chainOf(classId)) {
        for (const [skillId, level, need, sp, items] of l2.learn[String(id)] || []) {
            const info = l2.skills[String(skillId)];
            if (!info || info.op !== 'P' || need > MAX_PASSIVE_CHARACTER_LEVEL) continue;
            let entry = skills.get(skillId);
            if (!entry) skills.set(skillId, entry = {id: skillId, name: info.name, info, levels: new Map()});
            const row = {level, need, sp: Math.max(1, Math.round(sp * SP_SCALE)), items: items || []};
            const known = entry.levels.get(level);
            // the same level in two classes of the chain: the cheaper, earlier one
            if (!known || row.need < known.need || row.sp < known.sp) entry.levels.set(level, row);
        }
    }
    const result = [...skills.values()].map(entry => ({...entry, levels: [...entry.levels.values()].sort((a, b) => a.level - b.level)})).filter(entry => entry.levels.length);
    result.sort((a, b) => a.name.localeCompare(b.name));
    treeCache.set(classId, result);
    return result;
}

/** Every passive skill name of the game (for the art checks). */
export const PASSIVE_SKILL_NAMES = Object.freeze([...new Set(Object.values(l2.skills).filter(skill => skill.op === 'P').map(skill => skill.name))]);
export const PASSIVES = Object.freeze(PASSIVE_SKILL_NAMES.map(name => Object.freeze({id: name, name})));

export function learnedLevel(session, id) {
    const levels = session?.game?.l2Passives;
    return Math.max(0, Math.floor(number(levels?.[id])));
}

function wornKinds(session) {
    const weapons = new Set(), armors = new Set();
    let shield = false;
    for (const item of Object.values(session?.game?.equipmentStats || {})) {
        if (!item) continue;
        if (item.mainType === 'weapon') weapons.add(item.kind);
        else if (item.mainType === 'armor') armors.add(item.kind);
        else if (item.mainType === 'shield') shield = true;
    }
    return {weapons, armors, shield};
}

function conditionHolds(when, worn, session) {
    for (const condition of when || []) {
        if (condition.startsWith('hp<=')) continue; // a low-hp passive is a temporary effect, not a standing one
        const tokens = condition.split(',').map(token => token.trim().toUpperCase()).filter(Boolean);
        if (!tokens.length) continue;
        const weapon = tokens.filter(token => token in WEAPON_KINDS);
        const armor = tokens.filter(token => token in ARMOR_KINDS);
        if (weapon.length && !weapon.some(token => WEAPON_KINDS[token].some(kind => worn.weapons.has(kind)))) return false;
        if (armor.length && !armor.some(token => ARMOR_KINDS[token].some(kind => worn.armors.has(kind)))) return false;
        if (tokens.includes('SHIELD') && !worn.shield) return false;
    }
    return true;
}

/** The game-stat deltas one passive gives at a level: [{stat, delta, when}] (flat points or a share of the stat). */
export function passiveDeltas(info, level) {
    const out = [];
    for (const node of info.stats || []) {
        const map = STAT_MAP[node.stat];
        if (!map) continue;
        const value = node.value?.[Math.min(node.value.length, Math.max(1, level)) - 1];
        if (value === undefined || value === null) continue;
        const [stat, kind, scale] = map;
        let delta;
        if (kind === 'share') delta = node.tag === 'mul' || node.tag === 'basemul' ? value - 1 : (node.tag === 'sub' ? -value : value) / scale;
        else if (kind === 'cooldown') delta = node.tag === 'mul' || node.tag === 'basemul' ? -(value - 1) * scale : 0;
        else if (kind === 'regen') delta = (node.tag === 'mul' || node.tag === 'basemul' ? value - 1 : value) / scale;
        else delta = (node.tag === 'sub' ? -value : value) / scale;
        if (!Number.isFinite(delta) || delta === 0) continue;
        if (!POINT_STATS.has(stat)) delta = Math.max(-DELTA_CAP, Math.min(DELTA_CAP, delta));
        out.push({stat, delta, when: node.when});
    }
    return out;
}

/** Stat deltas of every active passive: {attackMul: 0.04, evasion: 4}. */
export function passiveModifiers(session) {
    const result = {};
    const classId = classIdOf(session);
    if (classId === undefined) return result;
    const worn = wornKinds(session);
    for (const passive of passiveTree(classId)) {
        const level = learnedLevel(session, passive.id);
        if (!level) continue;
        for (const row of passiveDeltas(passive.info, level)) {
            if (!conditionHolds(row.when, worn, session)) continue;
            result[row.stat] = (result[row.stat] || 0) + row.delta;
        }
    }
    return result;
}

const formatDelta = row => {
    const label = STAT_LABEL[row.stat] || row.stat;
    if (POINT_STATS.has(row.stat)) return `${label} ${row.delta >= 0 ? '+' : ''}${Math.round(row.delta * 10) / 10}`;
    return `${label} ${row.delta >= 0 ? '+' : ''}${Math.round(row.delta * 1000) / 10}%`;
};
const describeLevel = (info, level) => {
    const rows = passiveDeltas(info, level);
    return rows.length ? rows.map(formatDelta).join(', ') : null;
};

export function getPassivesState(session) {
    const level = Math.max(1, number(session?.game?.stats?.lvl, 1));
    const sp = Math.max(0, number(session?.game?.inventory?.sp));
    const classId = classIdOf(session);
    const tree = classId === undefined ? [] : passiveTree(classId);
    return {
        family: session?.game?.gameClass?.stats?.name || 'noClass',
        level,
        sp,
        gold: Math.max(0, number(session?.game?.inventory?.gold)),
        passives: tree.map(passive => {
            const have = learnedLevel(session, passive.id);
            const next = passive.levels.find(row => row.level === have + 1) || null;
            const maxLevel = passive.levels.at(-1).level;
            const missingItems = next ? next.items.filter(([item, count]) => getMaterialCount(session, `l2_${item}`) < count) : [];
            return {
                id: String(passive.id),
                name: passive.name,
                stat: describeLevel(passive.info, Math.max(1, have + 1)) ? STAT_LABEL[passiveDeltas(passive.info, Math.max(1, have + 1))[0]?.stat] || 'Бонус' : 'Нет эффекта в игре',
                level: have,
                maxLevel,
                current: have ? describeLevel(passive.info, have) : null,
                next: next ? describeLevel(passive.info, next.level) || '—' : null,
                needLvl: next ? next.need : null,
                cost: next ? {sp: next.sp, gold: 0, items: next.items.map(([item, count]) => ({key: `l2_${item}`, name: materialInfo(`l2_${item}`)?.name || String(item), count}))} : null,
                canLearn: Boolean(next) && level >= next.need && sp >= next.sp && missingItems.length === 0,
            };
        }),
    };
}

/** Raises one passive by a level. The caller saves the session. */
export function learnPassive(session, id) {
    const classId = classIdOf(session);
    const passive = classId === undefined ? null : passiveTree(classId).find(entry => String(entry.id) === String(id));
    if (!passive) return {ok: false, reason: 'unknown_passive'};
    const have = learnedLevel(session, passive.id);
    const next = passive.levels.find(row => row.level === have + 1);
    if (!next) return {ok: false, reason: 'max_level'};
    if (number(session.game.stats?.lvl, 1) < next.need) return {ok: false, reason: 'level_too_low', needLvl: next.need};
    const inventory = session.game.inventory;
    if (number(inventory.sp) < next.sp) return {ok: false, reason: 'not_enough_sp', missing: next.sp - number(inventory.sp)};
    const items = Object.fromEntries(next.items.map(([item, count]) => [`l2_${item}`, count]));
    for (const [key, count] of Object.entries(items)) if (getMaterialCount(session, key) < count) return {ok: false, reason: 'not_enough_items', item: key};

    inventory.sp = number(inventory.sp) - next.sp;
    if (Object.keys(items).length) spendMaterials(session, items);
    if (!session.game.l2Passives || typeof session.game.l2Passives !== 'object') session.game.l2Passives = {};
    session.game.l2Passives[passive.id] = next.level;
    return {ok: true, id: String(passive.id), level: next.level, name: passive.name};
}
