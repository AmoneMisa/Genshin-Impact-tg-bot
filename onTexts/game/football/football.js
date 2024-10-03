import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';
import getSession from '../../../functions/getters/getSession.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';

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

    sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, твоя ставка: 0`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Ставка (+100)",
                callback_data: "football_bet"
            }, {
                text: "Ставка (х2)",
                callback_data: "football_double_bet"
            }], [{
                text: "Ставка (+1000)",
                callback_data: "football_thousand_bet"
            }, {
                text: "Ставка (х5)",
                callback_data: "football_xfive_bet"
            }], [{
                text: "Ставка (+10000)",
                callback_data: "football_10t_bet"
            }, {
                text: "Ставка (x10)",
                callback_data: "football_xten_bet"
            }], [{
                text: "Ставка (x20)",
                callback_data: "football_x20_bet"
            }, {
                text: "Ставка (x50)",
                callback_data: "football_x50_bet"
            }], [{
                text: "Всё или ничего",
                callback_data: "football_allin_bet"
            }]]
        }
    }).then(message => id = message.message_id);

    function startGame() {
        session.game.football.isStart = true;
        editMessageText(`@${getUserName(session, "nickname")}, бей. Ты выиграешь, если суммарное количество очков за 3 удара будет больше 12.`, {
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