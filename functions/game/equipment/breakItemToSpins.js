import getRandom from "../../getters/getRandom.js";

const gachaTypeMap = { newbie: 1, common: 2, rare: 3, royal: 4, goddess: 5 };
const costSpins = [
    { min: 1, max: 3 },
    { min: 3, max: 5 },
    { min: 5, max: 8 },
    { min: 5, max: 12 },
    { min: 6, max: 20 }
];

/**
 * Делает гача-спин и обновляет инвентарь
 * @param {Object} inventory - инвентарь игрока
 * @param {Object} item - предмет (не используется в текущей логике)
 * @param {String} gachaType - тип гачи ("newbie", "common", "rare", "royal", "goddess")
 */
export default function spinGacha(inventory, item, gachaType) {
    const typeIndex = gachaTypeMap[gachaType];
    if (!typeIndex) {
        throw new Error(`Неизвестный тип гачи: ${gachaType}`);
    }

    const { min, max } = costSpins[typeIndex - 1];
    const result = getRandom(min, max);

    let gachaItem = inventory.gacha.items.find(i => i.name === gachaType);
    if (!gachaItem) {
        gachaItem = { name: gachaType, value: result };
        inventory.gacha.items.push(gachaItem);
    } else {
        gachaItem.value += result;
    }

    return result;
}
