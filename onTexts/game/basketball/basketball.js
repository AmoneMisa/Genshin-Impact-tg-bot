import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';
import getSession from '../../../functions/getters/getSession.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import betKeyboard from "../../../functions/game/general/betKeyboard.js";

export default [[/(?:^|\s)\/basketball\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let id;

    if (!session.game.hasOwnProperty('basketball')) {
        session.game.basketball = {
            bet: 0,
            ball: 0,
            counter: 0,
            isStart: false
        };
    }

    if (session.game.basketball.isStart) {
        return sendMessageWithDelete(msg.chat.id, "Игра уже идёт. Команду нельзя вызвать повторно до окончания игры.", {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {})
        }, 7000)
    }

    sendMessage(msg.chat.id, `@${await getUserName(session, "nickname")}, твоя ставка: 0`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: {
            inline_keyboard: betKeyboard("basketball")
        }
    }).then(message => id = message.message_id);

    async function startGame() {
        session.game.basketball.isStart = true;
        editMessageText(`@${await getUserName(session, "nickname")}, делай бросок. Ты выиграешь, если суммарное количество очков за 3 броска будет больше 12.`, {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
            message_id: id,
            chat_id: msg.chat.id,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Сделать бросок",
                    callback_data: "basketball_pull"
                }]]
            }
        });
    }

    setTimeout(() => startGame(), 20 * 1000);
}]];