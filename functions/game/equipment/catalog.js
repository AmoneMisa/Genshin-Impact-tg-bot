// The equipment catalog: every wearable item is a fixed, named Lineage 2 (High Five) item of one grade,
// built from template/equipmentTemplate.js - the kinds give the slot / secondary stats and `lineage` the
// real names and numbers. Nothing here is random.
import { randomBytes } from 'node:crypto';
import equipmentTemplate from '../../../template/equipmentTemplate.js';
import epicWeapons from '../../../template/epicWeapons.js';
import customSets from '../../../template/customSets.js';
import { classFamily } from '../classes/classFamily.js';

export const ARMOR_TYPES = Object.freeze(['heavy', 'light', 'robe']);

// Share of the grade's price / crystals by what the item is.
const SLOT_SHARE = {weapon: 1, up: 0.8, fullBody: 1.2, down: 0.5, helmet: 0.35, gloves: 0.3, boots: 0.3, shield: 0.5, jewelry: 0.4};

// A set is complete with these four parts: the body cover is a chest + legs pair or one full-body piece.
export const SET_PARTS = Object.freeze(['helmet', 'gloves', 'boots']);

export function gradeIndex(gradeName, template = equipmentTemplate) {
    return template.grades.findIndex(grade => grade.name === gradeName);
}

export function gradeInfo(gradeName, template = equipmentTemplate) {
    return template.grades.find(grade => grade.name === gradeName) || null;
}

/** The slot-share key of a kind (armor by what it covers). */
export function slotShareKey(kindOrItem) {
    if (kindOrItem.mainType === 'weapon') return 'weapon';
    if (kindOrItem.mainType === 'shield') return 'shield';
    if (kindOrItem.mainType === 'jewelry') return 'jewelry';
    if (kindOrItem.category === 'fullBody') return 'fullBody';
    if (kindOrItem.category === 'body') return 'up';
    if (kindOrItem.category === 'greaves') return 'down';
    return kindOrItem.category;
}

/** What a class is called in a kind's `classOwner` list (the rogue line is still "assassin" there). */
export function classOwnerToken(className) {
    const family = classFamily(className);
    if (family === 'berserk') return 'warrior';
    if (family === 'rogue') return 'assassin';
    return family;
}

/** Can the player's class wear / wield this item? Characters without a class (or an unknown one) can wear anything. */
export function canClassUse(className, item) {
    if (!className || className === 'noClass') return true;
    if (!Array.isArray(item?.classOwner) || !item.classOwner.length) return true;
    return item.classOwner.includes(classOwnerToken(className));
}

function entry(template, grade, mainType, kind, name, extra = {}) {
    const index = gradeIndex(grade.name, template);
    const share = slotShareKey({mainType, category: kind.category});
    const rarity = template.rarity.find(item => item.name === template.gradeRarity[grade.name]);
    const idParts = [grade.name, mainType, kind.type];
    if (mainType === 'armor') idParts.push(kind.category);
    return {
        id: idParts.join(':'),
        name,
        description: '',
        grade: grade.name,
        classOwner: [...kind.classOwner],
        mainType,
        category: kind.category || kind.type,
        kind: kind.type,
        translatedName: kind.translatedName,
        typeTranslatedName: kind.typeTranslatedName,
        slots: [...kind.slots],
        ...(kind.pairSlots ? {pairSlots: [...kind.pairSlots]} : {}),
        characteristics: {...kind.characteristics},
        stats: [],
        cost: Math.round(grade.cost * (SLOT_SHARE[share] ?? 1)),
        rarity: rarity.name,
        rarityTranslated: rarity.translatedName,
        gradeIndex: index,
        ...extra
    };
}

// How a real High Five number becomes a game stat (see template/equipmentTemplate.js `lineage`):
//  - a weapon's `power` is topWeaponPower scaled by its real P.Atk (M.Atk for staffs) relative to the
//    S84 weapon of the same type, so the progression through the grades is the real one;
//  - armor, shield and jewellery defence is the real P.Def / M.Def relative to the grade's heavy
//    breastplate, which stands for `bodyReference` points (gradeScale.js then lifts it with the grade).
const NOUNS = {
    heavy: {body: 'Breastplate', greaves: 'Gaiters', helmet: 'Helmet', gloves: 'Gauntlets', boots: 'Boots'},
    light: {fullBody: 'Armor', helmet: 'Helmet', gloves: 'Gloves', boots: 'Boots'},
    robe: {fullBody: 'Robe', helmet: 'Circlet', gloves: 'Gloves', boots: 'Boots'}
};

