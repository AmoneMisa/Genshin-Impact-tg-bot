import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import deleteMessageTimeout from '../../../functions/tgBotFunctions/deleteMessageTimeout.js';
import isWinPoints from '../../../functions/game/general/isWinByPoints.js';
import sendPrize from '../../../functions/game/general/sendPrize.js';
import endGame from '../../../functions/game/bowling/endGame.js';
import bot from '../../../bot.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import checkUserCall from '../../../functions/misc/checkUserCall.js';

let maxPulls = 2;

export default [[/^bowling_pull$/, async function (session, callback) {
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
            await sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ты проиграл. Твоя сумма сбитых кеглей: ${session.game.bowling.skittles}. Ставка: ${session.game.bowling.bet}`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
            }, 7000);
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
        await sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ты выиграл!\nСтавка: ${session.game.bowling.bet}\nВыигрыш: ${Math.round(session.game.bowling.bet * modifier)}\nСбитое число кеглей: ${session.game.bowling.skittles}`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 7000);

        return endGame(session);
    }
}]];