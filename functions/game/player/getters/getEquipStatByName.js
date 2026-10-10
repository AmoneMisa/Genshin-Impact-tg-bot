import {saStat} from '../../equipment/soulCrystals.js';
import {soulBuffStat} from '../../equipment/soulCrystalCombat.js';
// "power"/"defencePower" are stored (and displayed, see getItemString.js) as
// weapon-power POINTS (e.g. 45, meaning +45%), unlike every other multiplicative
// stat (attackMul, criticalDamage, incomingDamageModifier, ...) which is stored
// already-scaled as a ready-to-multiply factor close to 1 (e.g. 1.05). Multiplying
// the raw points directly (45 * 45 * ...) compounds into absurd attack/defence
// values across just 1-2 equipped weapon slots — convert points to a factor here
// instead of storing pre-scaled values, so the point-scale numbers still display
// correctly elsewhere.
const POINT_SCALE_MUL_STATS = new Set(["power", "defencePower"]);

import gradeScale from '../../equipment/gradeScale.js';
import { potionStatBonus } from '../potionBuffs.js';
import extraStatBonus from '../extraModifiers.js';
import { augmentStat } from '../../equipment/augment.js';
import { activeSets, enchantExtras, uniqueEquipped } from '../../equipment/itemBonuses.js';

export default function (session, statName, isMul = false) {
    if (!session.game || !session.game.equipmentStats) {
        const bonus=potionStatBonus(session,statName,isMul);
        return isMul ? bonus : 1+bonus;
    }

    let totalStatValue = (statName === "defencePower" || statName === "power") ? 1 : 0;

    if (isMul) {
        totalStatValue = 1;
    }

    const asFactor = POINT_SCALE_MUL_STATS.has(statName);

    // A two-slot item (e.g. a two-handed sword occupying leftHand+rightHand) is
    // written into equipmentStats once per slot it fills (see equipItem.js) — a
    // separate object per slot key once loaded back from Mongo, so reference
    // equality won't dedup them. uniqueEquipped keys on type+slots content:
    // equipItem.js unequips anything overlapping a slot before equipping, so two
    // entries sharing the same type and slot list can only be copies of one item.
    for (let slot of uniqueEquipped(session.game.equipmentStats)) {
        // Fixed characteristics of the catalog item plus what its enchant level adds.
        const characteristics = {...(slot.characteristics || {})};
        for (const [name, extra] of Object.entries(enchantExtras(slot))) {
            characteristics[name] = (characteristics[name] || 0) + extra;
        }

        for (let [statKey, statValue] of Object.entries(characteristics)) {

            if (statKey !== statName) {
                continue;
            }

            if (isMul) {
                totalStatValue *= asFactor ? (1 + statValue / 100) : statValue;
            } else {
                totalStatValue += statValue * gradeScale(statName, slot.grade);
            }
        }

        // Fixed extra stats of the item (special abilities of S-grade weapons, and bonus
        // rolls of items created before the Lineage 2 catalog).
        if (Array.isArray(slot.stats)) {
            for (let {name: statKey, value: statValue} of slot.stats) {
                if (statKey !== statName || typeof statValue !== "number") {
                    continue;
                }

                if (isMul) {
                    totalStatValue *= statValue;
                } else {
                    totalStatValue += statValue * gradeScale(statName, slot.grade);
                }
            }
        }

        const soul=saStat(session,slot,statName,isMul);
        if(soul!==null){if(isMul)totalStatValue*=soul;else totalStatValue+=soul;}

        // The Life Stone bonus of a weapon.
        const augment = augmentStat(slot, statName, isMul);
        if (augment !== null) {
            if (isMul) totalStatValue *= augment;
            else totalStatValue += augment;
        }
    }

    // Full-set bonuses (helmet + gloves + boots + body cover of one set).
    for (const set of activeSets(session.game.equipmentStats)) {
        const statValue = set.bonus[statName];
        if (typeof statValue !== "number") {
            continue;
        }

        if (isMul) {
            totalStatValue *= statValue;
        } else {
            totalStatValue += statValue;
        }
    }

    const potionBonus=potionStatBonus(session,statName,isMul)*(isMul ? extraStatBonus(session,statName,true) : 1);
    return isMul ? totalStatValue*potionBonus*soulBuffStat(session,statName,true) : totalStatValue+potionBonus+extraStatBonus(session,statName)+soulBuffStat(session,statName,false);
}
