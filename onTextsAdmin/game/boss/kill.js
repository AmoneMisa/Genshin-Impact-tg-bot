const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const getMemberStatus = require("../../../functions/getters/getMemberStatus");
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const getAliveBoss = require("../../../functions/game/boss/getBossStatus/getAliveBoss");

module.exports = [[/(?:^|\s)\/kill\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (!getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    let boss = getAliveBoss(msg.chat.id);
    if (!boss) {
        throw new Error(`Не найден босс для команды kill в чате: ${msg.chat.id}`);
    }

    if (boss.currentHp === 0) {
        throw new Error(`Босс уже мёртв: ${msg.chat.id}`);
    }

    boss.skill = null;
    boss.currentHp = 0;
    boss.hp = 0;
    boss.listOfDamage = [];

    return sendMessageWithDelete(msg.chat.id, "Босс убит админом.", {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        disable_notification: true
    }, 5 * 1000);
}]];