function defenceFromReal(template, index, real) {
    const lineage = template.lineage;
    const reference = lineage.armor.heavy[index].body;
    return Math.round(real / reference * lineage.bodyReference * 100) / 100;
}

function buildWeapon(template, grade, kind) {
    const lineage = template.lineage;
    const index = gradeIndex(grade.name, template);
    const list = lineage.weapons[kind.type];
    const real = list[index];
    const stat = lineage.weaponStat[kind.type];
    const power = lineage.topWeaponPower * Math.pow(real[stat] / list.at(-1)[stat], lineage.curve);
    const item = entry(template, grade, 'weapon', kind, real.name, {
        lineage: {pAtk: real.p, mAtk: real.m, ...(real.derived ? {derived: true} : {})}
    });
    item.characteristics.power = Math.round(power * 10) / 10;
    // New weapons receive their special ability only when a Soul Crystal is installed.
    return item;
}

function buildArmor(template, grade, kind) {
    const index = gradeIndex(grade.name, template);
    const set = template.lineage.armor[kind.type][index];
    const real = set[kind.category];
    const item = entry(template, grade, 'armor', kind, `${set.set} ${NOUNS[kind.type][kind.category]}`, {
        setId: `${grade.name}:${kind.type}`,
        setName: `${set.set} Set`,
        lineage: {pDef: real, ...(set.derived === true || (Array.isArray(set.derived) && set.derived.includes(kind.category)) ? {derived: true} : {})}
    });
    item.characteristics.defence = defenceFromReal(template, index, real);
    return item;
}

function buildShield(template, grade, kind) {
    const index = gradeIndex(grade.name, template);
    const key = {bigShield: 'big', smallShield: 'small', sigill: 'sigil'}[kind.type];
    const [name, real] = template.lineage.shields[key][index];
    const item = entry(template, grade, 'shield', kind, name, {
        lineage: {pDef: real, ...(key !== 'big' && !(key === 'sigil' && index >= gradeIndex('S', template)) ? {derived: true} : {})}
    });
    item.characteristics.defence = defenceFromReal(template, index, real);
    return item;
}

function buildJewelry(template, grade, kind) {
    const index = gradeIndex(grade.name, template);
    const [name, real] = template.lineage.jewelry[kind.type][index];
    const item = entry(template, grade, 'jewelry', kind, name, {lineage: {mDef: real}});
    item.characteristics.defence = defenceFromReal(template, index, real);
    return item;
}

// Epic jewellery: one unique item per epic raid boss (see template lineage.epic). Never crafted or rolled.
function buildEpic(template, epic) {
    const grade = template.grades.find(entry => entry.name === epic.grade);
    const index = gradeIndex(grade.name, template);
    const kind = template.itemType.find(group => group.name === 'jewelry').kind.find(entry => entry.type === epic.kind);
    const item = entry(template, grade, 'jewelry', kind, epic.name, {lineage: {mDef: epic.mDef}, epic: true, epicBoss: epic.boss});
    item.id = `epic:${epic.id}`;
    item.cost = Math.round(grade.cost * SLOT_SHARE.jewelry * 6);
    item.rarity = 'goddess';
    item.rarityTranslated = template.rarity.find(entry => entry.name === 'goddess').translatedName;
    item.characteristics.defence = defenceFromReal(template, index, epic.mDef);
    for (const [stat, value] of Object.entries(epic.bonus)) {
        const current = item.characteristics[stat];
        // factors (maxHpMul ...) multiply, flat stats add
        const merged = current === undefined ? value : (stat.endsWith('Mul') ? current * value : current + value);
        item.characteristics[stat] = Math.round(merged * 10000) / 10000;
    }
    return item;
}

