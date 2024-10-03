import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import checkUserCall from '../../../functions/misc/checkUserCall.js';

async function bet(session, callback, calcFunc) {
    if (!checkUserCall(callback, session)) {
        return ;
    }

    if (!session.game.hasOwnProperty('slots')) {
        return;
    }

    if (session.game.slots.state !== 'bets') {
        return;
    }

    let newBet = calcFunc(session.game.slots.bet);

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

    session.game.slots.bet = newBet;
    await updateMessage(session, callback);
}

async function updateMessage(session, callback) {
    return editMessageText(`Ставка: ${session.game.slots.bet}`, {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Ставка (+100)",
                callback_data: "slots_bet"
            }, {
                text: "Ставка (х2)",
                callback_data: "slots_double_bet"
            }], [{
                text: "Ставка (+1000)",
                callback_data: "slots_thousand_bet"
            }, {
                text: "Ставка (х5)",
                callback_data: "slots_xfive_bet"
            }], [{
                text: "Ставка (+10000)",
                callback_data: "slots_10t_bet"
            }, {
                text: "Ставка (x10)",
                callback_data: "slots_xten_bet"
            }], [{
                text: "Ставка (x20)",
                callback_data: "slots_x20_bet"
            }, {
                text: "Ставка (x50)",
                callback_data: "slots_x50_bet"
            }], [{
                text: "Всё или ничего",
                callback_data: "slots_allin_bet"
            }]]
        }
    });
}

export default [
    [/^slots_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet + 100);
    }],
    [/^slots_double_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 2);
    }],
    [/^slots_thousand_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet + 1000);
    }],
    [/^slots_xfive_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 5);
    }],
    [/^slots_10t_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet + 10000);
    }],
    [/^slots_xten_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 10);
    }],
    [/^slots_x20_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 20);
    }],
    [/^slots_x50_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 50);
    }],
    [/^slots_allin_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet = session.game.inventory.gold);
    }],
];