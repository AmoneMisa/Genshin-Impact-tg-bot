const deleteMessageTimeout = require('../../../functions/tgBotFunctions/deleteMessageTimeout');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getUserName = require('../../../functions/getters/getUserName');
const checkUserCall = require("../../../functions/misc/checkUserCall");

module.exports = [[/^crystal_buy\.([\-0-9]+)+$/, function (session, callback) {
    let [, amount] = callback.data.match(/^crystal_buy\.([\-0-9]+)$/);
    amount = parseInt(amount);

    if (!checkUserCall(callback, session)) {
        return ;
    }

    if (session.game.inventory.gold < amount * 1500) {
        return  sendMessage(callback.message.chat.id, `${getUserName(session, "nickname")}, у тебя не хватает ${amount * 1500 - session.game.inventory.gold} золота для этой покупки`)
            .then((message) => deleteMessageTimeout(callback.message.chat.id, message.message_id, 10000));
    }

    session.game.inventory.gold -= amount * 1500;

    if (typeof session.game.inventory.crystals === "string") {
        session.game.inventory.crystals = parseInt(session.game.inventory.crystals);
    }

    session.game.inventory.crystals += amount;

    sendMessage(callback.message.chat.id, `${getUserName(session, "nickname")}, ты успешно купил ${amount} кристаллов`)
        .then((message) => deleteMessageTimeout(callback.message.chat.id, message.message_id, 10000));
}]];