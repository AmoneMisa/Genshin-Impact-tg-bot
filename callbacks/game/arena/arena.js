const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const sendPhoto = require("../../../functions/tgBotFunctions/sendPhoto");
const editMessageCaption = require("../../../functions/tgBotFunctions/editMessageCaption");
const editMessageMedia = require("../../../functions/tgBotFunctions/editMessageMedia");
const getSession = require("../../../functions/getters/getSession");
const bot = require('../../../bot');
const controlButtons = require('../../../functions/keyboard/controlButtons');
const buildArenaKeyboard = require('../../../functions/game/arena/buildArenaKeyboard');
const getDefenderDataString = require("../../../functions/game/arena/getDefenderDataString");
const getPlayerRating = require("../../../functions/game/arena/getPlayerRating");
const getBattleResult = require("../../../functions/game/arena/getBattleResult");
const calculatePoints = require("../../../functions/game/arena/calculatePoints");
const setPlayerRating = require("../../../functions/game/arena/setPlayerRating");
const getDefendersList = require("../../../functions/game/arena/getDefendersList");
const updateRank = require("../../../functions/game/arena/updateRank");
const getEmoji = require("../../../functions/getters/getEmoji");
const {arenaTempBots} = require("../../../data");
const getFile = require("../../../functions/getters/getFile");
const getTime = require("../../../functions/getters/getTime");

