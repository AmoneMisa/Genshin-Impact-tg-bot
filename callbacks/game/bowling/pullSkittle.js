const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const deleteMessageTimeout = require('../../../functions/tgBotFunctions/deleteMessageTimeout');
const isWinPoints = require('../../../functions/game/general/isWinByPoints');
const sendPrize = require('../../../functions/game/general/sendPrize');
const endGame = require('../../../functions/game/bowling/endGame');
const bot = require('../../../bot');
const getUserName = require('../../../functions/getters/getUserName');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const checkUserCall = require("../../../functions/misc/checkUserCall");

let maxPulls = 2;

module.exports = [[/^bowling_pull$/, async function (session, callback) {
    if (!checkUserCall(callback, session)) {
        return ;
    }

    if (!session.game.hasOwnProperty('bowling')) {
        return;
    }

    let chatId = callback.message.chat.id;

    await bot.sendDice(chatId, {emoji: '🎳'}).then(msg => {
        deleteMessageTimeout(chatId, msg.message_id, 10 * 1000);
        session.game.bowling.skittles += msg.dice.value;
    });

    session.game.bowling.counter++;

    if (session.game.bowling.counter === maxPulls) {
        let result = isWinPoints(session.game.bowling.skittles, 8, 12);
        if (!result) {
            deleteMessage(chatId, callback.message.message_id);
            await sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ты проиграл. Твоя сумма сбитых кеглей: ${session.game.bowling.skittles}. Ставка: ${session.game.bowling.bet}`, {}, 7000);
            return endGame(session);
        }

        let modifier;
        if (session.game.bowling.skittles === 12) {
            modifier = 3;
        } else {
            modifier = 1.2;
        }
        
        sendPrize(session, modifier, 'bowling');
        deleteMessage(chatId, callback.message.message_id);
        await sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ты выиграл!\nСтавка: ${session.game.bowling.bet}\nВыигрыш: ${Math.round(session.game.bowling.bet * modifier)}\nСбитое число кеглей: ${session.game.bowling.skittles}`, {}, 7000);

        return endGame(session);
    }
}]];