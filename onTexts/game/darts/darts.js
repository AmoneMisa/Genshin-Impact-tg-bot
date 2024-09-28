const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getSession = require('../../../functions/getters/getSession');
const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const getUserName = require('../../../functions/getters/getUserName');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const editMessageText = require('../../../functions/tgBotFunctions/editMessageText');

module.exports = [[/(?:^|\s)\/darts\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let id;

    if (!session.game.hasOwnProperty('darts')) {
        session.game.darts = {
            bet: 0,
            dart: 0,
            counter: 0,
            isStart: false
        };
    }

    if (session.game.darts.isStart) {
        return await sendMessageWithDelete(msg.chat.id, "Игра уже идёт. Команду нельзя вызвать повторно до окончания игры.", {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {})
        }, 7000)
    }

    sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, твоя ставка: 0`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Ставка (+100)",
                callback_data: "darts_bet"
            }, {
                text: "Ставка (х2)",
                callback_data: "darts_double_bet"
            }], [{
                text: "Ставка (+1000)",
                callback_data: "darts_thousand_bet"
            }, {
                text: "Ставка (х5)",
                callback_data: "darts_xfive_bet"
            }], [{
                text: "Ставка (+10000)",
                callback_data: "darts_10t_bet"
            }, {
                text: "Ставка (x10)",
                callback_data: "darts_xten_bet"
            }], [{
                text: "Ставка (x20)",
                callback_data: "darts_x20_bet"
            }, {
                text: "Ставка (x50)",
                callback_data: "darts_x50_bet"
            }], [{
                text: "Всё или ничего",
                callback_data: "darts_allin_bet"
            }]]
        }
    }).then(message => id = message.message_id);

    function startGame() {
        session.game.darts.isStart = true;
        editMessageText(`@${getUserName(session, "nickname")}, делай бросок. Ты выиграешь, если суммарное количество очков за 3 броска будет больше 13. При трёх "яблочках", твоя ставка удвоится.`, {
            message_id: id,
            chat_id: msg.chat.id,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Сделать бросок",
                    callback_data: "darts_pull"
                }]]
            }
        });
    }

    setTimeout(() => startGame(), 20 * 1000);
}]];