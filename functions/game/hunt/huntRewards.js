// What a dead mob pays. The numbers are the Lineage II (High Five) rules on our scale:
//  - experience only while the hero and the mob are less than 11 levels apart (and the high-level
//    penalty table after level 84); it is the mob's real share of a level step, so x5 rate and
//    Vitality (vitality.js) apply on top, exactly like on a x5 server;
//  - gold and item drops fade when the hero is far above the mob (adena from 8 levels, items from 5);
//  - a champion multiplies experience and the chance of every drop.
import { CHAMPIONS, HUNT, STONE_CHANCE } from './huntConfig.js';
import { addMaterial, materialInfo } from '../player/materials.js';
import { attributeKey, ATTRIBUTE_GRADES } from '../equipment/attributes.js';
import { enchantGradeForLevel } from '../equipment/enchantDrops.js';
import { gainExp, levelNeed } from '../player/vitality.js';
import setLevel, { spForLevelUp } from '../player/setLevel.js';
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

/** Rolls (and credits) the reward of one kill. The caller saves the session. */
export function grantKillRewards(session, mob, mobDef, {random = Math.random, now = Date.now()} = {}) {
    const level = Math.max(1, Number(session.game.stats?.lvl) || 1);
    const tier = mob.champion ? CHAMPIONS[mob.champion] : null;
    const result = {exp: 0, sp: 0, gold: 0, items: [], champion: mob.champion || null, leveledUp: false, bonus: 1};

    // experience and skill points: the real share of a level step, times the champion multiplier
    const expFactor = expGapFactor(level, mob.level);
    if (expFactor > 0 && mobDef) {
        const multiplier = expFactor * (tier ? tier.exp : 1);
        const base = mobDef.expShare * levelNeed(mob.level) * multiplier;
        const before = level;
        const gained = gainExp(session, base, {now});
        result.exp = gained.gained;
        result.bonus = gained.bonus;
        result.sp = Math.max(1, Math.round(mobDef.expShare * spForLevelUp(mob.level) * multiplier));
        session.game.inventory.sp = (Number(session.game.inventory.sp) || 0) + result.sp;
        setLevel(session);
        result.leveledUp = (Number(session.game.stats.lvl) || before) > before;
    }

    // gold
    const adenaGap = dropGapFactor(level, mob.level, HUNT.adenaGap);
    if (mobDef?.gold && random() < Math.min(1, mobDef.gold.chance / 100 * adenaGap)) {
        result.gold = Math.max(1, Math.round(getRandom(mobDef.gold.min, mobDef.gold.max) * HUNT.goldScale));
        session.game.inventory.gold = (Number(session.game.inventory.gold) || 0) + result.gold;
    }

    // items of the real drop table, mapped onto our materials
    const itemGap = dropGapFactor(level, mob.level, HUNT.itemGap);
    const chanceFactor = HUNT.dropRate * itemGap * (tier ? tier.drops : 1);
    const give = (key, amount) => {
        addMaterial(session, key, amount);
        const info = materialInfo(key);
        const row = result.items.find(item => item.item === key);
        if (row) row.amount += amount;
        else result.items.push({item: key, name: info.name, icon: info.icon, amount});
    };
    for (const drop of mobDef?.drops || []) {
        if (random() < Math.min(1, drop.chance / 100 * chanceFactor)) give(drop.key, getRandom(drop.min, drop.max));
    }

    // attribute stones of the mob's element (the grade of the hero's gear must be able to carry them)
    if (mobDef?.dropElement && ATTRIBUTE_GRADES.includes(enchantGradeForLevel(level))) {
        const chances = STONE_CHANCE[mob.champion || 'normal'];
        for (const stone of ['stone', 'crystal', 'jewel']) {
            if (chances[stone] > 0 && random() < chances[stone]) give(attributeKey(stone, mobDef.dropElement), 1);
        }
    }
    return result;
}
