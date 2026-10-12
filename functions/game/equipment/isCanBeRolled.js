import {migrateCurrencyWallet} from '../player/currencyMigration.js';
import gachaTemplate from "../../../template/gachaTemplate.js";

// Коды возврата
const RESULT = {
    LEVEL_TOO_LOW: 1,
    NOT_ENOUGH_GOLD: 2,
    NOT_ENOUGH_DEW: 3,
    CAN_ROLL_FOR_MONEY: 0,
    CAN_ROLL_FOR_PIECES: -1,
    CAN_ROLL_FOR_FREE: -2,
};

export default function canRollGacha(session, gachaType) {
    migrateCurrencyWallet(session.game.inventory);
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

    if ((gacha.spinCost.moonDew || 0) > (session.game.inventory.moonDew || 0)) {
        return RESULT.NOT_ENOUGH_DEW;
    }

    return RESULT.CAN_ROLL_FOR_MONEY;
}
