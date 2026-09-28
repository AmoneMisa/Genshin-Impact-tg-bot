import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import sendPhoto from '../../../functions/tgBotFunctions/sendPhoto.js';
import editMessageCaption from '../../../functions/tgBotFunctions/editMessageCaption.js';
import editMessageMedia from '../../../functions/tgBotFunctions/editMessageMedia.js';
import getSession from '../../../functions/getters/getSession.js';
import saveSession from '../../../functions/getters/saveSession.js';
import bot from '../../../bot.js';
import controlButtons from '../../../functions/keyboard/controlButtons.js';
import buildArenaKeyboard from '../../../functions/game/arena/buildArenaKeyboard.js';
import getDefenderDataString from '../../../functions/game/arena/getDefenderDataString.js';
import getPlayerRating from '../../../functions/game/arena/getPlayerRating.js';
import getDefendersList from '../../../functions/game/arena/getDefendersList.js';
import updateRank from '../../../functions/game/arena/updateRank.js';
import getEmoji from '../../../functions/getters/getEmoji.js';
import ArenaTempBot from '../../../db/models/ArenaTempBot.js';
import getFile from '../../../functions/getters/getFile.js';
import getTime from '../../../functions/getters/getTime.js';
import Chat from '../../../db/models/Chat.js';
import { getArenaRatingDoc } from '../../../functions/game/arena/ratingStore.js';
import { normalizeArenaInventory, getArenaMedalUpgradeState, upgradeArenaMedal } from '../../../functions/game/arena/arenaInventory.js';
import { attackArena } from '../../../miniapp/arena.js';

async function resolveArenaDefenderSession(arenaType, chatId, defenderId) {
    if (arenaType === 'common') return getSession(chatId, defenderId);

    const ratingDoc = await getArenaRatingDoc(defenderId, 'expansion', chatId, {create: false});
    if (!ratingDoc) return null;

    if (ratingDoc.chatId != null) {
        const preferred = await Chat.findOne({chatId: Number(ratingDoc.chatId), 'members.userId': Number(defenderId)});
        if (preferred) return getSession(preferred.chatId, defenderId);
    }

    const fallback = await Chat.findOne({'members.userId': Number(defenderId)}).sort({updatedAt: -1});
    return fallback ? getSession(fallback.chatId, defenderId) : null;
}

function arenaBattleMessage(result) {
    if (!result.ok) {
        if (result.reason === 'no_chances') return 'У тебя нет попыток для битвы на арене.';
        if (result.reason === 'self_attack') return 'Нельзя атаковать самого себя.';
        return 'Соперник больше недоступен. Обнови список противников.';
    }

    if (result.result === 'win') return `Победа!\nТы получил: ${result.points} очков рейтинга!`;
    if (result.result === 'lose') return `Проигрыш!\nТы потерял: ${result.points} очков рейтинга.\nОсталось ${getEmoji('hp')} хп у защитника: ${result.defenderHpPercent.toFixed(2)}%`;
    return `Ничья!\nРейтинг остаётся таким же.\nОсталось ${getEmoji('hp')} хп у защитника: ${result.defenderHpPercent.toFixed(2)}%`;
}

function medalEffect(medal, name, fallback = 0) {
    return Number(medal?.effects?.find(stat => stat?.name === name)?.value) || fallback;
}

