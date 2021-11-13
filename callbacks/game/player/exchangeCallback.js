const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');
const sendMessage = require('../../../functions/sendMessage');

module.exports = [[/^crystal_buy\.([\-0-9]+)+$/, function (session, callback) {
    let [, amount] = callback.data.match(/^crystal_buy\.([\-0-9]+)$/);

    amount = parseInt(amount);

    if (!callback.message.text.includes(session.userChatData.user.username)) {
        return;
    }

    if (session.game.inventory.gold < amount * 1500) {
        return  sendMessage(callback.message.chat.id, `${session.userChatData.user.username}, у тебя не хватает ${amount * 1500 - session.game.inventory.gold} золота для этой покупки`)
            .then((message) => deleteMessageTimeout(callback.message.chat.id, message.message_id, 10000));
    }

    session.game.inventory.gold -= amount * 1500;
    session.game.inventory.crystals += amount;

    sendMessage(callback.message.chat.id, `${session.userChatData.user.username}, ты успешно купил ${amount} кристаллов`)
        .then((message) => deleteMessageTimeout(callback.message.chat.id, message.message_id, 10000));
}]];