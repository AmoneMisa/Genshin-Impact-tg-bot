// "power"/"defencePower" are stored (and displayed, see getItemString.js) as
// weapon-power POINTS (e.g. 45, meaning +45%), unlike every other multiplicative
// stat (attackMul, criticalDamage, incomingDamageModifier, ...) which is stored
// already-scaled as a ready-to-multiply factor close to 1 (e.g. 1.05). Multiplying
// the raw points directly (45 * 45 * ...) compounds into absurd attack/defence
// values across just 1-2 equipped weapon slots — convert points to a factor here
// instead of storing pre-scaled values, so the point-scale numbers still display
// correctly elsewhere.
const POINT_SCALE_MUL_STATS = new Set(["power", "defencePower"]);

export default function (session, statName, isMul = false) {
    if (!session.game || !session.game.equipmentStats) {
        return 1;
    }

    let totalStatValue = (statName === "defencePower" || statName === "power") ? 1 : 0;

    if (isMul) {
        totalStatValue = 1;
    }

    const asFactor = POINT_SCALE_MUL_STATS.has(statName);

    // A two-slot item (e.g. a two-handed sword occupying leftHand+rightHand) is
    // written into equipmentStats once per slot it fills (see equipItem.js) — a
    // separate object per slot key once loaded back from Mongo, so reference
    // equality won't dedup them. Key on type+slots content instead: equipItem.js
    // unequips anything overlapping a slot before equipping, so two entries
    // sharing the same type and slot list can only be copies of the same item.
    const seenItems = new Set();

    for (let slot of Object.values(session.game.equipmentStats)) {
        if (!slot) {
            continue;
        }

        if (Array.isArray(slot.slots)) {
            const itemKey = `${slot.kind}|${[...slot.slots].sort().join(',')}`;
            if (seenItems.has(itemKey)) {
                continue;
            }
            seenItems.add(itemKey);
        }

        for (let [statKey, statValue] of Object.entries(slot.characteristics)) {

            if (statKey !== statName) {
                continue;
            }

            if (isMul) {
                totalStatValue *= asFactor ? (1 + statValue / 100) : statValue;
            } else {
                totalStatValue += statValue;
            }
        }

        // Random bonus (and penalty) rolls from generateRandomEquipment.js —
        // template/equipmentBonusStatsTemplate.js already stores every one of
        // these keys in the same convention getEquipStatByName expects ("Mul"
        // stats as a ready-to-multiply factor near 1, everything else as a flat
        // point value), so no percentage conversion is needed here, only for
        // "power"/"defencePower" above. Previously these rolled stats were
        // generated and displayed but never actually applied to combat.
        if (Array.isArray(slot.stats)) {
            for (let {name: statKey, value: statValue} of slot.stats) {
                if (statKey !== statName || typeof statValue !== "number") {
                    continue;
                }

                if (isMul) {
                    totalStatValue *= statValue;
                } else {
                    totalStatValue += statValue;
                }
            }
        }
    }
    return totalStatValue;
}