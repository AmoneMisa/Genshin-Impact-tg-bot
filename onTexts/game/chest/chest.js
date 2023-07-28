const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getRandomChest = require('../../../functions/game/chest/getRandomChest');
const getTime = require('../../../functions/getters/getTime');
const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const getUserName = require('../../../functions/getters/getUserName');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const getStringRemainTime = require("../../../functions/getters/getStringRemainTime");

module.exports = [[/(?:^|\s)\/chest\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    let [remain] = getTime(session.timerOpenChestCallback);

    if (remain > 0) {
        return sendMessageWithDelete(msg.chat.id, `@${getUserName(session, "nickname")}, команду можно вызывать раз в сутки. Обновляется попытка в 00.00. Осталось: ${getStringRemainTime(remain)}`, {
            disable_notification: true,
        }, 6 * 1000);
    }

    let buttons = getRandomChest();

    return sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, выбери три сундучка!`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [
                ...buttons
            ]
        }
    })
}]];