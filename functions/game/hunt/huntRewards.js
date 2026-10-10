import {absorbHuntSoul} from '../equipment/soulCrystals.js';
// What a dead mob pays. The numbers are the Lineage II (High Five) rules on our scale:
//  - experience only while the hero and the mob are less than 11 levels apart (and the high-level
//    penalty table after level 84); it is the mob's real share of a level step, so x5 rate and
//    Vitality (vitality.js) apply on top, exactly like on a x5 server;
//  - gold and item drops fade when the hero is far above the mob (adena from 8 levels, items from 5);
//  - a champion multiplies experience and the chance of every drop.
import { CHAMPIONS, HUNT, STONE_CHANCE } from './huntConfig.js';
import { addMaterial, materialInfo } from '../player/materials.js';
import { attributeKey, ATTRIBUTE_GRADES } from '../equipment/attributes.js';
import { lootRows, LOOT_KINDS } from './lootTable.js';
import { lootDistributor, expShares } from '../party/party.js';
import { enchantGradeForLevel } from '../equipment/enchantDrops.js';
import { gainExp, levelNeed } from '../player/vitality.js';
import setLevel, { spForLevelUp } from '../player/setLevel.js';
import {customDropChance, pickCustomPart} from '../equipment/customDrops.js';
import {instantiate} from '../equipment/catalog.js';
import getRandom from '../../getters/getRandom.js';

const HIGH_LEVEL_PENALTY = Object.freeze({'-3': 0.97, '-4': 0.67, '-5': 0.42, '-6': 0.25, '-7': 0.15, '-8': 0.09, '-9': 0.05, '-10': 0.03});

/** 1 for a fair fight, 0 when the gap kills the experience. `diff` is hero level minus mob level. */
export function expGapFactor(heroLevel, mobLevel) {
    const diff = heroLevel - mobLevel;
    if (diff >= HUNT.expMaxGap || diff <= -HUNT.expMaxGap) return 0;
    if (heroLevel > 84 && diff <= -3) return HIGH_LEVEL_PENALTY[String(diff)] ?? 1;
    return 1;
}

/** Drop chance factor: 1 up to `min` levels above the mob, down to `floor` at `max` levels above it. */
export function dropGapFactor(heroLevel, mobLevel, {min, max, floor}) {
    const diff = heroLevel - mobLevel;
    if (diff <= min) return 1;
    if (diff >= max) return floor;
    return 1 - (1 - floor) * (diff - min) / (max - min);
}

/** The real drop table of a monster is rolled at x1 for seal stones and at HUNT.dropRate for everything else. */
const rateOf = row => (row.kind === 'seal' ? 1 : HUNT.dropRate);

/** How many times a row pays: its chance above 100% is guaranteed copies (as on a rated server), the rest a roll. */
export function dropRolls(chancePercent, random) {
    const expected = chancePercent / 100;
    return Math.floor(expected) + (random() < expected - Math.floor(expected) ? 1 : 0);
}

/** Uses the same effective probabilities and quantities as grantKillRewards, without rolling. */
export function huntDropPreview(level, mobDef, champion = null) {
    if (!mobDef) return [];
    const tier = CHAMPIONS[champion];
    const rows = [];
    if (mobDef.gold) rows.push({key: 'gold', name: 'Адена', icon: '🪙', kind: 'gold', min: Math.max(1, Math.round(mobDef.gold.min * HUNT.goldScale)), max: Math.max(1, Math.round(mobDef.gold.max * HUNT.goldScale)), chance: Math.min(100, mobDef.gold.chance * dropGapFactor(level, mobDef.level, HUNT.adenaGap))});
    const gap = dropGapFactor(level, mobDef.level, HUNT.itemGap) * (tier?.drops || 1);
    for (const drop of lootRows(mobDef.id)) {
        const info = materialInfo(drop.key);
        rows.push({key: drop.key, name: info.name || drop.name, icon: info.icon, kind: drop.kind, min: drop.min, max: drop.max, chance: drop.chance * rateOf(drop) * gap});
    }
    rows.push({key: 'custom-armor', name: 'Деталь авторского комплекта', icon: '🛡️', kind: 'full', min: 1, max: 1, chance: customDropChance(mobDef.level) * HUNT.dropRate * gap});
    if (mobDef.dropElement && ATTRIBUTE_GRADES.includes(enchantGradeForLevel(level))) {
        const chances = STONE_CHANCE[champion || 'normal'];
        for (const stone of ['stone', 'crystal', 'jewel']) if (chances[stone] > 0) {
            const key = attributeKey(stone, mobDef.dropElement), info = materialInfo(key);
            rows.push({key, name: info.name, icon: info.icon, kind: 'attribute', min: 1, max: 1, chance: chances[stone] * 100});
        }
    }
    return rows.sort((a, b) => b.chance - a.chance);
}

export {LOOT_KINDS};

