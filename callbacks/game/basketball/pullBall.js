const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const deleteMessageTimeout = require('../../../functions/tgBotFunctions/deleteMessageTimeout');
const isWinPoints = require('../../../functions/game/general/isWinByPoints');
const sendPrize = require('../../../functions/game/general/sendPrize');
const endGame = require('../../../functions/game/basketball/endGame');
const bot = require('../../../bot');
const getUserName = require('../../../functions/getters/getUserName');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const checkUserCall = require("../../../functions/misc/checkUserCall");

let maxPulls = 3;

module.exports = [[/^basketball_pull$/, async function (session, callback) {
    if (!checkUserCall(callback, session)) {
        return ;
    }

    if (!session.game.hasOwnProperty('basketball')) {
        return;
    }

    let chatId = callback.message.chat.id;

    await bot.sendDice(chatId, {emoji: '🏀'}).then(msg => {
        deleteMessageTimeout(chatId, msg.message_id, 10 * 1000);
        session.game.basketball.ball += msg.dice.value;
    });

    session.game.basketball.counter++;

    if (session.game.basketball.counter === maxPulls) {
        let result = isWinPoints(session.game.basketball.ball, 12, 15);
        if (!result) {
            deleteMessage(chatId, callback.message.message_id)
            await sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ты проиграл. Твоя сумма очков: ${session.game.basketball.ball}. Ставка: ${session.game.basketball.bet}`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
            }, 7000);
            return endGame(session);
        }

        let modifier;
        
        if (session.game.basketball.ball === 15) {
            modifier = 1.7;
        } else {
            modifier = 1.25;
        }
        
        sendPrize(session, modifier, 'basketball');
        deleteMessage(chatId, callback.message.message_id)
        await sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ты выиграл!\nСтавка: ${session.game.basketball.bet}\nВыигрыш: ${Math.round(session.game.basketball.bet * modifier)}\nСумма очков: ${session.game.basketball.ball}`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 7000);

        return endGame(session);
    }
}]];