const bot = require('../../../bot');

module.exports = function (emoji, buttonsArray, button, session, callback) {
    session.chestCounter++;
    session.chosenChests.push(button.callback_data);
    buttonsArray[buttonsArray.indexOf(button)] = button;
    button.text = emoji;
    bot.editMessageReplyMarkup({inline_keyboard: session.chestButtons}, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id
    });
};