export default [[/^arena\.common\.([\-0-9]+)(?:\.back)?$/, async function (session, callback, [, chatId]) {
    const isBack = callback.data.includes("back");
    let attacker = await getSession(chatId, callback.from.id);
    let [message, showedPlayers] = await getDefendersList("common", chatId, callback.from.id);
    let [rating] = await getPlayerRating(callback.from.id, "common", chatId);
    let rank = await updateRank(callback.from.id, "common", chatId);
    let buttons = buildArenaKeyboard(callback.from.id, `arena.common.${chatId}`, rating, "common", chatId, showedPlayers);
    let fullMessage = `Мой рейтинг: ${rating}\nРанг: ${rank}\nКоличество попыток для атаки: ${attacker.game.arenaChances}\n\n(Обычная арена) Список соперников:\n\n${message}`;

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
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
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
    let [rating] = await getPlayerRating(callback.from.id, "expansion", chatId);
    let rank = await updateRank(callback.from.id, "expansion", chatId);
    let buttons = buildArenaKeyboard(callback.from.id, `arena.expansion.${chatId}`, rating, "expansion", chatId, showedPlayers);
    let fullMessage = `Мой рейтинг: ${rating}\nРанг: ${rank}\nКоличество попыток для атаки: ${attacker.game.arenaExpansionChances}\n\n(Мировая арена) Список соперников:\n\n${message}`;

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
    let [rating] = await getPlayerRating(callback.from.id, arenaType, chatId);
    let [, showedPlayers] = await getDefendersList(arenaType, chatId, callback.from.id);
    let buttons = buildArenaKeyboard(callback.from.id, `arena.${arenaType}.${chatId}`, rating, arenaType, chatId, showedPlayers);

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
    let defender = await resolveArenaDefenderSession(arenaType, chatId, defenderId);
    let attacker = await getSession(chatId, callback.from.id);

    if (!defender) {
        return sendMessage(callback.message.chat.id, 'Соперник больше недоступен. Обнови список противников.', {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
            disable_notification: true
        });
    }

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

    await editMessageCaption(`Рейтинг: ${(await getPlayerRating(defenderId, arenaType, chatId))[0]}\n\n${getDefenderDataString(defender)}`, {
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

    let arenaBot = await ArenaTempBot.findOne({ name: parseInt(botNumber) });

    await editMessageCaption(`Рейтинг: ${(await getPlayerRating(null, arenaType, null, arenaBot))[0]}\n\n${await getDefenderDataString(arenaBot, true)}`, {
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
    const attacker = await getSession(chatId, callback.from.id);
    const result = await attackArena(attacker, chatId, callback.from.id, arenaType, `player:${defenderId}`);
    if (result.ok) await saveSession(attacker);

    await editMessageCaption(arenaBattleMessage(result), {
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
    const defender = await ArenaTempBot.findOne({ name: parseInt(botNumber) });
    const attacker = await getSession(chatId, callback.from.id);
    const result = defender
        ? await attackArena(attacker, chatId, callback.from.id, arenaType, `bot:${defender._id}`)
        : {ok: false, reason: 'stale_defender'};
    if (result.ok) await saveSession(attacker);

    await editMessageCaption(arenaBattleMessage(result), {
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
    const member = await getSession(chatId, callback.from.id);
    const arenaInventory = normalizeArenaInventory(member.game);
    const fullMessage = `Количество токенов арены: ${arenaInventory.tokens}
`;

    if (isBack) {
        const file = getFile(`images/misc`, "arena");
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
                }], [{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        });
        return;
    }

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
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], [/^arena\.shop\.([\-0-9]+)\.pvpSignUpgrade$/, async function (session, callback, [, chatId]) {
    const member = await getSession(chatId, callback.from.id);
    const arenaInventory = normalizeArenaInventory(member.game);
    const pvpSign = arenaInventory.pvpSign;

    if (!pvpSign) {
        await editMessageCaption(`У тебя нет медали, чтобы её улучшать. Медаль выдаётся в конце каждой недели.`, {
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            disable_notification: true,
            reply_markup: { inline_keyboard: [[{text: "Магазин арены", callback_data: `arena.shop.${chatId}.back`}], [{text: "Закрыть", callback_data: "close"}]] }
        }, callback.message.photo);
        return;
    }

    const upgrade = getArenaMedalUpgradeState(member.game);
    if (!upgrade.ok) {
        const reason = upgrade.reason === 'max_level' ? 'Медаль уже улучшена до максимального уровня.' : 'Медаль сейчас нельзя улучшить.';
        await editMessageCaption(reason, {
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            disable_notification: true,
            reply_markup: { inline_keyboard: [[{text: "Магазин арены", callback_data: `arena.shop.${chatId}.back`}], [{text: "Закрыть", callback_data: "close"}]] }
        }, callback.message.photo);
        return;
    }

    const nextDamage = Number(upgrade.effects.find(stat => stat.name === 'increasePvpDamage')?.value) || 1;
    const nextDefense = Number(upgrade.effects.find(stat => stat.name === 'decreaseIncomingPvpDamage')?.value) || 0;
    const fullMessage = `Предмет исчезнет через: ${getTime(pvpSign.lifeTime)}
${pvpSign.translatedName} - ур. ${pvpSign.lvl}
Увеличение исходящего урона по противнику: ${medalEffect(pvpSign, 'increasePvpDamage', 1) * 100}%
Уменьшение входящего урона по себе: ${medalEffect(pvpSign, 'decreaseIncomingPvpDamage', 0) * 100}%

Количество токенов арены: ${arenaInventory.tokens}

Уровень после улучшения: ${upgrade.nextLevel}
Увеличение исходящего урона после улучшения: ${nextDamage * 100}%
Уменьшение входящего урона после улучшения: ${nextDefense * 100}%
Стоимость улучшения: ${upgrade.cost}`;

    await editMessageCaption(`Ты уверен, что хочешь улучшить медаль?

${fullMessage}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: upgrade.canAfford ? "Подтвердить улучшение" : "Недостаточно токенов",
                callback_data: upgrade.canAfford ? `arena.shop.${chatId}.pvpSignUpgrade.0` : `arena.shop.${chatId}`
            }], [{
                text: "Магазин арены",
                callback_data: `arena.shop.${chatId}.back`
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^arena\.shop\.([\-0-9]+)\.pvpSignUpgrade\.0$/, async function (session, callback, [, chatId]) {
    const member = await getSession(chatId, callback.from.id);
    const result = upgradeArenaMedal(member.game);

    if (!result.ok) {
        const reason = result.reason === 'not_enough_tokens'
            ? 'Недостаточно токенов арены для улучшения.'
            : result.reason === 'max_level'
                ? 'Медаль уже улучшена до максимального уровня.'
                : 'Медаль сейчас нельзя улучшить.';
        await editMessageCaption(reason, {
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            disable_notification: true,
            reply_markup: { inline_keyboard: [[{text: "Магазин арены", callback_data: `arena.shop.${chatId}.back`}], [{text: "Закрыть", callback_data: "close"}]] }
        }, callback.message.photo);
        return;
    }

    await saveSession(member);
    const pvpSign = result.medal;
    await editMessageCaption(`Вы улучшили медаль до ур. ${result.level}! Потрачено токенов: ${result.spent}. Осталось: ${result.tokens}.

Увеличение исходящего урона по противнику: ${medalEffect(pvpSign, 'increasePvpDamage', 1) * 100}%
Уменьшение входящего урона по себе: ${medalEffect(pvpSign, 'decreaseIncomingPvpDamage', 0) * 100}%`, {
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
