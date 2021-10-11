const bot = require('../../../bot');
const {myId} = require('../../../config');
const buttonsDictionary = require('../../../dictionaries/buttons');
const {sessions} = require('../../../data');
const sendMessage = require('../../../functions/sendMessage');
const getSession = require('../../../functions/getSession');
const getRandomChest = require('../../../functions/chest/getRandomChest');

module.exports = [[/(?:^|\s)\/chest\b/, async (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        let session = await getSession(sessions, msg.chat.id, msg.from.id);
        let buttons = getRandomChest();

        sendMessage(msg.chat.id, `@${session.userChatData.user.username}, выбери один из сундучков!`, {
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