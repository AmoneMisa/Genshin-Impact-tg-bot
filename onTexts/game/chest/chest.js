const bot = require('../../../bot');
const {myId} = require('../../../config');
const buttonsDictionary = require('../../../dictionaries/buttons');
const sendMessage = require('../../../functions/sendMessage');
const getRandomChest = require('../../../functions/game/chest/getRandomChest');

module.exports = [[/(?:^|\s)\/chest\b/, async (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        let buttons = getRandomChest();

        sendMessage(msg.chat.id, `@${session.userChatData.user.username}, выбери три сундучка!`, {
            disable_notification: true,
            reply_markup: {
                selective: true,
                inline_keyboard: [
                    ...buttons, [{
                        text: buttonsDictionary["ru"].close,
                        callback_data: "close"
                    }]]
            }
        })

    } catch (e) {
        sendMessage(myId, `Command: /chest\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
}]];