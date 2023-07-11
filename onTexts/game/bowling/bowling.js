const bot = require('../../../bot');
const {myId} = require('../../../config');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getSession = require('../../../functions/getters/getSession');
const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const getUserName = require('../../../functions/getters/getUserName');

module.exports = [[/(?:^|\s)\/bowling\b/, async (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        let session = await getSession(msg.chat.id, msg.from.id);
        let id;

        if (!session.game.hasOwnProperty('bowling')) {
            session.game.bowling = {
                bet: 0,
                skittles: 0,
                counter: 0,
                isStart: false
            };
        }

        if (session.game.bowling.isStart) {
            return await sendMessageWithDelete(msg.chat.id, "Игра уже идёт. Команду нельзя вызвать повторно до окончания игры.", {} , 7000)
        }

        sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, твоя ставка: 0`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Ставка (+100)",
                    callback_data: "bowling_bet"
                }, {
                    text: "Ставка (х2)",
                    callback_data: "bowling_double_bet"
                }], [{
                    text: "Ставка (+1000)",
                    callback_data: "bowling_thousand_bet"
                }, {
                    text: "Ставка (х5)",
                    callback_data: "bowling_xfive_bet"
                }], [{
                    text: "Ставка (+10000)",
                    callback_data: "bowling_10t_bet"
                }, {
                    text: "Ставка (x10)",
                    callback_data: "bowling_xten_bet"
                }], [{
                    text: "Ставка (x20)",
                    callback_data: "bowling_x20_bet"
                }, {
                    text: "Ставка (x50)",
                    callback_data: "bowling_x50_bet"
                }], [{
                    text: "Всё или ничего",
                    callback_data: "bowling_allin_bet"
                }]]
            }
        }).then(message => id = message.message_id);

        function startGame() {
            session.game.bowling.isStart = true;
            bot.editMessageText('Делай бросок. Ты выиграешь, если суммарное количество сбитых кеглей за 2 броска будет больше 8. При двух страйках, твоя ставка утроится.', {
                message_id: id,
                chat_id: msg.chat.id,
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: [[{
                        text: "Сделать бросок",
                        callback_data: "bowling_pull"
                    }]]
                }
            });
        }

        setTimeout(() => startGame(), 20 * 1000);
    } catch (e) {
        sendMessage(myId, `Command: /bowling\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];