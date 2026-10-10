// The battle skills of the professions, taken from the real High Five class trees (template/l2Classes.js).
//
// A start class fights with the base kit of its family (classSkillsTemplate.js, slots 0-2). Every profession
// keeps the kit of its parent in the same slots - so a skill's enchant level survives a promotion - and adds two
// skills from its own real tree (slots 3-4 at the 1st profession, 5-6 at the 2nd, 7-8 at the 3rd); the 3rd
// profession also awakens two more (slots 9-10, which want a boss essence for their top enchant levels).
//
// A real skill becomes an engine skill (see classSkillsTemplate.js for the fields) by what it does:
//   damage      PhysicalDamage / MagicalDamage / FatalBlow / HpDrain ...   -> strong_attack / magic_attack / vampire
//   control     Stun / Sleep / Root / Paralyze / Fear ...                  -> a hit with a stun / weakening
//   heal        Heal / HealPercent / CpHeal                                -> heal
//   buff        a self / party buff with stat changes                      -> buff (damage, guard, haste, evade ...)
// The real name and the real order of power, mana and reuse are kept; the numbers are scaled to the engine
// (a boss fight is a duel of long cooldowns, not a farm of three-second skills). Real skill names stay in English
// like the real item names.
import l2 from './l2Classes.js';
import {L2_CLASS_META} from './l2ClassMeta.js';
import {L2_EFFECT_SKILLS} from './l2EffectSkills.js';
import {CLASS_SKILLS as SCRYDE_SKILLS} from './scrydeSpells.js';

const flags = {cooldown: 0, isSelf: false, isDealDamage: false, isHeal: false, isShield: false, isBuff: false, costHp: 0, cost: 0};

const DAMAGE = new Set(['PhysicalDamage', 'MagicalDamage', 'FatalBlow', 'HpDrain', 'PhysicalSoulDamage', 'MagicalSoulDamage', 'EnergyDamage', 'MagicalDamageMp', 'DamOverTime', 'Lethal']);
const HEAL = new Set(['Heal', 'HealPercent', 'CpHeal', 'CpHealPercent', 'HealOverTime']);
const MANA = new Set(['ManaHealPercent', 'ManaHeal', 'ManaHealByLevel']);
// the real stats a buff can move that the engine buffs know how to express
const BUFF_STATS = new Set(['pAtk', 'mAtk', 'pDef', 'mDef', 'shieldDef', 'pAtkSpd', 'mAtkSpd', 'runSpd', 'rCrit', 'mCritRate', 'rEvas', 'rShld', 'sDef', 'maxHp', 'maxMp', 'maxCp']);
const CONTROL = new Set(['Stun', 'Sleep', 'Root', 'Paralyze', 'Fear', 'Mute', 'PhysicalMute', 'Petrification', 'Disarm']);
const AVOID = new Set(['Summon', 'Transformation', 'Resurrection', 'ResurrectionSpecial', 'Escape', 'ClanGate', 'FakeDeath', 'Hide', 'SilentMove', 'BlockChat', 'BlockParty', 'Flag', 'DeleteHateOfMe', 'ChangeFishingMastery', 'VitalityPointUp', 'NevitsHourglass', 'ServitorShare', 'ConsumeBody']);
const MAGIC_STATS = new Set(['mAtk', 'mDef', 'mAtkSpd']);

/** Score of a damage modifier per tier: the top skill of a class tier is worth this much of an attack. */
const DAMAGE_REF = {2: 3.2, 3: 6, 4: 9, 5: 14};
const HEAL_REF = {2: 0.45, 3: 0.7, 4: 0.9, 5: 1};
const COOLDOWN_CLAMP = [12, 140];
// boss essences the awakened skills of the 3rd profession ask for (they rotate over the classes)
const ESSENCES = ['ignar', 'terrax', 'radjahal', 'pira', 'selene', 'zephyrion', 'tiamara', 'veraxis', 'umbra', 'kivaha'];

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const last = list => (Array.isArray(list) && list.length ? list.at(-1) : null);

const kindOf = skill => {
    const effects = skill.effects || [];
    if (effects.some(name => AVOID.has(name))) return null;
    if (skill.op === 'P') return null;
    if (effects.some(name => DAMAGE.has(name))) return skill.op === 'A1' || skill.op === 'CA1' || skill.op === 'A2' ? 'damage' : null;
    if (effects.some(name => MANA.has(name))) return skill.op === 'A1' ? 'mana' : null;
    if (effects.some(name => HEAL.has(name))) return 'heal';
    if (effects.some(name => CONTROL.has(name))) return skill.op === 'A1' || skill.op === 'CA1' ? 'control' : null;
    if (['A2', 'A3', 'T', 'DA2'].includes(skill.op) && (skill.stats || []).some(node => BUFF_STATS.has(node.stat))) return 'buff';
    return null;
};

