const sendMessage = require('../../functions/tgBotFunctions/sendMessage');
const buttonsDictionary = require('../../dictionaries/buttons');
const getMembers = require('../../functions/getters/getMembers');
const getChatSession = require('../../functions/getters/getChatSession');
const buildKeyboard = require('../../functions/keyboard/buildKeyboard');
const controlButtons = require('../../functions/keyboard/controlButtons');
const deleteMessage = require("../../functions/tgBotFunctions/deleteMessage");

function isGameStarted(session, gameName) {
    return session.game.hasOwnProperty(gameName) && session.game.dice.hasOwnProperty('isStart') && session.game[gameName].isStart;
}

module.exports = [[/(?:^|\s)\/send_gold\b/, async (msg, session) => {
    let chatSession = getChatSession(msg.chat.id);

    if (chatSession.game.points.players && chatSession.game.points.players[session.userChatData.user.id] ||
        isGameStarted(session, 'dice') ||
        isGameStarted(session, 'bowling') ||
        isGameStarted(session, 'darts') ||
        isGameStarted(session, 'basketball') ||
        isGameStarted(session, 'football') ||
        (session.game.hasOwnProperty("slots") && session.game.slots.hasOwnProperty("state") && session.game.slots.state === 'bets')) {
        await sendMessage(msg.chat.id, "Ты не можешь переводить золото, играя в игру.", {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        });
        return;
    }

    await deleteMessage(msg.chat.id, msg.message_id);
    let usersList = getMembers(msg.chat.id);

    usersList = Object.values(usersList).filter(item => !item.userChatData.user.is_bot && (item.userChatData.user.id !== msg.from.id) && !item.isHided);

    if (!usersList.length) {
        await sendMessage(msg.from.id, `Нет никого, кому ты мог бы перевести золото.`, {
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

    let buttons = buildKeyboard(msg.chat.id, `sendGoldRecipient.${msg.chat.id}`, false, msg.from.id);

    await sendMessage(msg.from.id, `Выбери, кому хочешь перевести золото.`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: controlButtons(`sendGoldRecipient.${msg.chat.id}`, buttons, 1)
        }
    })
}]];