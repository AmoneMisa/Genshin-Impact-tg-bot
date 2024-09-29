const sendMessage = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const getFile = require("../../../functions/getters/getFile");
const sendPhoto = require("../../../functions/tgBotFunctions/sendPhoto");

module.exports = [[/(?:^|\s)\/horoscope\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    const file = getFile("images/pet", session?.pet?.type || "default");

    if (file) {
        await sendPhoto(msg.from.id, file, {
            caption: `${session?.pet?.name || "Чудик"} - Ваш питомец. Вы можете его кормить, ухаживать, прокачивать, изменять имя и внешний вид.`,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [

                ]
            }
        });
    } else {
        await sendMessage(msg.chat.id, `${session?.pet?.name || "Чудик"} - Ваш питомец. Вы можете его кормить, ухаживать, прокачивать, изменять имя и внешний вид.`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [

                ]
            }
        });
    }
}]];