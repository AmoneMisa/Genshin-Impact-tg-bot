import gachaTemplate from '../../../template/gachaTemplate.js';

// 1 - уровень слишком низкий
// 2 - недостаточно золота
// 3 - недостаточно кристаллов
// 0 - можно роллить за деньги
// -1 - можно роллить за осколки
// -2 - можно роллить за бесплатные попытки

export default function (session, gachaType) {
    let gacha = gachaTemplate.find(item => item.name === gachaType);
    let gachaItemInInventory = session.game.gacha.find(item => item.name === gachaType);
    let isFreeSpin = gachaItemInInventory?.freeSpins > 0;
    let isLevelEnough = session.game.stats.lvl >= gacha.needLvl;

    if (!isLevelEnough) {
        return 1;
    }

    if (isFreeSpin) {
        return -2;
    }

    if (gachaItemInInventory.piecesForFleeCall >= gacha.piecesForFleeCall) {
        return -1;
    }

    if (gacha.spinCost.gold > session.game.inventory.gold) {
        return 2
    }

    if (gacha.spinCost.crystals > session.game.inventory.crystals) {
        return 3
    }

    return 0;
}