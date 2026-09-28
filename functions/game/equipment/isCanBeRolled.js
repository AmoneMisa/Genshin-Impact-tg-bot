import gachaTemplate from "../../../template/gachaTemplate.js";

// Коды возврата
const RESULT = {
    LEVEL_TOO_LOW: 1,
    NOT_ENOUGH_GOLD: 2,
    NOT_ENOUGH_CRYSTALS: 3,
    CAN_ROLL_FOR_MONEY: 0,
    CAN_ROLL_FOR_PIECES: -1,
    CAN_ROLL_FOR_FREE: -2,
};

export default function canRollGacha(session, gachaType) {
    const gacha = gachaTemplate.find(item => item.name === gachaType);
    if (!gacha) {
        throw new Error(`Неизвестный тип гачи: ${gachaType}`);
    }

    const gachaItemInInventory = session.game.gacha.find(item => item.name === gachaType);
    const isFreeSpin = gachaItemInInventory?.freeSpins > 0;
    const isLevelEnough = session.game.stats.lvl >= gacha.needLvl;

    // Shards live in inventory.gacha.items[].value (where breakItemToSpins deposits
    // them and the inventory UI shows them) — this is the single source of truth.
    const shardItem = session.game.inventory?.gacha?.items?.find(item => item.name === gachaType);
    const shardCount = shardItem?.value || 0;

    if (!isLevelEnough) {
        return RESULT.LEVEL_TOO_LOW;
    }

    if (isFreeSpin) {
        return RESULT.CAN_ROLL_FOR_FREE;
    }

    if (shardCount >= gacha.piecesForFleeCall) {
        return RESULT.CAN_ROLL_FOR_PIECES;
    }

    if (gacha.spinCost.gold > session.game.inventory.gold) {
        return RESULT.NOT_ENOUGH_GOLD;
    }

    if (gacha.spinCost.crystals > session.game.inventory.crystals) {
        return RESULT.NOT_ENOUGH_CRYSTALS;
    }

    return RESULT.CAN_ROLL_FOR_MONEY;
}