/** The skills (unique by id) a class's own tree teaches, with the level they first open at. */
function treeOf(classId) {
    const rows = new Map();
    for (const [id, level, need] of l2.learn[String(classId)] || []) {
        const entry = rows.get(id) || {id, need, maxLevel: level, maxNeed: need};
        entry.need = Math.min(entry.need, need);
        if (level >= entry.maxLevel) { entry.maxLevel = level; entry.maxNeed = need; }
        rows.set(id, entry);
    }
    return [...rows.values()].map(row => {
        const info = l2.skills[String(row.id)];
        return info ? {...row, info, kind: kindOf(info)} : null;
    }).filter(row => row && row.kind);
}

const powerOf = row => last(row.info.power?.slice(0, row.maxLevel)) || 0;
const reuseSeconds = row => (last(row.info.reuse?.slice(0, row.maxLevel)) || 0) / 1000;
const mpOf = row => last(row.info.mp?.slice(0, row.maxLevel)) || 0;
const isMagic = row => row.info.magic === '1' || (row.info.effects || []).some(name => name.startsWith('Magical')) || (row.info.stats || []).some(node => MAGIC_STATS.has(node.stat));

function buffsOf(row) {
    const kinds = new Map();
    for (const node of row.info.stats || []) {
        const value = node.value?.[Math.min(node.value.length, row.maxLevel) - 1];
        if (value === undefined || value === null) continue;
        const rise = node.tag === 'mul' || node.tag === 'basemul' ? (value - 1) * 100 : 0;
        if (['pAtk', 'mAtk'].includes(node.stat)) kinds.set('damage', {kind: 'damage', amount: clamp(Math.round(rise) || 40, 20, 120), charges: 4});
        else if (['pDef', 'mDef', 'shieldDef'].includes(node.stat)) kinds.set('guard', {kind: 'guard', amount: clamp(Math.round(rise / 2) || 25, 15, 60), seconds: 15});
        else if (['pAtkSpd', 'mAtkSpd', 'runSpd'].includes(node.stat)) kinds.set('haste', {kind: 'haste', amount: clamp(Math.round(rise) || 20, 10, 40), seconds: 15});
        else if (['rCrit', 'mCritRate'].includes(node.stat)) kinds.set('critChance', {kind: 'critChance', amount: clamp(Math.round(rise) || 40, 20, 100), charges: 4});
        else if (['rEvas', 'rShld', 'sDef'].includes(node.stat)) kinds.set('evade', {kind: 'evade', amount: 30, seconds: 12});
        else if (['maxHp', 'maxMp', 'maxCp'].includes(node.stat)) kinds.set('guard', {kind: 'guard', amount: 20, seconds: 15});
    }
    if (!kinds.size) kinds.set('damage', {kind: 'damage', amount: 30, charges: 3});
    return [...kinds.values()].slice(0, 2);
}

// what each family wants from the two skills it learns at a profession, in order of preference
const WANTS = {
    warrior: ['buff', 'damage'],
    berserk: ['damage', 'buff'],
    rogue: ['damage', 'control'],
    archer: ['damage', 'control'],
    mage: ['damage', 'control'],
    priest: ['heal', 'buff']
};

function pick(rows, wants, used, tier, promoteLevel) {
    const chosen = [];
    const open = row => !used.has(row.info.name) && !chosen.includes(row);
    const reachable = row => row.need >= promoteLevel && row.need <= promoteLevel + 16;
    for (const want of wants) {
        const pool = rows.filter(row => open(row) && (row.kind === want || (want === 'damage' && row.kind === 'control')));
        const near = pool.filter(reachable);
        const list = near.length ? near : pool;
        // the strongest of the near ones (power, then the higher mana as a sign of a bigger skill)
        list.sort((a, b) => powerOf(b) - powerOf(a) || mpOf(b) - mpOf(a) || a.info.name.localeCompare(b.info.name));
        if (list[0]) chosen.push(list[0]);
    }
    // the family may lack a kind: fill with whatever is left, damage first
    const rest = rows.filter(open).sort((a, b) => (b.kind === 'damage') - (a.kind === 'damage') || powerOf(b) - powerOf(a));
    while (chosen.length < 2 && rest.length) { const next = rest.shift(); if (!chosen.includes(next)) chosen.push(next); }
    return chosen;
}

