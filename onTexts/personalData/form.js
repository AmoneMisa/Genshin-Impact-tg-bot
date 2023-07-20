const dictionary = require('../../dictionaries/main');
const sendMessage = require('../../functions/tgBotFunctions/sendMessage');
const deleteMessageTimeout = require('../../functions/tgBotFunctions/deleteMessageTimeout');
const setButtons = require('../../functions/form/setButtons');
const commands = require('../../dictionaries/commands');
const getUserName = require('../../functions/getters/getUserName');
const deleteMessage = require("../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/form/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let buttons = setButtons(commands);

    let name = getUserName(session, "nickname") !== undefined ? getUserName(session, "nickname") : getUserName(session, "name");

    sendMessage(msg.chat.id, `@${name}, ${dictionary["ru"].index}`, {
        disable_notification: true,
        reply_markup: JSON.stringify({
            selective: true,
            keyboard: buttons,
            one_time_keyboard: true
        })
    }).then(message => {
        session.keyboardMessage = message;
        deleteMessageTimeout(msg.chat.id, message.message_id, 10000);
    })
}]];