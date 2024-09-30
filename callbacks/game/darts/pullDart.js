import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import isWinPoints from '../../../functions/game/general/isWinByPoints.js';
import sendPrize from '../../../functions/game/general/sendPrize.js';
import endGame from '../../../functions/game/darts/endGame.js';
import bot from '../../../bot.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessageTimeout from '../../../functions/tgBotFunctions/deleteMessageTimeout.js';
import checkUserCall from '../../../functions/misc/checkUserCall.js';

let maxPulls = 3;

export default [[/^darts_pull$/, async function (session, callback) {
    if (!checkUserCall(callback, session)) {
        return ;
    }

    if (!session.game.hasOwnProperty('darts')) {
        return;
    }

    let chatId = callback.message.chat.id;

    await bot.sendDice(chatId, {emoji: '🎯'}).then(msg => {
        deleteMessageTimeout(chatId, msg.message_id, 10 * 1000);
        session.game.darts.dart += msg.dice.value;
    });

    session.game.darts.counter++;

    if (session.game.darts.counter === maxPulls) {
        let result = isWinPoints(session.game.darts.dart, 13, 18);
        if (!result) {
            await deleteMessage(chatId, callback.message.message_id);
            await sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ты проиграл. Твоя сумма очков: ${session.game.darts.dart}. Ставка: ${session.game.darts.bet}`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
            }, 7000);
            return endGame(session);
        }

        let modifier;
        
        if (session.game.darts.dart === 18) {
            modifier = 2;
        } else {
            modifier = 1.4;
        }
        
        sendPrize(session, modifier, 'darts');
        await deleteMessage(chatId, callback.message.message_id);
        await sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ты выиграл!\nСтавка: ${session.game.darts.bet}\nВыигрыш: ${Math.round(session.game.darts.bet * modifier)}\nСумма очков: ${session.game.darts.dart}`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 7000);

        return endGame(session);
    }
}]];