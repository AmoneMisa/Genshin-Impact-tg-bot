const buttonsDictionary = require('../../dictionaries/buttons');
const sendMessage = require('../../functions/sendMessage');
const userTemplate = require('../../templates/userTemplate');
const translation = require('../../dictionaries/translate');

module.exports = [["personal_info", function (session, callback) {
    function formatMessage() {
        let str = "";
        for (let key of Object.keys(session.user)) {
            if ((userTemplate.hasOwnProperty(key)) && session.user[key] !== null && session.user[key] !== undefined) {
                str += `${translation[key]}: ${session.user[key]}\n`;
            }
        }
        str += "\n\n";

        if (!str.trim().length) {
            str = `@${session.userChatData.user.username}, ещё нет никакой информации о тебе. Заполни её через бота командой /menu`
        }
        return str;
    }

    return sendMessage( callback.message.chat.id, `${formatMessage()}`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}]];