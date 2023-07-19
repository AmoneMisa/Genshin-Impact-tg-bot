const bot = require('../../../bot');
const {myId} = require('../../../config');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getRandomElement = require('../../../functions/game/elements/getRandomElement');
const elementsMessage = require('../../../functions/game/elements/elementsMessage');
const botThink = require('../../../functions/game/elements/botThink');
const updatePoints = require('../../../functions/game/elements/updatePoints');
const getChatSession = require('../../../functions/getters/getChatSession');
const getMembers = require('../../../functions/getters/getMembers');
const betMessage = require('../../../functions/game/general/betMessage');
const deleteMessageTimeout = require('../../../functions/tgBotFunctions/deleteMessageTimeout');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/elements\b/, (msg, session) => {
    try {
        deleteMessage(msg.chat.id, msg.message_id);
        let chatSession = getChatSession(msg.chat.id);
        let members = getMembers(msg.chat.id);
        let userId = session.userChatData.user.id;

        if (chatSession.game.elements.gameSessionIsStart) {
            if (new Date().getTime() - chatSession.game.elements.gameSessionLastUpdateAt <= 2 * 60 * 1000) {
                return sendMessage(msg.chat.id, "Игра уже идёт. Команду нельзя вызвать повторно до окончания игры.")
                    .then(message => {
                        deleteMessageTimeout(msg.chat.id, message.message_id, 7000);
                    });
            }
        }

        chatSession.game.elements.players = {
            bot: {
                usedItems: [],
                points: 0,
                id: "bot"
            }
        };

        if (!chatSession.game.elements.players[userId]) {
            chatSession.game.elements.players[userId] = {
                bet: 0,
                usedItems: [],
                points: 0,
                id: userId
            };
        }

        sendMessage(msg.chat.id, `${betMessage(chatSession.game.elements.players, members)}`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Ставка (+100)",
                    callback_data: "elements_bet"
                }, {
                    text: "Ставка (х2)",
                    callback_data: "elements_double_bet"
                }], [{
                    text: "Ставка (+1000)",
                    callback_data: "elements_thousand_bet"
                }, {
                    text: "Ставка (х5)",
                    callback_data: "elements_xfive_bet"
                }], [{
                    text: "Ставка (+10000)",
                    callback_data: "elements_10t_bet"
                }, {
                    text: "Ставка (x10)",
                    callback_data: "elements_xten_bet"
                }], [{
                    text: "Ставка (x20)",
                    callback_data: "elements_x20_bet"
                }, {
                    text: "Ставка (x50)",
                    callback_data: "elements_x50_bet"
                }], [{
                    text: "Всё или ничего",
                    callback_data: "elements_allin_bet"
                }]]
            }
        }).then(message => chatSession.game.elements.messageId = message.message_id);
        function startGame() {
            for (let playerId of Object.keys(chatSession.game.elements.players)) {
                getRandomElement(chatSession, playerId);
            }

            botThink(chatSession);
            updatePoints(chatSession.game.elements.players);
            chatSession.game.elements.isStart = true;

            return sendMessage(msg.chat.id, `Игра началась. Ставки больше не принимаются.`)
                .then(message => {
                    deleteMessageTimeout(msg.chat.id, message.message_id, 7000);
                })
                .then(() => {
                    bot.editMessageText(elementsMessage(chatSession, userId), {
                        chat_id: msg.chat.id,
                        message_id: chatSession.game.elements.messageId,
                        reply_markup: {
                            inline_keyboard: [[{
                                text: "Стихия!",
                                callback_data: "elements_take"
                            }]]
                        }
                    });
                });
        }

        setTimeout(() => startGame(), 40 * 1000);
    } catch (e) {
        sendMessage(myId, `Command: /elements\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];