/**
 * Buffs and debuffs of the real tree also exist as real effects (l2Effects.js): a kit skill that has one carries
 * `l2Cast` and is resolved through it in a fight (castSkill.js); the engine numbers of the skill stay as the model of the
 * arena auto-fight and as the fallback when there is no target for the real effect.
 */
function withRealEffect(skill, row) {
    const real = L2_EFFECT_SKILLS[row.id];
    if (real && (skill.isBuff || skill.debuff)) skill.l2Cast = {id: row.id, hostile: real.kind === 'debuff'};
    return skill;
}

function build(row, {tier, family, slotNeed, fixedNeed = false, awakened = false, essence = null}) {
    return withRealEffect(buildPlain(row, {tier, family, slotNeed, fixedNeed, awakened, essence}), row);
}

function buildPlain(row, {tier, family, slotNeed, fixedNeed = false, awakened = false, essence = null}) {
    const info = row.info;
    const name = info.name;
    const magic = isMagic(row) || ['mage', 'priest'].includes(family);
    const reuse = reuseSeconds(row);
    const needLvl = fixedNeed ? slotNeed : Math.max(slotNeed, row.need);
    const cost = clamp(Math.round(mpOf(row) * 2.4), 20, tier >= 4 ? 320 : 200);
    const base = {name, l2Id: row.id, tier, needLvl, ...flags};
    const enchant = essence ? {enchantItem: {key: `essence_${essence}`, perLevel: 1}} : {};
    if (row.kind === 'heal') {
        const heal = (awakened ? HEAL_REF[5] : HEAL_REF[tier]);
        return {...base, description: `Исцеляет ${Math.round(heal * 100)}% здоровья.`, effect: 'heal', isSelf: true, isHeal: true,
            cooldown: clamp(Math.round(reuse * 5) + 40, 40, 240), cost: Math.max(cost, 60), healPower: heal, ...enchant};
    }
    if (row.kind === 'mana') {
        const share = awakened ? 0.5 : {2: 0.25, 3: 0.35, 4: 0.45}[tier];
        return {...base, description: `Возвращает ${Math.round(share * 100)}% маны.`, effect: 'restore', isSelf: true, restoreMp: share,
            cooldown: clamp(Math.round(reuse * 4) + 60, 60, 240), cost: 0, ...enchant};
    }
    if (row.kind === 'buff') {
        const buffs = buffsOf(row);
        const parts = buffs.map(buff => ({damage: `следующие ${buff.charges} атаки на ${buff.amount}% сильнее`, guard: `получаемый урон ниже на ${buff.amount}% на ${buff.seconds} с`,
            haste: `перезарядка быстрее на ${buff.amount}% на ${buff.seconds} с`, critChance: `шанс крита +${buff.amount}% на ${buff.charges} атаки`, evade: `уклонение +${buff.amount}% на ${buff.seconds} с`}[buff.kind]));
        return {...base, description: `${parts.join('; ')}.`.replace(/^./, c => c.toUpperCase()), effect: 'buff', isSelf: true, isBuff: true,
            cooldown: clamp(Math.round(reuse * 4) + 30, 30, 200), cost: Math.max(cost, 40), buffs, ...enchant};
    }
    // damage and control become a hit
    const control = row.kind === 'control' || (info.effects || []).some(effect => CONTROL.has(effect));
    const ref = awakened ? DAMAGE_REF[5] : DAMAGE_REF[tier];
    const share = row.share ?? 1;
    const damageModifier = Math.round(Math.max(0.5, share) * ref * (row.kind === 'control' ? 0.5 : 1) * 10) / 10;
    const drain = (info.effects || []).includes('HpDrain');
    const fatal = (info.effects || []).some(effect => effect === 'FatalBlow' || effect === 'Lethal');
    const skill = {...base, isDealDamage: true,
        effect: drain ? 'vampire' : magic ? 'magic_attack' : 'strong_attack',
        damageModifier, cost, ...enchant,
        // a skill is worth about a quarter of its damage per second of cooldown (class-balance.test.js keeps the budget);
        // the awakened skills of the 3rd profession are long ones
        cooldown: clamp(Math.max(Math.round(reuse * 4 + tier * 6), Math.ceil(damageModifier / 0.25), awakened ? 90 : 0), COOLDOWN_CLAMP[0], awakened ? 220 : COOLDOWN_CLAMP[1])};
    if (drain) skill.vampirePower = 0.2;
    if (fatal) skill.critChanceBonus = 30;
    // "Double Shot", "Triple Slash", "Dual Blow": the same damage in separate hits (each rolls its own crit)
    const hits = {Double: 2, Dual: 2, Triple: 3, Quadruple: 4}[(/\b(Double|Dual|Triple|Quadruple)\b/.exec(name) || [])[1]];
    if (hits && !drain) {
        skill.effect = 'multi_hit';
        skill.hits = hits;
        skill.damageModifier = Math.round(damageModifier / hits * 100) / 100;
    }
    if (control) skill.debuff = {kind: 'stun', amount: 0, seconds: 3};
    skill.description = skill.hits
        ? `${skill.hits} удара по ${Math.round(skill.damageModifier * 100)}% урона.`
        : `${damageModifier * 100 | 0}% урона${control ? ' и оглушение на 3 с' : ''}${drain ? ', возвращает 20% урона здоровьем' : ''}.`;
    return skill;
}

