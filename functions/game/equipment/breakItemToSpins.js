const getRandom = require("../../getters/getRandom");
module.exports = function (inventory, item, gachaType) {
    let result = getRandom(costSpins[gachaTypeMap[gachaType] - 1].min, costSpins[gachaTypeMap[gachaType] - 1].max);
    inventory.gacha[gachaType] += result;
    return result;
}

const gachaTypeMap = {newbie: 1, common: 2, rare: 3, royal: 4, goddess: 5};
const costSpins = [{min: 1, max: 3}, {min: 3, max: 5}, {min: 5, max: 8}, {min: 5, max: 12}, {min: 6, max: 20}];