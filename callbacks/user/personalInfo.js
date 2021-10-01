const buttonsDictionary = require('../../dictionaries/buttons');
const deleteMessage = require('../../functions/deleteMessage');
const sendMessage = require('../../functions/sendMessage');
const userTemplate = require('../../userTemplate');
const translation = require('../../dictionaries/translate');

module.exports = [["personal_info", function (session, callback) {
    deleteMessage(callback.message.chat.id, session.messages, callback.message.message_id);
    session.anchorMessageId = callback.message.message_id;

    function formatMessage() {
        let str = "";
        for (let key of Object.keys(session.user)) {
            if ((userTemplate.hasOwnProperty(key)) && session.user[key] !== null && session.user[key] !== undefined) {
                str += `${translation[key]}: ${session.user[key]}\n`;
            }
        }
        str += "\n\n";

        if (!str.trim().length) {
            str += "Ещё нет никакой информации о тебе. Заполни её через бота командой /start"
        }
        return str;
    }

    return sendMessage(session, callback.message.chat.id, `${formatMessage()}`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}]];