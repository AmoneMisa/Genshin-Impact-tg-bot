import buttonsDictionary from '../../dictionaries/buttons.js';
import sendMessage from '../../functions/tgBotFunctions/sendMessage.js';
import userTemplate from '../../template/userTemplate.js';
import translation from '../../dictionaries/translate.js';
import getUserName from '../../functions/getters/getUserName.js';

export default [["personal_info", function (session, callback) {
    function formatMessage() {
        let str = "";
        for (let key of Object.keys(session.user)) {
            if ((userTemplate.hasOwnProperty(key)) && session.user[key] !== null && session.user[key] !== undefined) {
                str += `${translation[key]}: ${session.user[key]}\n`;
            }
        }
        str += "\n\n";

        if (!str.trim().length) {
            str = `@${getUserName(session, "nickname")}, ещё нет никакой информации о тебе. Заполни её через бота командой /form`
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