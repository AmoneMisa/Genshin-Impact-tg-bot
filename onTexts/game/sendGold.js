import sendMessage from '../../functions/tgBotFunctions/sendMessage.js';
import buttonsDictionary from '../../dictionaries/buttons.js';
import getMembers from '../../functions/getters/getMembers.js';
import getChatSession from '../../functions/getters/getChatSession.js';
import buildKeyboard from '../../functions/keyboard/buildKeyboard.js';
import controlButtons from '../../functions/keyboard/controlButtons.js';
import deleteMessage from '../../functions/tgBotFunctions/deleteMessage.js';

function isGameStarted(session, gameName) {
    return session.game.hasOwnProperty(gameName) && session.game.dice.hasOwnProperty('isStart') && session.game[gameName].isStart;
}

export default [[/(?:^|\s)\/send_gold\b/, async (msg, session) => {
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