// The custom armor line (template/customSets.js): one crafted set per grade and armor type, built on the defence of
// the Lineage 2 set of the same grade and type. Never sold, rolled or dropped as a finished item.
export const customSetId = (gradeName, type) => `custom:${gradeName}:${type}`;

function buildCustomArmor(template, grade, kind, config = customSets) {
    const index = gradeIndex(grade.name, template);
    const set = config.sets[kind.type]?.[index];
    const noun = config.parts[kind.type]?.[kind.category];
    const real = template.lineage.armor[kind.type][index][kind.category];
    if (!set || !noun || real === undefined) return null;
    const item = entry(template, grade, 'armor', kind, `${set.name} · ${noun}`, {
        setId: customSetId(grade.name, kind.type),
        setName: `Комплект «${set.name}»`,
        custom: true,
        lineage: {pDef: Math.round(real * config.defenceFactor), custom: true}
    });
    item.id = `custom:${grade.name}:${kind.type}:${kind.category}`;
    item.characteristics.defence = defenceFromReal(template, index, real * config.defenceFactor);
    return item;
}

/** The full-set bonus of a custom set by its set id, or null when the id is not a custom set. */
export function customSetBonus(setId, config = customSets) {
    const match = /^custom:([^:]+):([^:]+)$/.exec(String(setId || ''));
    if (!match) return null;
    const index = gradeIndex(match[1]);
    const bonus = config.sets[match[2]]?.[index]?.bonus;
    return bonus ? {...bonus} : null;
}

export function buildCatalog(template = equipmentTemplate) {
    const items = [];
    for (const grade of template.grades) {
        for (const group of template.itemType) {
            for (const kind of group.kind) {
                if (group.name === 'weapon') items.push(buildWeapon(template, grade, kind));
                else if (group.name === 'armor') items.push(buildArmor(template, grade, kind));
                else if (group.name === 'shield') items.push(buildShield(template, grade, kind));
                else if (group.name === 'jewelry') items.push(buildJewelry(template, grade, kind));
            }
        }
    }
    for (const epic of template.lineage.epic || []) items.push(buildEpic(template, epic));
    for (const grade of template.grades) {
        for (const kind of template.itemType.find(group => group.name === 'armor').kind) {
            const part = buildCustomArmor(template, grade, kind);
            if (part) items.push(part);
        }
    }
    for(const epic of epicWeapons) {
        const base=items.find(item=>item.id===`S84:weapon:${epic.kind}`);
        if(!base)continue;
        const item=structuredClone(base);
        Object.assign(item,{id:`epic-weapon:${epic.id}`,name:epic.name,description:'Эпическое оружие. Добывается в эпических рейдах.',epic:true,epicWeapon:epic.id,raidBoss:epic.boss,collection:'Epic weapons',rarity:'goddess',rarityTranslated:'Эпическое',cost:base.cost*6});
        // Same top-grade power/ability as the existing weapon type; rarity is not an unbounded stat bonus.
        items.push(item);
    }
    return items;
}

let cached = null;
let cachedFor = null;

/** The catalog of the current template (rebuilt if the template object was replaced from Mongo). */
export function getCatalog() {
    if (cached && cachedFor === equipmentTemplate.grades) return cached;
    cached = buildCatalog(equipmentTemplate);
    cachedFor = equipmentTemplate.grades;
    return cached;
}

export function findCatalogItem(id) {
    return getCatalog().find(item => item.id === id) || null;
}

/** A fresh, unenchanted copy of a catalog entry that can be put into an inventory. */
export function instantiate(definition, enchant = 0) {
    const copy = structuredClone(definition);
    copy.uid = randomBytes(6).toString('hex');
    copy.enchant = enchant;
    copy.isUsed = false;
    copy.version = 2;
    return copy;
}

/** Armor pieces of a set, by the part they fill (helmet / gloves / boots / body / greaves / fullBody). */
export function setPartOf(item) {
    if (item?.mainType !== 'armor' || !item.setId) return null;
    return item.category;
}

/** Epic jewellery of a raid boss, or null. */
export function findEpicItem(bossName) {
    return getCatalog().find(item => item.epicBoss === bossName) || null;
}

export function getSetPieces(setId) {
    return getCatalog().filter(item => item.setId === setId);
}
