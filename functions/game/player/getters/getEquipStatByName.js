import {saStat} from '../../equipment/soulCrystals.js';
import {soulBuffStat} from '../../equipment/soulCrystalCombat.js';
import {l2StatBonus} from '../l2Effects.js';
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
import { activeSets, itemExtras, uniqueEquipped } from '../../equipment/itemBonuses.js';
import {nativeCombatStat} from '../combatType.js';
import {isMagicWeapon} from '../../equipment/lifestoneSkills.js';

function combatCharacteristics(slot, values, statName, damageType) {
    if (!damageType) return values;
    const result = {...values};
    const native = nativeCombatStat(statName, damageType);
    if (native && Number.isFinite(result[native])) result[statName] = result[native];
    else if (statName === 'defence' && slot.mainType) {
        // Armour/shields provide P.Def; jewellery provides M.Def. Legacy unknown gear stays shared.
        const magic = slot.mainType === 'jewelry';
        if (magic !== (damageType === 'magic')) delete result.defence;
    } else if (statName === 'power' && slot.mainType === 'weapon' && result.power) {
        // Retain the existing item's game scale and project its other attack from its native L2 ratio.
        const source = isMagicWeapon(slot) ? 'mAtk' : 'pAtk';
        const target = damageType === 'magic' ? 'mAtk' : 'pAtk';
        const from = Number(slot.lineage?.[source]), to = Number(slot.lineage?.[target]);
        if (from > 0 && to >= 0) result.power *= to / from;
    }
    return result;
}

export default function (session, statName, isMul = false, damageType) {
    if (!session.game || !session.game.equipmentStats) {
        const potion=potionStatBonus(session,statName,isMul,Date.now(),damageType),lineage=l2StatBonus(session,statName,isMul,Date.now(),damageType);
        const bonus=isMul?potion*lineage:potion+lineage;
        return isMul ? bonus : (damageType ? bonus : 1+bonus);
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
        let characteristics = {...(slot.characteristics || {})};
        for (const [name, extra] of Object.entries(itemExtras(slot))) {
            characteristics[name] = (characteristics[name] || 0) + extra;
        }
        characteristics = combatCharacteristics(slot, characteristics, statName, damageType);

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
            const native = damageType && nativeCombatStat(statName, damageType);
            const hasNative = native && slot.stats.some(stat => stat.name === native);
            for (const stat of slot.stats) {
                if (hasNative && stat.name === statName) continue;
                const converted = combatCharacteristics(slot, {[stat.name]:stat.value}, statName, damageType);
                const statKey = stat.name === native ? statName : stat.name;
                const statValue = converted[statKey];
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

        const soul=saStat(session,slot,statName,isMul,damageType);
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
        const statValue = (damageType ? set.bonus[nativeCombatStat(statName, damageType)] : undefined) ?? set.bonus[statName];
        if (typeof statValue !== "number") {
            continue;
        }

        if (isMul) {
            totalStatValue *= statValue;
        } else {
            totalStatValue += statValue;
        }
    }

    const potionBonus=potionStatBonus(session,statName,isMul,Date.now(),damageType)*(isMul ? extraStatBonus(session,statName,true,damageType) : 1);
    return isMul ? totalStatValue*potionBonus*soulBuffStat(session,statName,true)*l2StatBonus(session,statName,true,Date.now(),damageType) : totalStatValue+potionBonus+extraStatBonus(session,statName,false,damageType)+soulBuffStat(session,statName,false)+l2StatBonus(session,statName,false,Date.now(),damageType);
}
