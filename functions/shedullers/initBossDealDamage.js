const getMembers = require("../getters/getMembers");
const bossDealDamage = require("../game/boss/bossDealDamage");
const getBossDealDamageMessage = require("../game/boss/getters/getBossDealDamageMessage");
const isBossAlive = require("../game/boss/getBossStatus/isBossAlive");
const sendMessageWithDelete = require('../tgBotFunctions/sendMessageWithDelete');
const {bosses} = require("../../data");

module.exports = async function () {
    for (let [chatId, bossesArray] of Object.entries(bosses)) {
        for (let boss of bossesArray) {
            if (!isBossAlive(boss)) {
                continue;
            }

            let members = getMembers(chatId);
            let dmgList = bossDealDamage(members, boss);

            if (dmgList) {
                await sendMessageWithDelete(chatId, getBossDealDamageMessage(dmgList), {
                    disable_notification: true
                }, 10 * 1000);
            }
        }
    }
};