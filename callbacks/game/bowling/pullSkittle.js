import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import deleteMessageTimeout from '../../../functions/tgBotFunctions/deleteMessageTimeout.js';
import isWinPoints from '../../../functions/game/general/isWinByPoints.js';
import sendPrize from '../../../functions/game/general/sendPrize.js';
import endGame from '../../../functions/game/bowling/endGame.js';
import bot from '../../../bot.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import checkUserCall from '../../../functions/misc/checkUserCall.js';
import loadPlayer from '../../../functions/getters/loadPlayer.js';

let maxPulls = 2;

export default [[/^bowling_pull$/, async function (session, callback) {
    if (!await checkUserCall(callback, session)) {
        return ;
    }

    if (!session.game.hasOwnProperty('bowling')) {
        return;
    }

    let chatId = callback.message.chat.id;

    const diceMsg = await bot.sendDice(chatId, {emoji: '🎳',
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})});
    deleteMessageTimeout(chatId, diceMsg.message_id, 10 * 1000);

    const { chat, member } = await loadPlayer(chatId, session.userId);
    if (!member.game.hasOwnProperty('bowling')) {
        return;
    }
    member.game.bowling.skittles += diceMsg.dice.value;
    member.game.bowling.counter++;
    await chat.save();

    let bowling = member.game.bowling;

    if (bowling.counter === maxPulls) {
        let result = isWinPoints(bowling.skittles, 8, 12);
        if (!result) {
            await deleteMessage(chatId, callback.message.message_id);
            await sendMessageWithDelete(chatId, `@${await getUserName(session, "nickname")}, ты проиграл. Твоя сумма сбитых кеглей: ${bowling.skittles}. Ставка: ${bowling.bet}`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
            }, 7000);
            return endGame(chatId, session.userId);
        }

        let modifier;
        if (bowling.skittles === 12) {
            modifier = 3;
        } else {
            modifier = 1.2;
        }

        await sendPrize(chatId, session.userId, 'bowling', modifier);
        await deleteMessage(chatId, callback.message.message_id);
        await sendMessageWithDelete(chatId, `@${await getUserName(session, "nickname")}, ты выиграл!\nСтавка: ${bowling.bet}\nВыигрыш: ${Math.round(bowling.bet * modifier)}\nСбитое число кеглей: ${bowling.skittles}`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 7000);

        return endGame(chatId, session.userId);
    }
}]];
