let data = require("../../../data");
const bossesTemplate = require("../../../templates/bossTemplate");

module.exports = function () {
    let newBosses = {};
    for (let [chatId, bossesArray] of Object.entries(data.bosses)) {
        if (Array.isArray(bossesArray)) {
            let newBossesArray = [];
            for (let boss of bossesArray) {
                let template = bossesTemplate.find(_boss => _boss.name === boss.name || _boss.nameCall === boss.nameCall);

                if (!boss.hasOwnProperty("name")) {
                    template = bossesTemplate.find(_boss => _boss.name === "kivaha");
                }

                boss = Object.assign({},template, boss);

                if (boss.damagedHp) {
                    delete boss.damagedHp;
                }

                if (boss.hp) {
                    delete boss.hp;
                }

                newBossesArray.push(boss);
            }
            newBosses[chatId] = newBossesArray;
        } else {
            let newBossesArray = [];
            let template = bossesTemplate.find(_boss => _boss.nameCall === bossesArray.nameCall);

            if (!bossesArray.hasOwnProperty("name")) {
                template = bossesTemplate.find(_boss => _boss.name === "kivaha");
            }

            let boss = Object.assign({}, template, bossesArray);

            if (boss.damagedHp) {
                delete boss.damagedHp;
            }
            if (boss.hp) {
                delete boss.hp;
            }
            newBossesArray.push(boss);
            newBosses[chatId] = newBossesArray;
        }
    }

    data.bosses = newBosses;
}