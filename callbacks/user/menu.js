const dictionary = require('../../dictionaries/main');
const buttonsDictionary = require('../../dictionaries/buttons');
const deleteMessage = require('../../functions/deleteMessage');
const sendMessage = require('../../functions/sendMessage');
const userTemplate = require('../../userTemplate');
const translation = require('../../dictionaries/translate');

module.exports = [["menu", function (session, callback) {
    deleteMessage(callback.message.chat.id, session.messages, callback.message.message_id);
    session.anchorMessageId = callback.message.message_id;

    function buttonsTemplate() {
        let buttons = [];
        let tempArray = null;
        let i = 0;

        for (let key of Object.keys(userTemplate)) {
            if (i % 2 === 0) {
                tempArray = [];
                buttons.push(tempArray);
            }
            tempArray.push({text: translation[key.toString()], callback_data: `menu.${key}`});
            i++;

        }
        return buttons;
    }

    let buttons = buttonsTemplate();

    console.log(session);
    return sendMessage(session, callback.message.chat.id, `@${session.userChatData.user.username}, ${dictionary["ru"].menu}`, {
        disable_notification: true,
        selective: true,
        reply_markup: {
            inline_keyboard: [
                ...buttons,
                [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}]];