const bot = require('../../../bot');
const sendMessage = require('../../../functions/sendMessage');
const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');
const getChatSession = require('../../../functions/getChatSession');
const getMembers = require('../../../functions/getMembers');
const betMessage = require('../../../functions/game/point21/betMessage');
const debugMessage = require('../../../functions/debugMessage');
const getTime = require('../../../functions/getTime');

function getOffset() {
    return new Date().getTime() + 2 * 1000;
}

function errorMessage(chatId, errorCode = 0, messageId, username) {
    // 0 - Недостаточно золота
    // 1 - Нельзя умножить ставку, которая равна 0
    // 2 - Игра уже началась
    // 3 - Максимальное количество участников
    const messages = [`@${username}, у тебя нет столько золота.`, `@${username}, ты не можешь умножить ставку, которая равна нулю.`, `Игра уже началась. Делать ставки нельзя`, `В игре уже максимальное количество участников.`];

    return sendMessage(chatId, messages[errorCode])
        .then((message) => messageId = message.message_id);
}

let maxCount = 4;

module.exports = [[/^points_(?:bet|double_bet|xfive_bet|10t_bet|thousand_bet|xten_bet|allin_bet)$/, (session, callback) => {
    try {
        let chatSession = getChatSession(callback.message.chat.id);
        let userId = callback.from.id;

        if (!chatSession.pointPlayers[userId]) {
            return;
        }

        let [remain] = getTime(session.pointPressButtonTimer);

        if (remain > 0) {
            return;
        }

        const [, betType] = callback.data.match(/^points_(bet|double_bet|xfive_bet|10t_bet|thousand_bet|xten_bet|allin_bet)$/);

        let members = getMembers(callback.message.chat.id);
        let chatId = callback.message.chat.id;
        let gold = session.game.inventory.gold;
        let username = session.userChatData.user.username || session.userChatData.user.id;
        let messageId = null;

        let bet = chatSession.pointPlayers[userId].bet;
        if (Object.values(chatSession.pointPlayers).length >= maxCount) {
            if (!chatSession.pointPlayers.hasOwnProperty(userId)) {
                errorMessage(chatId, 3);
            }
        }

        if (chatSession.pointIsStart) {
            errorMessage(chatId, 2);
        }

        if (betType === "bet") {
            if (gold < bet + 100) {
                errorMessage(chatId, 0, messageId, username);
            } else {
                chatSession.pointPlayers[userId].bet += 100;
            }
        } else if (betType === "double_bet") {
            if (gold < bet * 2) {
                errorMessage(chatId, 0, messageId, username);
            } else {
                if (bet === 0) {
                    errorMessage(chatId, 1, messageId, username);
                }

                chatSession.pointPlayers[userId].bet *= 2;
            }
        } else if (betType === "10t_bet") {
            if (gold < bet + 10000) {
                errorMessage(chatId, 0, messageId, username);
            }

            chatSession.pointPlayers[userId].bet += 10000;
        } else if (betType === "thousand_bet") {
            if (gold < bet + 1000) {
                errorMessage(chatId, 0, messageId, username);
            }

            chatSession.pointPlayers[userId].bet += 1000;
        } else if (betType === "xfive_bet") {
            if (gold < bet * 5) {
                errorMessage(chatId, 0, messageId, username);
            } else {
                if (bet === 0) {
                    errorMessage(chatId, 1, messageId, username);
                }

                chatSession.pointPlayers[userId].bet *= 5;
            }
        } else if (betType === "xten_bet") {
            if (gold < bet * 10) {
                errorMessage(chatId, 0, messageId, username);
            } else {
                if (bet === 0) {
                    errorMessage(chatId, 1, messageId, username);
                }

                chatSession.pointPlayers[userId].bet *= 10;
            }
        } else if (betType === "allin_bet") {
            chatSession.pointPlayers[userId].bet = gold;
        }
        deleteMessageTimeout(chatId, messageId, 5000);

        bot.editMessageText(`${betMessage(chatSession, members, 'pointPlayers')}`, {
            chat_id: chatId,
            message_id: chatSession.pointMessageId,
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
                }], [{
                    text: "Ставка (+10000)",
                    callback_data: "points_10t_bet"
                }, {
                    text: "Ставка (x10)",
                    callback_data: "points_xten_bet"
                }], [{
                    text: "Всё или ничего",
                    callback_data: "points_allin_bet"
                }]]
            }
        });

        session.pointPressButtonTimer = getOffset();

    } catch (e) {
        debugMessage(`Command: points_bet\nIn: ${callback.message.chat.id} - ${callback.message.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];