const sendMessage = require('../../functions/tgBotFunctions/sendMessage');
const buttonsDictionary = require('../../dictionaries/buttons');
const getMembers = require('../../functions/getters/getMembers');
const getChatSession = require('../../functions/getters/getChatSession');
const buildKeyboard = require('../../functions/keyboard/buildKeyboard');
const controlButtons = require('../../functions/keyboard/controlButtons');
const getUserName = require('../../functions/getters/getUserName');
const deleteMessage = require("../../functions/tgBotFunctions/deleteMessage");

function isGameStarted(session, gameName) {
    return session.game.hasOwnProperty(gameName) && session.game.dice.hasOwnProperty('isStart') && session.game[gameName].isStart;
}

module.exports = [[/(?:^|\s)\/send_gold\b/, (msg, session) => {
    let chatSession = getChatSession(msg.chat.id);

    if (chatSession.game.points.players && chatSession.game.points.players[session.userChatData.user.id] ||
        isGameStarted(session, 'dice') ||
        isGameStarted(session, 'bowling') ||
        isGameStarted(session, 'darts') ||
        isGameStarted(session, 'basketball') ||
        isGameStarted(session, 'football') ||
        (session.game.hasOwnProperty("slots") && session.game.slots.hasOwnProperty("state") && session.game.slots.state === 'bets')) {
        sendMessage(msg.chat.id, "Ты не можешь переводить золото, играя в игру.");
        return;
    }

    deleteMessage(msg.chat.id, msg.message_id);
    let usersList = getMembers(msg.chat.id);

    usersList = Object.values(usersList).filter(item => !item.userChatData.user.is_bot && (item.userChatData.user.id !== msg.from.id));

    if (!usersList.length) {
        return sendMessage(msg.chat.id, `Нет никого, кому ты мог бы перевести золото.`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    }

    let buttons = buildKeyboard(msg.chat.id, "send_gold_recipient");

    sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, выбери, кому хочешь перевести золото.`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: controlButtons("send_gold_recipient", buttons, 1)
        }
    })
}]];