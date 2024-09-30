import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import deleteMessageTimeout from '../../../functions/tgBotFunctions/deleteMessageTimeout.js';
import isWinPoints from '../../../functions/game/general/isWinByPoints.js';
import sendPrize from '../../../functions/game/general/sendPrize.js';
import endGame from '../../../functions/game/basketball/endGame.js';
import bot from '../../../bot.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import checkUserCall from '../../../functions/misc/checkUserCall.js';

let maxPulls = 3;

export default [[/^basketball_pull$/, async function (session, callback) {
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