module.exports = [[/^arena\.common\.([\-0-9]+)(?:\.back)?$/, async function (session, callback, [, chatId]) {
    const isBack = callback.data.includes("back");
    let attacker = await getSession(chatId, callback.from.id);
    let [message, showedPlayers] = await getDefendersList("common", chatId, callback.from.id);
    let [rating] = getPlayerRating(callback.from.id, "expansion", chatId);
    let buttons = buildArenaKeyboard(callback.from.id, `arena.common.${chatId}`, rating, "common", chatId, showedPlayers);
    let fullMessage = `Мой рейтинг: ${rating}\nРанг: ${updateRank(callback.from.id, "common", chatId)}\nКоличество попыток для атаки: ${attacker.game.arenaChances}\n\n(Обычная арена) Список соперников:\n\n${message}`;

    if (isBack) {
        await editMessageCaption(fullMessage, {
            disable_notification: true,
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            reply_markup: {
                inline_keyboard: [
                    ...controlButtons(`arena.common.${chatId}`, buttons, 1)
                ]
            }
        }, callback.message.photo);
    } else {
        const file = getFile("images/misc", "commonArena");

        if (file) {
            await sendPhoto(callback.from.id, file, {
                caption: fullMessage,
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: [
                        ...controlButtons(`arena.common.${chatId}`, buttons, 1)
                    ]
                }
            });
        } else {
            await sendMessage(callback.message.chat.id, fullMessage, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: [
                        ...controlButtons(`arena.common.${chatId}`, buttons, 1)
                    ]
                }
            });
        }
    }
}], [/^arena\.expansion\.([\-0-9]+)(?:\.back)?$/, async function (session, callback, [, chatId]) {
    const isBack = callback.data.includes("back");
    let attacker = await getSession(chatId, callback.from.id);
    let [message, showedPlayers] = await getDefendersList("expansion", chatId, callback.from.id);
    let [rating] = getPlayerRating(callback.from.id, "expansion", chatId);
    let buttons = buildArenaKeyboard(callback.from.id, `arena.expansion.${chatId}`, rating, "expansion", chatId, showedPlayers);
    let fullMessage = `Мой рейтинг: ${rating}\nРанг: ${updateRank(callback.from.id, "expansion", chatId)}\nКоличество попыток для атаки: ${attacker.game.arenaExpansionChances}\n\n(Мировая арена) Список соперников:\n\n${message}`;

    if (isBack) {
        await editMessageCaption(fullMessage, {
            disable_notification: true,
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            reply_markup: {
                inline_keyboard: [
                    ...controlButtons(`arena.expansion.${chatId}`, buttons, 1)
                ]
            }
        }, callback.message.photo);
    } else {
        const file = getFile("images/misc", "expansionArena");

        if (file) {
            await sendPhoto(callback.from.id, file, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
                caption: fullMessage,
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: [
                        ...controlButtons(`arena.expansion.${chatId}`, buttons, 1)
                    ]
                }
            });
        } else {
            await sendMessage(callback.message.chat.id, fullMessage, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: [
                        ...controlButtons(`arena.expansion.${chatId}`, buttons, 1)
                    ]
                }
            });
        }
    }
}], [/^arena\.(\w+)\.([\-0-9]+)_([^.]+)$/, async function (session, callback, [, arenaType, chatId, page]) {
    page = parseInt(page);
    let rating = getPlayerRating(callback.from.id, arenaType, chatId);
    let buttons = buildArenaKeyboard(callback.from.id, `arena.${arenaType}.${chatId}`, rating, arenaType, chatId);

    await bot.editMessageReplyMarkup({
        inline_keyboard: [
            ...controlButtons(`arena.${arenaType}.${chatId}`, buttons, page)
        ]
    }, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true
    });
}], [/^arena\.(\w+)\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback, [, arenaType, chatId, defenderId]) {
    let defender = await getSession(chatId, defenderId);
    let attacker = await getSession(chatId, callback.from.id);

    if (arenaType === "common") {
        if (attacker.game.arenaChances < 1) {
            await sendMessage(callback.message.chat.id, `У тебя нет попыток для битв арене.`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: [[{text: "Закрыть", callback_data: "close"}]]
                }
            });
            return;
        }
    }

    if (arenaType === "expansion") {
        if (attacker.game.arenaExpansionChances < 1) {
            await sendMessage(callback.message.chat.id, `У тебя нет попыток для битв мировой арене.`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: [[{text: "Закрыть", callback_data: "close"}]]
                }
            });
            return;
        }
    }

    await editMessageCaption(`Рейтинг: ${getPlayerRating(defenderId, arenaType, chatId)[0]}\n\n${getDefenderDataString(defender)}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Атаковать",
                callback_data: `arena.${arenaType}.${chatId}.${defenderId}.0`
            }], [{
                text: "Назад",
                callback_data: `arena.${arenaType}.${chatId}.back`
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^arena\.(\w+)\.([\-0-9]+)\.bot_([0-9]+)$/, async function (session, callback, [, arenaType, chatId, botNumber]) {
    let attacker = await getSession(chatId, callback.from.id);

    if (arenaType === "common") {
        if (attacker.game.arenaChances < 1) {
            await sendMessage(callback.message.chat.id, `У тебя нет попыток для битв арене.`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: [[{text: "Закрыть", callback_data: "close"}]]
                }
            });
            return;
        }
    }

    if (arenaType === "expansion") {
        if (attacker.game.arenaExpansionChances < 1) {
            await sendMessage(callback.message.chat.id, `У тебя нет попыток для битв мировой арене.`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: [[{text: "Закрыть", callback_data: "close"}]]
                }
            });
            return;
        }
    }

    let arenaBot = arenaTempBots.find(arenaBot => arenaBot.name === parseInt(botNumber));

    await editMessageCaption(`Рейтинг: ${getPlayerRating(null, arenaType, null, arenaBot)}\n\n${getDefenderDataString(arenaBot, true)}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Атаковать",
                callback_data: `arena.${arenaType}.${chatId}.bot_${botNumber}.0`
            }], [{
                text: "Назад",
                callback_data: `arena.${arenaType}.${chatId}.back`
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^arena\.(\w+)\.([\-0-9]+)\.([0-9]+)\.0$/, async function (session, callback, [, arenaType, chatId, defenderId]) {
    let defender = await getSession(chatId, defenderId);
    let attacker = await getSession(chatId, callback.from.id);
    let [battleResult, remainDefenderHpPercent] = getBattleResult(attacker, defender);
    let points = calculatePoints(attacker, defender, arenaType, chatId);
    let message = "";

    if (arenaType === "common") {
        attacker.game.arenaChances = Math.max(1, attacker.game.arenaChances - 1);
    }

    if (arenaType === "expansion") {
        attacker.game.arenaExpansionChances = Math.max(1, attacker.game.arenaChances - 1);
    }

    if (battleResult === 0) {
        message = `Победа!\nТы получил: ${points} очков рейтинга!`;
        setPlayerRating(callback.from.id, arenaType, chatId, points);
        setPlayerRating(defenderId, arenaType, chatId, -points);
    } else if (battleResult === 1) {
        message = `Проигрыш!\nТы потерял: ${points} очков рейтинга.\nОсталось ${getEmoji("hp")} хп у защитника: ${remainDefenderHpPercent.toFixed(2)}%`;
        setPlayerRating(callback.from.id, arenaType, chatId, -points);
        setPlayerRating(defenderId, arenaType, chatId, points);
    } else if (battleResult === 2) {
        message = `Ничья!\nРейтинг остаётся таким же.\nОсталось ${getEmoji("hp")} хп у защитника: ${remainDefenderHpPercent.toFixed(2)}%`;
    }

    await editMessageCaption(message, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Список противников",
                callback_data: `arena.${arenaType}.${chatId}.back`
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^arena\.(\w+)\.([\-0-9]+)\.bot_([0-9]+)\.0$/, async function (session, callback, [, arenaType, chatId, botNumber]) {
    let defender = arenaTempBots.find(arenaBot => arenaBot.name === parseInt(botNumber));
    let attacker = await getSession(chatId, callback.from.id);
    let [battleResult, remainDefenderHpPercent] = getBattleResult(attacker, defender, true);
    let points = calculatePoints(attacker, defender, arenaType, chatId, true);
    let message = "";

    if (arenaType === "common") {
        attacker.game.arenaChances = Math.max(1, attacker.game.arenaChances - 1);
    }

    if (arenaType === "expansion") {
        attacker.game.arenaExpansionChances = Math.max(1, attacker.game.arenaChances - 1);
    }

    if (battleResult === 0) {
        message = `Победа!\nТы получил: ${points} очков рейтинга!`;
        setPlayerRating(callback.from.id, arenaType, chatId, points);
    } else if (battleResult === 1) {
        message = `Проигрыш!\nТы потерял: ${points} очков рейтинга.\nОсталось ${getEmoji("hp")} хп у защитника: ${remainDefenderHpPercent.toFixed(2)}%`;
        setPlayerRating(callback.from.id, arenaType, chatId, -points);
    } else if (battleResult === 2) {
        message = `Ничья!\nРейтинг остаётся таким же.\nОсталось ${getEmoji("hp")} хп у защитника: ${remainDefenderHpPercent.toFixed(2)}%`;
    }

    await editMessageCaption(message, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Список противников",
                callback_data: `arena.${arenaType}.${chatId}.back`
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^arena\.shop\.([\-0-9]+)(?:\.back)?$/, async function (session, callback, [, chatId]) {
    const isBack = callback.data.includes("back");
    let fullMessage = `Количество токенов арены: ${session?.game?.inventory?.arena?.tokens || 0}\n`;

    if (isBack) {
        let file = getFile(`images/misc`, "arena");

        await editMessageMedia(file, "Какой тип арены тебя интересует?", {
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            disable_notification: true,
            reply_markup: {
                selective: true,
                inline_keyboard: [[{
                    text: "Обычная",
                    callback_data: `arena.common.${chatId}`
                }], [{
                    text: "Мировая",
                    callback_data: `arena.expansion.${chatId}`
                }], [{
                    text: "Магазин арены",
                    callback_data: `arena.shop.${chatId}`
                }],[{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        });
    } else {
        const file = getFile("images/misc", "arenaShop");

        await editMessageMedia(file, fullMessage, {
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            disable_notification: true,
            reply_markup: {
                selective: true,
                inline_keyboard: [[{
                    text: "Улучшить медаль",
                    callback_data: `arena.shop.${chatId}.pvpSignUpgrade`
                }], [{
                    text: "Назад",
                    callback_data: `arena.shop.${chatId}.back`
                }],[{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        });
    }
}], [/^arena\.shop\.([\-0-9]+)\.pvpSignUpgrade$/, async function (session, callback, [,chatId]) {
    let pvpSign = session.game.inventory?.arena?.pvpSign || null;

    if (!pvpSign) {
        await editMessageCaption(`У тебя нет медали, чтобы её улучшать. Медаль выдаётся в конце каждой недели.`, {
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Магазин арены",
                    callback_data: `arena.shop.${chatId}.back`
                }], [{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        }, callback.message.photo);

        return;
    }

    let fullMessage = `Предмет исчезнет через: ${getTime(pvpSign.lifeTime)}\n${pvpSign.translatedName} - ур. ${pvpSign.lvl}\nУвеличение исходящего урона по противнику:  ${pvpSign.effects.find(stat => stat.name === "increasePvpDamage").value * 100}%\nУменьшение входящего урона по себе: ${(1 - pvpSign.effects.find(stat => stat.name === "decreaseIncomingPvpDamage").value) * 100}%\n\nКоличество токенов арены: ${session.game.inventory.arena.tokens}\n\nУвеличение исходящего урона после улучшения: ${pvpSign.upgrades[pvpSign.lvl + 1].effects.find(stat => stat.name === "increasePvpDamage").value * 100}%\nУменьшение входящего урона после улучшения: ${pvpSign.upgrades[pvpSign.lvl + 1].effects.find(stat => stat.name === "decreaseIncomingPvpDamage").value * 100}%\nСтоимость улучшения на следующий уровень: ${pvpSign.upgrades[pvpSign.lvl + 1].cost}`;

    await editMessageCaption(`Ты уверен, что хочешь улучшить медаль?\n\n ${fullMessage}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Подтвердить улучшение",
                callback_data: `arena.shop.${chatId}.pvpSignUpgrade.0`
            }],[{
                text: "Магазин арены",
                callback_data: `arena.shop.${chatId}.back`
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^arena\.shop\.([\-0-9]+)\.pvpSignUpgrade\.0$/, async function (session, callback, [,chatId]) {
    let pvpSign = session.game.inventory.arena.pvpSign;
    pvpSign.lvl += 1;
    pvpSign.effects = pvpSign.upgrades[pvpSign.lvl].effects;

    await editMessageCaption(`Вы улучшили медаль до ур. ${session.game.inventory.arena.pvpSign.lvl}!\n\nУвеличение исходящего урона по противнику: ${pvpSign.effects.find(stat => stat.name === "increasePvpDamage").value * 100}%\nУменьшение входящего урона по себе: ${(1 - pvpSign.effects.find(stat => stat.name === "decreaseIncomingPvpDamage").value) * 100}%`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Магазин арены",
                callback_data: `arena.shop.${chatId}.back`
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}]];