function shares(rows) {
    const top = Math.max(1, ...rows.filter(row => row.kind === 'damage').map(powerOf));
    for (const row of rows) row.share = row.kind === 'damage' ? clamp(powerOf(row) / top, 0.55, 1) : 1;
    return rows;
}

/** The skills a profession adds on top of its parent's kit (two, plus two awakened ones at the 3rd profession). */
export function ownSkills(classId, family, tier, ancestorNames = new Set()) {
    const meta = L2_CLASS_META[classId];
    const promoteLevel = {2: 20, 3: 40, 4: 76}[tier];
    let rows = shares(treeOf(classId));
    // a thin tree (the Kamael Judicator teaches nine skills): borrow the parent's tree for what is missing
    let parent = meta.parent;
    while (rows.length < 4 && parent !== null && parent !== undefined) {
        rows = rows.concat(shares(treeOf(parent)).filter(row => !rows.some(own => own.id === row.id)));
        parent = L2_CLASS_META[parent]?.parent;
    }
    const used = new Set(ancestorNames);
    const chosen = pick(rows, WANTS[family] || WANTS.warrior, used, tier, promoteLevel);
    // a thin tree: repeat a skill of the tree rather than leaving a slot empty
    for (const row of [...rows].sort((a, b) => powerOf(b) - powerOf(a))) if (chosen.length < 2 && !chosen.includes(row)) chosen.push(row);
    const skills = chosen.map(row => build(row, {tier, family, slotNeed: promoteLevel}));
    chosen.forEach(row => used.add(row.info.name));
    if (tier === 4) {
        let awakened = pick(rows, ['damage', family === 'priest' ? 'heal' : 'damage'], used, 4, promoteLevel + 4);
        // a thin tree: the awakening may reuse a skill the profession already learned, stronger and with an essence
        if (awakened.length < 2) awakened = awakened.concat(rows.filter(row => !awakened.includes(row)).sort((a, b) => powerOf(b) - powerOf(a)).slice(0, 2 - awakened.length));
        skills.push(...awakened.map((row, index) => build(row, {tier, family, slotNeed: [76, 80][index], fixedNeed: true, awakened: true, essence: ESSENCES[(classId + index) % ESSENCES.length]})));
    }
    return skills;
}

/** Full kit (inherited + own, slots assigned) of every profession, built on the base kit of its family. */
export function assembleProfessionSkills(baseSkills) {
    const result = {};
    const build = classId => {
        const meta = L2_CLASS_META[classId];
        if (result[meta.key]) return result[meta.key];
        if (meta.level === 0) return result[meta.key] = baseSkills[meta.family].map(skill => ({...skill}));
        const parentKit = build(meta.parent);
        const parentMeta = L2_CLASS_META[meta.parent];
        // a family change (a rogue becomes an archer) starts from the new family's base kit
        const inherited = parentMeta.family === meta.family ? parentKit : [...baseSkills[meta.family].map(skill => ({...skill})), ...parentKit.slice(baseSkills[parentMeta.family].length).filter(skill => skill.tier)];
        const names = new Set(inherited.map(skill => skill.name));
        const added = ownSkills(classId, meta.family, meta.level + 1, names);
        // the class balance skills of the Scryde server (template/scrydeSpells.js) come after the real ones
        const promoteLevel = {2: 20, 3: 40, 4: 76}[meta.level + 1];
        const specials = SCRYDE_SKILLS.filter(entry => entry.classes.includes(meta.key) && !names.has(entry.name)).map(entry => ({
            ...flags, name: entry.name, description: entry.description, tier: meta.level + 1, needLvl: Math.max(entry.needLvl, promoteLevel), scryde: true, ...entry.skill,
        }));
        return result[meta.key] = [...inherited, ...added, ...specials].map((skill, slot) => ({...skill, slot}));
    };
    for (const id of Object.keys(L2_CLASS_META)) build(Number(id));
    return result;
}

export const START_KIT_SLOTS = 3;
