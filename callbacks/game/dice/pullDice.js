import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import isWinPoints from '../../../functions/game/general/isWinByPoints.js';
import sendPrize from '../../../functions/game/general/sendPrize.js';
import endGame from '../../../functions/game/dice/endGame.js';
import bot from '../../../bot.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessageTimeout from '../../../functions/tgBotFunctions/deleteMessageTimeout.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import checkUserCall from '../../../functions/misc/checkUserCall.js';

let maxPulls = 3;

export default [[/^dice_pull$/, async function (session, callback) {
    if (!checkUserCall(callback, session)) {
        return ;
    }

    if (!session.game.hasOwnProperty('dice')) {
        return;
    }

    let chatId = callback.message.chat.id;

    await bot.sendDice(chatId).then(msg => {
        deleteMessageTimeout(chatId, msg.message_id, 10 * 1000);
        session.game.dice.dice += msg.dice.value;
    });

    session.game.dice.counter++;

    if (session.game.dice.counter === maxPulls) {
        let result = isWinPoints(session.game.dice.dice, 12, 18);
        if (result) {
            let modifier = 1.2;
            sendPrize(session, modifier, 'dice');
            await deleteMessage(chatId, callback.message.message_id);
            await sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ты выиграл!\nСтавка: ${session.game.dice.bet}\nВыигрыш: ${Math.round(session.game.dice.bet * modifier)}\nВыигрышное число: ${session.game.dice.dice}`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
            }, 7000);
        } else {
            await deleteMessage(chatId, callback.message.message_id);
            await sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ты проиграл. Твоя сумма кубиков: ${session.game.dice.dice}. Ставка: ${session.game.dice.bet}`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
            }, 7000);
        }

        return endGame(session);
    }
}]];