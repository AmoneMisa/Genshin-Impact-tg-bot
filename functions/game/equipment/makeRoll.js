import getValueByChance from "../../getters/getValueByChance.js";

export default function rollGacha(player, spin, isFree) {
    const chance = Math.random();

    if (!isFree) {
        for (const [costKey, costValue] of Object.entries(spin.spinCost)) {
            const currentValue = player.inventory[costKey] ?? 0;
            if (currentValue < costValue) {
                throw new Error(`Недостаточно ресурса: ${costKey}`);
            }
            player.inventory[costKey] = currentValue - costValue;
        }
    }

    return getValueByChance(chance, spin.gradesForSpin);
}
