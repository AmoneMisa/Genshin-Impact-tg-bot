import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import getUserName from '../../../functions/getters/getUserName.js';
import checkUserCall from '../../../functions/misc/checkUserCall.js';

async function bet(session, callback, calcFunc) {
    if (!checkUserCall(callback, session)) {
        return ;
    }

    if (!session.game.hasOwnProperty('darts')) {
        return;
    }

    let newBet = calcFunc(session.game.darts.bet);

    if (newBet > session.game.inventory.gold) {
        await sendMessageWithDelete(callback.message.chat.id, 'Нет денег для ставки', {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 20 * 1000);
        return;
    }

    if (newBet === 0) {
        await sendMessageWithDelete(callback.message.chat.id, 'Ты не можешь умножить ставку равную 0', {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 20 * 1000);
        return;
    }

    session.game.darts.bet = newBet;
    await updateMessage(session, callback);
}

async function updateMessage(session, callback) {
    return editMessageText(`@${getUserName(session, "nickname")}, твоя ставка: ${session.game.darts.bet}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Ставка (+100)",
                callback_data: "darts_bet"
            }, {
                text: "Ставка (х2)",
                callback_data: "darts_double_bet"
            }], [{
                text: "Ставка (+1000)",
                callback_data: "darts_thousand_bet"
            }, {
                text: "Ставка (х5)",
                callback_data: "darts_xfive_bet"
            }], [{
                text: "Ставка (+10000)",
                callback_data: "darts_10t_bet"
            }, {
                text: "Ставка (x10)",
                callback_data: "darts_xten_bet"
            }], [{
                text: "Ставка (x20)",
                callback_data: "darts_x20_bet"
            }, {
                text: "Ставка (x50)",
                callback_data: "darts_x50_bet"
            }], [{
                text: "Всё или ничего",
                callback_data: "darts_allin_bet"
            }]]
        }
    });
}

export default [
    [/^darts_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet + 100);
    }],
    [/^darts_double_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 2);
    }],
    [/^darts_thousand_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet + 1000);
    }],
    [/^darts_xfive_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 5);
    }],
    [/^darts_10t_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet + 10000);
    }],
    [/^darts_xten_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 10);
    }],
    [/^darts_x20_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 20);
    }],
    [/^darts_x50_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 50);
    }],
    [/^darts_allin_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet = session.game.inventory.gold);
    }],
];