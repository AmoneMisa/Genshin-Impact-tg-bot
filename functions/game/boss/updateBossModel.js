let data = require("../../../data");
const bossesTemplate = require("../../../templates/bossTemplate");

module.exports = function () {
    let newBosses = {};
    for (let [chatId, bossesArray] of Object.entries(data.bosses)) {
        if (Array.isArray(bossesArray)) {
            let newBossesArray = [];
            for (let boss of bossesArray) {
                let template = bossesTemplate.find(_boss => _boss.name === boss.name || _boss.nameCall === boss.nameCall);
                boss = Object.assign({},template, boss);
                newBossesArray.push(boss);
            }
            newBosses[chatId] = newBossesArray;
        } else {
            let newBossesArray = [];
            let template = bossesTemplate.find(_boss => _boss.nameCall === bossesArray.nameCall);
            let boss = Object.assign({}, template, bossesArray);
            newBossesArray.push(boss);
            newBosses[chatId] = newBossesArray;
        }
    }

    data.bosses = newBosses;
}