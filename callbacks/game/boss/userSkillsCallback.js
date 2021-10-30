const sendMessage = require('../../../functions/sendMessage');
const bot = require('../../../bot');
const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');
const getSession = require('../../../functions/getSession');
const userDealDamage = require('../../../functions/game/boss/userDealDamage');
const bossGetLoot = require('../../../functions/game/boss/bossGetLoot');
const getMembers = require('../../../functions/getMembers');
const {bosses} = require('../../../data');

module.exports = [[/^skill\.[0-9]+\.[0-9]+$/, function (session, callback) {
    if (!callback.message.text.includes(session.userChatData.user.username)) {
        return;
    }

    const [, skillSlot, userId] = callback.data.match(/^skill\.([0-9]+)\.([0-9]+)$/);
    const skill = session.game.gameClass.skills[skillSlot];
    let members = getMembers(callback.message.chat.id);

    let boss = bosses[callback.message.chat.id];

    userDealDamage(session, boss, sendMessage(callback.message.chat.id))

    // if (userDealDamage(session, boss)) {
    //     bossGetLoot(boss, members, callbackSendMessage);
    //
    //     if (boss.hasOwnProperty("setIntervalId")) {
    //         clearInterval(boss.setIntervalId);
    //         delete boss.setIntervalId;
    //     }
    //     clearInterval(boss.setAttackIntervalId);
    //     delete boss.setAttackIntervalId;
    // }
}]];