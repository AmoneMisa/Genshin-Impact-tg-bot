const bot = require('../../bot');
const debugMessage = require('../../functions/debugMessage');
const sendMessage = require('../../functions/sendMessage');
const buttonsDictionary = require('../../dictionaries/buttons');
const getMembers = require('../../functions/getMembers');
const getChatSession = require('../../functions/getChatSession');
const buildKeyboard = require('../../functions/buildKeyboard');
const controlButtons = require('../../functions/controlButtons');

module.exports = [[/(?:^|\s)\/send_gold\b/, (msg, session) => {
    try {
        let chatSession = getChatSession(msg.chat.id);

        if (chatSession.pointPlayers && chatSession.pointPlayers[session.userChatData.user.id] ||
            (session.game.hasOwnProperty('dice') && session.game.dice.hasOwnProperty('isStart') && session.game.dice.isStart) ||
            (session.game.hasOwnProperty("slots") && session.game.slots.hasOwnProperty("state") && session.game.slots.state === 'bets')) {
            sendMessage(msg.chat.id, "Ты не можешь переводить золото, играя в игру.");
            return;
        }

        bot.deleteMessage(msg.chat.id, msg.message_id);
        let usersList = getMembers(msg.chat.id);

        usersList = Object.values(usersList).filter(item => !item.userChatData.user.is_bot && (item.userChatData.user.id !== msg.from.id));

        if (!usersList.length) {
            sendMessage(msg.chat.id, `Нет никого, кому ты мог бы перевести золото.`, {
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: [[{
                        text: buttonsDictionary["ru"].close,
                        callback_data: "close"
                    }]]
                }
            });

            return;
        }

        let buttons = buildKeyboard(msg.chat.id, "send_gold_recipient");

        sendMessage(msg.chat.id, `@${session.userChatData.user.username}, выбери, кому хочешь перевести золото.`, {
            disable_notification: true,
            reply_markup: {
                selective: true,
                inline_keyboard: controlButtons("send_gold_recipient", buttons, 1)
            }
        })
    } catch (e) {
        debugMessage(`Command: /send_gold\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];