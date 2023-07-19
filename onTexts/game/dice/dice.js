const bot = require('../../../bot');
const {myId} = require('../../../config');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getSession = require('../../../functions/getters/getSession');
const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const getUserName = require('../../../functions/getters/getUserName');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/dice\b/, async (msg) => {
    try {
        deleteMessage(msg.chat.id, msg.message_id);
        let session = await getSession(msg.chat.id, msg.from.id);
        let id;

        if (!session.game.hasOwnProperty('dice')) {
            session.game.dice = {
                bet: 0,
                dice: 0,
                counter: 0,
                isStart: false
            };
        }

        if (session.game.dice.isStart) {
            return await sendMessageWithDelete(msg.chat.id, "Игра уже идёт. Команду нельзя вызвать повторно до окончания игры.", {} , 7000)
        }

        sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, твоя ставка: 0`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Ставка (+100)",
                    callback_data: "dice_bet"
                }, {
                    text: "Ставка (х2)",
                    callback_data: "dice_double_bet"
                }], [{
                    text: "Ставка (+1000)",
                    callback_data: "dice_thousand_bet"
                }, {
                    text: "Ставка (х5)",
                    callback_data: "dice_xfive_bet"
                }], [{
                    text: "Ставка (+10000)",
                    callback_data: "dice_10t_bet"
                }, {
                    text: "Ставка (x10)",
                    callback_data: "dice_xten_bet"
                }], [{
                    text: "Ставка (x20)",
                    callback_data: "dice_x20_bet"
                }, {
                    text: "Ставка (x50)",
                    callback_data: "dice_x50_bet"
                }], [{
                    text: "Всё или ничего",
                    callback_data: "dice_allin_bet"
                }]]
            }
        }).then(message => id = message.message_id);

        function startGame() {
            session.game.dice.isStart = true;
            bot.editMessageText('Кидай кубик. Ты выиграешь, если суммарное количество очков за 3 броска будет больше 12, но меньше 18', {
                message_id: id,
                chat_id: msg.chat.id,
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: [[{
                        text: "Кинуть кубик",
                        callback_data: "dice_pull"
                    }]]
                }
            });
        }

        setTimeout(() => startGame(), 20 * 1000);
    } catch (e) {
        sendMessage(myId, `Command: /dice\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];