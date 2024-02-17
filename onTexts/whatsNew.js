const sendMessage = require('../functions/tgBotFunctions/sendMessage');
const deleteMessage = require("../functions/tgBotFunctions/deleteMessage");
const getEmoji = require("../functions/getters/getEmoji");

module.exports = [[/(?:^|\s)\/whats_new/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    await sendMessage(msg.from.id, `${getEmoji("maxDamage")} Чтобы получать уведомления, Вам необходимо для начала начать чат с ботом, если такового ещё нет. Боты не могут Вам слать сообщения без начатого пользователем чата!${getEmoji("maxDamage")}\n\nНастройки уведомлений о новых возможностях бота (обновлениях). Рекомендуется включать только в личном чате с ботом.`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: session.whatsNewSettings.button.text,
                callback_data: session.whatsNewSettings.button.callback_data
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}]];