/** Rolls (and credits) the reward of one kill. The caller saves the session. */
export function grantKillRewards(session, mob, mobDef, {random = Math.random, now = Date.now()} = {}) {
    const level = Math.max(1, Number(session.game.stats?.lvl) || 1);
    const tier = mob.champion ? CHAMPIONS[mob.champion] : null;
    const result = {exp: 0, sp: 0, gold: 0, items: [], shared: [], party: [], champion: mob.champion || null, leveledUp: false, bonus: 1};
    // A party shares the loot of a kill by its loot mode (the killer keeps everything outside a party).
    const chat = typeof session.ownerDocument === 'function' ? session.ownerDocument() : null;
    // Members of the party that stand in the same hunting zone share the kill (the High Five party range).
    const inRange = member => member.game?.hunt?.zone === mob.zone && Boolean(member.game.hunt.field);
    const distributor = lootDistributor(chat, session, random, inRange);
    const nameOf = member => member.userChatData?.user?.first_name || member.userChatData?.user?.username || String(member.userId);

    // experience and skill points: the real share of a level step, times the champion multiplier. A party gets the
    // reward of its highest level, times the party bonus, split by level squared (High Five).
    const party = expShares(distributor.members);
    const expFactor = expGapFactor(party.level, mob.level);
    if (expFactor > 0 && mobDef) {
        const multiplier = expFactor * (tier ? tier.exp : 1);
        const base = mobDef.expShare * levelNeed(mob.level) * multiplier * party.bonus;
        const baseSp = mobDef.expShare * spForLevelUp(mob.level) * multiplier * party.bonus;
        for (const {member, share} of party.shares) {
            const before = Math.max(1, Number(member.game.stats?.lvl) || 1);
            const gained = gainExp(member, base * share, {now});
            const sp = Math.max(1, Math.round(baseSp * share));
            member.game.inventory.sp = (Number(member.game.inventory.sp) || 0) + sp;
            setLevel(member);
            const leveledUp = (Number(member.game.stats.lvl) || before) > before;
            if (member === session) {
                result.exp = gained.gained;
                result.bonus = gained.bonus;
                result.sp = sp;
                result.leveledUp = leveledUp;
            } else {
                member.needsSave = true;
                result.party.push({userId: String(member.userId), name: nameOf(member), exp: gained.gained, sp, leveledUp});
            }
        }
    }

    // gold
    const adenaGap = dropGapFactor(level, mob.level, HUNT.adenaGap);
    if (mobDef?.gold && random() < Math.min(1, mobDef.gold.chance / 100 * adenaGap)) {
        const total = Math.max(1, Math.round(getRandom(mobDef.gold.min, mobDef.gold.max) * HUNT.goldScale));
        // adena is split equally between the members of a party; the killer gets the remainder
        const members = distributor.members, each = Math.floor(total / members.length);
        for (const member of members) {
            const share = member === session ? total - each * (members.length - 1) : each;
            member.game.inventory.gold = (Number(member.game.inventory.gold) || 0) + share;
            if (member !== session) {
                member.needsSave = true;
                if (share) result.shared.push({userId: String(member.userId), name: nameOf(member), item: 'gold', amount: share});
            }
        }
        result.gold = total - each * (members.length - 1);
    }

    // items of the real drop table: every row rolls on its own, a chance above 100% gives guaranteed copies
    const itemGap = dropGapFactor(level, mob.level, HUNT.itemGap);
    const give = (key, amount) => {
        const receiver = distributor.pick();
        addMaterial(receiver, key, amount);
        const info = materialInfo(key);
        if (receiver !== session) {
            receiver.needsSave = true;
            result.shared.push({userId: String(receiver.userId), name: nameOf(receiver), item: key, itemName: info.name, icon: info.icon, amount});
            return;
        }
        const row = result.items.find(item => item.item === key);
        if (row) row.amount += amount;
        else result.items.push({item: key, name: info.name, icon: info.icon, amount});
    };
    for (const drop of lootRows(mobDef?.id ?? mob.mobId)) {
        const rolls = dropRolls(drop.chance * rateOf(drop) * itemGap * (tier ? tier.drops : 1), random);
        if (rolls > 0) give(drop.key, getRandom(drop.min, drop.max) * rolls);
    }

    // a part of the custom armor line: finished equipment, rarer than the real finished items
    if (mobDef && dropRolls(customDropChance(mob.level) * HUNT.dropRate * itemGap * (tier ? tier.drops : 1), random) > 0) {
        const receiver = distributor.pick();
        const part = pickCustomPart(mob.level, receiver.game?.gameClass?.stats?.name, random);
        if (part) {
            const inventory = receiver.game.inventory;
            if (!inventory.equipment) inventory.equipment = {name: 'Экипировка', items: []};
            inventory.equipment.items.push(instantiate(part));
            if (receiver !== session) {
                receiver.needsSave = true;
                result.shared.push({userId: String(receiver.userId), name: nameOf(receiver), item: part.id, itemName: part.name, icon: '🛡️', amount: 1});
            } else result.items.push({item: part.id, name: part.name, icon: '🛡️', amount: 1});
        }
    }

    // attribute stones of the mob's element (the grade of the hero's gear must be able to carry them)
    if (mobDef?.dropElement && ATTRIBUTE_GRADES.includes(enchantGradeForLevel(level))) {
        const chances = STONE_CHANCE[mob.champion || 'normal'];
        for (const stone of ['stone', 'crystal', 'jewel']) {
            if (chances[stone] > 0 && random() < chances[stone]) give(attributeKey(stone, mobDef.dropElement), 1);
        }
    }
    distributor.touched.forEach(member => { if (member !== session) member.needsSave = true; });
    result.soulCrystal=absorbHuntSoul(session,mob,random);
    return result;
}
