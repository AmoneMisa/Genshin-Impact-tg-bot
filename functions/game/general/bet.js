import Chat from "../../../db/models/Chat.js";
import getTime from "../../getters/getTime.js";
import getUserName from "../../getters/getUserName.js";
import getMembers from "../../getters/getMembers.js";
import betMessage from "./betMessage.js";
import editMessageText from "../../tgBotFunctions/editMessageText.js";
import sendMessage from "../../tgBotFunctions/sendMessage.js";

function getOffset() {
    return Date.now() + 2000;
}

function errorMessage(chatId, errorCode = 0, username) {
    const messages = [
        `@${username}, у тебя нет столько золота.`,
        `@${username}, ты не можешь умножить ставку, которая равна нулю.`,
        `Игра уже началась. Делать ставки нельзя`,
        `В игре уже максимальное количество участников.`,
    ];

    return sendMessage(chatId, messages[errorCode]);
}

const maxCountMap = { points: 4, elements: 7 };

const betConfig = {
    bet: { type: "add", value: 100 },
    thousand_bet: { type: "add", value: 1000 },
    "10t_bet": { type: "add", value: 10000 },
    double_bet: { type: "mult", value: 2 },
    xfive_bet: { type: "mult", value: 5 },
    xten_bet: { type: "mult", value: 10 },
    x20_bet: { type: "mult", value: 20 },
    x50_bet: { type: "mult", value: 50 },
    allin_bet: { type: "allin" },
};

/**
 * Обновление ставки игрока в MongoDB.
 */
export default async function(callback, chatId, userId, gameName, betType) {
    const chat = await Chat.findOne({ chatId });
    if (!chat) throw new Error(`Чат ${chatId} не найден`);

    const member = chat.members.find(m => String(m.userId) === String(userId));
    if (!member) throw new Error(`Игрок ${userId} не найден`);

    const players = chat.game?.[gameName]?.players;
    if (!players?.[userId]) return;

    if (!member.game[gameName]) member.game[gameName] = {};
    if (!member.game[gameName].pressButtonTimer) member.game[gameName].pressButtonTimer = 0;

    const [remain] = getTime(member.game[gameName].pressButtonTimer);
    if (remain > 0) return;

    const members = await getMembers(chatId);
    const gold = Number(member.game.inventory.gold) || 0;
    const username = await getUserName(userId, "nickname") || member.userChatData?.user?.id || userId;
    const bet = Number(players[userId].bet) || 0;

    if (Object.values(players).length >= maxCountMap[gameName] && !players[userId]) {
        return errorMessage(chatId, 3, username);
    }

    if (chat.game[gameName].isStart) return errorMessage(chatId, 2, username);

    const config = betConfig[betType];
    if (config) {
        if (config.type === "add") {
            if (gold < bet + config.value) return errorMessage(chatId, 0, username);
            players[userId].bet = bet + config.value;
        } else if (config.type === "mult") {
            if (bet === 0) return errorMessage(chatId, 1, username);
            if (gold < bet * config.value) return errorMessage(chatId, 0, username);
            players[userId].bet = bet * config.value;
        } else if (config.type === "allin") {
            players[userId].bet = gold;
        }
    }

    member.game[gameName].pressButtonTimer = getOffset();
    await chat.save();

    await editMessageText(await betMessage(players, members), {
        ...(callback.message.message_thread_id
            ? { message_thread_id: callback.message.message_thread_id }
            : {}),
        chat_id: chatId,
        message_id: chat.game[gameName].messageId,
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "Ставка (+100)", callback_data: `${gameName}_bet` },
                    { text: "Ставка (х2)", callback_data: `${gameName}_double_bet` },
                ],
                [
                    { text: "Ставка (+1000)", callback_data: `${gameName}_thousand_bet` },
                    { text: "Ставка (х5)", callback_data: `${gameName}_xfive_bet` },
                ],
                [
                    { text: "Ставка (+10000)", callback_data: `${gameName}_10t_bet` },
                    { text: "Ставка (x10)", callback_data: `${gameName}_xten_bet` },
                ],
                [
                    { text: "Ставка (x20)", callback_data: `${gameName}_x20_bet` },
                    { text: "Ставка (x50)", callback_data: `${gameName}_x50_bet` },
                ],
                [
                    { text: "Всё или ничего", callback_data: `${gameName}_allin_bet` },
                ],
            ],
        },
    });
}
