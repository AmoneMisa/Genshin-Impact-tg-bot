import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';
import getSession from '../../../functions/getters/getSession.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import betKeyboard from "../../../functions/game/general/betKeyboard.js";

export default [[/(?:^|\s)\/football\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let id;

    if (!session.game.hasOwnProperty('football')) {
        session.game.football = {
            bet: 0,
            ball: 0,
            counter: 0,
            isStart: false
        };
    }

    if (session.game.football.isStart) {
        return sendMessageWithDelete(msg.chat.id, "Игра уже идёт. Команду нельзя вызвать повторно до окончания игры.", {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {})
        }, 7000)
    }

    sendMessage(msg.chat.id, `@${await getUserName(session, "nickname")}, твоя ставка: 0`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: {
            inline_keyboard: betKeyboard("football")
        }
    }).then(message => id = message.message_id);

    async function startGame() {
        session.game.football.isStart = true;
        editMessageText(`@${await getUserName(session, "nickname")}, бей. Ты выиграешь, если суммарное количество очков за 3 удара будет больше 12.`, {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
            message_id: id,
            chat_id: msg.chat.id,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Ударить по мячу",
                    callback_data: "football_pull"
                }]]
            }
        });
    }

    setTimeout(() => startGame(), 20 * 1000);
}]];