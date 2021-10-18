const bot = require('../../../bot');
const {myId} = require('../../../config');
const sendMessage = require('../../../functions/sendMessage');
const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');
const getChatSession = require('../../../functions/getChatSession');
const getMembers = require('../../../functions/getMembers');
const betMessage = require('../../../functions/game/point21/betMessage');

let maxCount = 5;

module.exports = [[/^points_(?:bet|double_bet|xfive_bet|thousand_bet)$/, (session, callback) => {
    try {
        const [, betType] = callback.data.match(/^points_(bet|double_bet|xfive_bet|thousand_bet)$/);
        let userId = callback.from.id;
        let chatId = callback.message.chat.id;
        let gold = session.game.inventory.gold;
        let chatSession = getChatSession(callback.message.chat.id);
        let members = getMembers(callback.message.chat.id);

        if (!chatSession.pointPlayers[userId]) {
            chatSession.pointPlayers[userId] = {
                bet: 0,
                cards: [],
                isPass: false
            };
        }

        let bet = chatSession.pointPlayers[userId].bet;
        if (Object.values(chatSession.pointPlayers).length === maxCount) {
            if (!chatSession.pointPlayers.hasOwnProperty(userId)) {
                return sendMessage(callback.message.chat.id, `В игре уже максимальное количество участников.`)
                    .then((message) => deleteMessageTimeout(chatId, message.message_id, 5000));
            }
        }

        if (chatSession.pointIsStart) {
            return sendMessage(callback.message.chat.id, `Игра уже началась. Делать ставки нельзя`)
                .then((message) => deleteMessageTimeout(chatId, message.message_id, 5000));
        }

        if (betType === "bet") {
            if (gold < bet + 100) {
                return sendMessage(chatId, `${session.userChatData.user.username}, у тебя нет столько золота.`)
                    .then((message) => deleteMessageTimeout(chatId, message.message_id, 5000));
            } else {
                chatSession.pointPlayers[userId].bet += 100;
            }
        } else if (betType === "double_bet") {
            if (gold < bet * 2) {
                return sendMessage(chatId, `${session.userChatData.user.username}, у тебя нет столько золота.`)
                    .then((message) => deleteMessageTimeout(chatId, message.message_id, 5000));
            } else {
                if (bet === 0) {
                    return sendMessage(chatId, `${session.userChatData.user.username}, ты не можешь умножить ставку, которая равна нулю.`)
                        .then((message) => deleteMessageTimeout(chatId, message.message_id, 5000));
                }

                chatSession.pointPlayers[userId].bet *= 2;
            }
        } else if (betType === "thousand_bet") {
            if (gold < bet + 1000) {
                return sendMessage(chatId, `${session.userChatData.user.username}, у тебя нет столько золота.`)
                    .then((message) => deleteMessageTimeout(chatId, message.message_id, 5000));
            }

            chatSession.pointPlayers[userId].bet += 1000;
        } else if (betType === "xfive_bet") {
            if (gold < bet * 5) {
                return sendMessage(chatId, `${session.userChatData.user.username}, у тебя нет столько золота.`)
                    .then((message) => deleteMessageTimeout(chatId, message.message_id, 5000));
            } else {
                if (bet === 0) {
                    return sendMessage(chatId, `${session.userChatData.user.username}, ты не можешь умножить ставку, которая равна нулю.`)
                        .then((message) => deleteMessageTimeout(chatId, message.message_id, 5000));
                }

                chatSession.pointPlayers[userId].bet *= 5;
            }
        }

        bot.editMessageText(`${betMessage(chatSession, members)}`, {
            chat_id: chatId,
            message_id: callback.message.message_id,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Ставка (+100)",
                    callback_data: "points_bet"
                }, {
                    text: "Ставка (х2)",
                    callback_data: "points_double_bet"
                }], [{
                    text: "Ставка (+1000)",
                    callback_data: "points_thousand_bet"
                }, {
                    text: "Ставка (х5)",
                    callback_data: "points_xfive_bet"
                }]]
            }
        })

    } catch (e) {
        console.error(e);
        sendMessage(myId, `Command: points_bet\nIn: ${callback.message.chat.id} - ${callback.message.chat.title}\n\nError: ${e}`);
    }
}]];