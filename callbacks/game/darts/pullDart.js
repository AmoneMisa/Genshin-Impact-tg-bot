import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import isWinPoints from '../../../functions/game/general/isWinByPoints.js';
import sendPrize from '../../../functions/game/general/sendPrize.js';
import endGame from '../../../functions/game/darts/endGame.js';
import bot from '../../../bot.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessageTimeout from '../../../functions/tgBotFunctions/deleteMessageTimeout.js';
import checkUserCall from '../../../functions/misc/checkUserCall.js';
import loadPlayer from '../../../functions/getters/loadPlayer.js';

let maxPulls = 3;

export default [[/^darts_pull$/, async function (session, callback) {
    if (!await checkUserCall(callback, session)) {
        return ;
    }

    if (!session.game.hasOwnProperty('darts')) {
        return;
    }

    let chatId = callback.message.chat.id;
    const diceMsg = await bot.sendDice(chatId, {emoji: '🎯', ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})});
    deleteMessageTimeout(chatId, diceMsg.message_id, 10 * 1000);

    const { chat, member } = await loadPlayer(chatId, session.userId);
    if (!member.game.hasOwnProperty('darts')) {
        return;
    }
    member.game.darts.dart += diceMsg.dice.value;
    member.game.darts.counter++;
    await chat.save();

    let darts = member.game.darts;

    if (darts.counter === maxPulls) {
        let result = isWinPoints(darts.dart, 13, 18);
        if (!result) {
            await deleteMessage(chatId, callback.message.message_id);
            await sendMessageWithDelete(chatId, `@${await getUserName(session, "nickname")}, ты проиграл. Твоя сумма очков: ${darts.dart}. Ставка: ${darts.bet}`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
            }, 7000);
            return endGame(chatId, session.userId);
        }

        let modifier;

        if (darts.dart === 18) {
            modifier = 2;
        } else {
            modifier = 1.4;
        }

        await sendPrize(chatId, session.userId, 'darts', modifier);
        await deleteMessage(chatId, callback.message.message_id);
        await sendMessageWithDelete(chatId, `@${await getUserName(session, "nickname")}, ты выиграл!\nСтавка: ${darts.bet}\nВыигрыш: ${Math.round(darts.bet * modifier)}\nСумма очков: ${darts.dart}`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 7000);

        return endGame(chatId, session.userId);
    }
}]];
