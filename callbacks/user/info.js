const buttonsDictionary = require('../../dictionaries/buttons');
const deleteMessage = require('../../functions/deleteMessage');
const sendMessage = require('../../functions/sendMessage');
let {sessions} = require('../../data');
const translation = require('../../dictionaries/translate');

module.exports = [["info", function (session, callback) {
    deleteMessage(callback.message.chat.id, session.messages, callback.message.message_id);
    session.anchorMessageId = callback.message.message_id;

    function formatMessage() {
        let str = "";

        for (let [userid, session] of Object.entries(sessions)) {
            if (!session.userChatData) {
               continue;
            }
            if (session.userChatData.user.username) {
                str += `${session.userChatData.user.username}\n`;
            } else {
                str += `${session.userChatData.user.first_name}\n`;
            }

            for (let key of Object.keys(session.user)) {
                if (session.user[key] !== null && session.user[key] !== undefined) {
                    str += `${translation[key]}: ${session.user[key]}\n`;
                }
            }
            str += "\n\n";
        }
        if (!str.trim().length) {
            str += "Ещё нет никакой информации о группе. Заполни её через бота командой /start"
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