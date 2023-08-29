const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const sendPhoto = require('../../../functions/tgBotFunctions/sendPhoto');
const getRandomChest = require('../../../functions/game/chest/getRandomChest');
const getTime = require('../../../functions/getters/getTime');
const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const getUserName = require('../../../functions/getters/getUserName');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const getStringRemainTime = require("../../../functions/getters/getStringRemainTime");
const getFile = require("../../../functions/getters/getFile");

module.exports = [[/(?:^|\s)\/chest\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    let [remain] = getTime(session.timerOpenChestCallback);

    if (remain > 0) {
        await sendMessageWithDelete(msg.from.id, `@${getUserName(session, "nickname")}, команду можно вызывать раз в сутки. Обновляется попытка в 00.00. Осталось: ${getStringRemainTime(remain)}`, {
            disable_notification: true,
        }, 6 * 1000);

        return ;
    }

    let buttons = getRandomChest(msg.chat.id);

    const file = getFile("images/misc", "chestsGame");

    if (file) {
        await sendPhoto(msg.from.id, file, {
            caption: `Выбери три сундучка!`,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [
                    ...buttons
                ]
            }
        });
    } else {
        await sendMessage(msg.from.id, `Выбери три сундучка!`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [
                    ...buttons
                ]
            }
        });
    }
}]];