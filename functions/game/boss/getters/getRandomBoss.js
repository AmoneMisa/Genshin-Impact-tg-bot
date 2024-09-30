const bossesTemplate = require("../../../../template/bossTemplate");
const getRandom = require("../../../getters/getRandom");

module.exports = function () {
    return bossesTemplate[getRandom(0, bossesTemplate.length - 1)];
}