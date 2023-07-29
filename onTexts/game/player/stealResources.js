const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getUserName = require('../../../functions/getters/getUserName');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const controlButtons = require("../../../functions/keyboard/controlButtons");
const buildKeyboard = require("../../../functions/keyboard/buildKeyboard");
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");

module.exports = [[/(?:^|\s)\/steal_resources\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    let buttons = buildKeyboard(msg.chat.id, "steal_resources", false, msg.from.id);

    if (!session.game.builds.chanceToSteal && session.game.builds.chanceToSteal !== 0) {
        session.game.builds.chanceToSteal = 2;
    }

    if (session.game.builds.chanceToSteal === 0) {
        return sendMessageWithDelete(msg.chat.id, `@${getUserName(session, "nickname")}, у тебя на данный момент нет попыток ограбления. Попытки восстанавливаются после 00.00 каждый день.`, {}, 15 * 1000);
    }

    await sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, выбери, у кого хочешь украсть ресурсы.`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons("steal_resources", buttons, 1)
        }
    });
}]];