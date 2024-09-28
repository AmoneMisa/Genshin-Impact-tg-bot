const editMessageText = require('../../../functions/tgBotFunctions/editMessageText');
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");
const getUserName = require('../../../functions/getters/getUserName');
const checkUserCall = require("../../../functions/misc/checkUserCall");

async function bet(session, callback, calcFunc) {
    if (!checkUserCall(callback, session)) {
        return ;
    }

    if (!session.game.hasOwnProperty('dice')) {
        return;
    }

    let newBet = calcFunc(session.game.dice.bet);

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

    session.game.dice.bet = newBet;
    await updateMessage(session, callback);
}

async function updateMessage(session, callback) {
    return editMessageText(`@${getUserName(session, "nickname")}, твоя ставка: ${session.game.dice.bet}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Ставка (+100)",
                callback_data: "dice_bet"
            }, {
                text: "Ставка (х2)",
                callback_data: "dice_double_bet"
            }], [{
                text: "Ставка (+1000)",
                callback_data: "dice_thousand_bet"
            }, {
                text: "Ставка (х5)",
                callback_data: "dice_xfive_bet"
            }], [{
                text: "Ставка (+10000)",
                callback_data: "dice_10t_bet"
            }, {
                text: "Ставка (x10)",
                callback_data: "dice_xten_bet"
            }], [{
                text: "Ставка (x20)",
                callback_data: "dice_x20_bet"
            }, {
                text: "Ставка (x50)",
                callback_data: "dice_x50_bet"
            }], [{
                text: "Всё или ничего",
                callback_data: "dice_allin_bet"
            }]]
        }
    });
}

module.exports = [
    [/^dice_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet + 100);
    }],
    [/^dice_double_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 2);
    }],
    [/^dice_thousand_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet + 1000);
    }],
    [/^dice_xfive_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 5);
    }],
    [/^dice_10t_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet + 10000);
    }],
    [/^dice_xten_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 10);
    }],
    [/^dice_x20_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 20);
    }],
    [/^dice_x50_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 50);
    }],
    [/^dice_allin_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet = session.game.inventory.gold);
    }],
];