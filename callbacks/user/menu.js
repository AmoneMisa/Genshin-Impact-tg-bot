const dictionary = require('../../dictionaries/main');
const deleteMessage = require('../../functions/deleteMessage');
const sendMessage = require('../../functions/sendMessage');
const userTemplate = require('../../userTemplate');

module.exports = [["menu", function (session, callback) {
    deleteMessage(callback.message.chat.id, session.messages, callback.message.message_id);
    session.anchorMessageId = callback.message.message_id;

    let buttons = [];
    function upFirstLetter(word) {
        let tempWord = word[0].replace(word[0], word[0].toUpperCase());
        return word;
    }

    for (let [key, value] of userTemplate) {
        let i = 0;
        let button = {
            text: null,
            callback_data: null
        };

        if (i % 3 === 0) {

        }

        button.text = key;
        button.callback_data = key;
        buttons.push(button);
    }

    return sendMessage(session, callback.message.chat.id, `${dictionary["ru"].menu.message}`, {
        reply_markup: {
            inline_keyboard: [[{
                text: "Текст Ru",
                callback_data: "language.text.ru"
            }, {
                text: "Text En",
                callback_data: "language.text.en"
            }], [{
                text: "Кнопки Ru",
                callback_data: "language.buttons.ru"
            }, {
                text: "Buttons En",
                callback_data: "language.buttons.en"
            }]]
        }
    });
}]];