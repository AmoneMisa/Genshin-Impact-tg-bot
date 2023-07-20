const getChatSession = require("../../getters/getChatSession");
const getTime = require("../../getters/getTime");
const getMembers = require("../../getters/getMembers");
const getUserName = require("../../getters/getUserName");
const deleteMessageTimeout = require("../../tgBotFunctions/deleteMessageTimeout");
const betMessage = require("./betMessage");
const editMessageText = require("../../tgBotFunctions/editMessageText");
const sendMessage = require("../../tgBotFunctions/sendMessage");

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

let maxCountMap = {points: 4, elements: 7};

module.exports = function (callback, session, gameName, betType) {
    let chatId = callback.message.chat.id;
    let chatSession = getChatSession(chatId);
    let userId = session.userChatData.user.id;

    if (!chatSession.game[gameName].players[userId]) {
        return;
    }

    if (!session.game.hasOwnProperty(gameName)) {
        session.game[gameName] = {};
    }

    if (!session.game[gameName].hasOwnProperty("pressButtonTimer")) {
        session.game[gameName].pressButtonTimer = 0;
    }

    let [remain] = getTime(session.game[gameName].pressButtonTimer);
    if (remain > 0) {
        return;
    }

    let members = getMembers(chatId);
    let gold = session.game.inventory.gold;
    let username = getUserName(session, "nickname") || session.userChatData.user.id;
    let messageId = null;
    let players = chatSession.game[gameName].players;
    let bet = players[userId].bet;
    if (Object.values(players).length >= maxCountMap[gameName]) {
        if (!players.hasOwnProperty(userId)) {
            return errorMessage(chatId, 3);
        }
    }

    if (chatSession.game[gameName].isStart) {
        return errorMessage(chatId, 2);
    }

    if (betType === "bet") {
        if (gold < bet + 100) {
            return errorMessage(chatId, 0, messageId, username);
        } else {
            players[userId].bet += 100;
        }
    } else if (betType === "double_bet") {
        if (gold < bet * 2) {
            return errorMessage(chatId, 0, messageId, username);
        } else {
            if (bet === 0) {
                return errorMessage(chatId, 1, messageId, username);
            }

            players[userId].bet *= 2;
        }
    } else if (betType === "10t_bet") {
        if (gold < bet + 10000) {
            return errorMessage(chatId, 0, messageId, username);
        }

        players[userId].bet += 10000;
    } else if (betType === "thousand_bet") {
        if (gold < bet + 1000) {
            return errorMessage(chatId, 0, messageId, username);
        }

        players[userId].bet += 1000;
    } else if (betType === "xfive_bet") {
        if (gold < bet * 5) {
            return errorMessage(chatId, 0, messageId, username);
        } else {
            if (bet === 0) {
                return errorMessage(chatId, 1, messageId, username);
            }

            players[userId].bet *= 5;
        }
    } else if (betType === "xten_bet") {
        if (gold < bet * 10) {
            return errorMessage(chatId, 0, messageId, username);
        } else {
            if (bet === 0) {
                return errorMessage(chatId, 1, messageId, username);
            }

            players[userId].bet *= 10;
        }
    } else if (betType === "x20_bet") {
        if (gold < bet * 20) {
            return errorMessage(chatId, 0, messageId, username);
        } else {
            if (bet === 0) {
                return errorMessage(chatId, 1, messageId, username);
            }

            players[userId].bet *= 20;
        }
    } else if (betType === "x50_bet") {
        if (gold < bet * 50) {
            return errorMessage(chatId, 0, messageId, username);
        } else {
            if (bet === 0) {
                return errorMessage(chatId, 1, messageId, username);
            }

            players[userId].bet *= 50;
        }
    } else if (betType === "allin_bet") {
        players[userId].bet = gold;
    }
    deleteMessageTimeout(chatId, messageId, 5000);

    editMessageText(`${betMessage(players, members)}`, {
        chat_id: chatId,
        message_id: chatSession.game[gameName].messageId,
        reply_markup: {
            inline_keyboard: [[{
                text: "Ставка (+100)",
                callback_data: `${gameName}_bet`
            }, {
                text: "Ставка (х2)",
                callback_data: `${gameName}_double_bet`
            }], [{
                text: "Ставка (+1000)",
                callback_data: `${gameName}_thousand_bet`
            }, {
                text: "Ставка (х5)",
                callback_data: `${gameName}_xfive_bet`
            }], [{
                text: "Ставка (+10000)",
                callback_data: `${gameName}_10t_bet`
            }, {
                text: "Ставка (x10)",
                callback_data: `${gameName}_xten_bet`
            }], [{
                text: "Ставка (x20)",
                callback_data: `${gameName}_x20_bet`
            }, {
                text: "Ставка (x50)",
                callback_data: `${gameName}_x50_bet`
            }], [{
                text: "Всё или ничего",
                callback_data: `${gameName}_allin_bet`
            }]]
        }
    });

    session.game[gameName].pressButtonTimer = getOffset();
}