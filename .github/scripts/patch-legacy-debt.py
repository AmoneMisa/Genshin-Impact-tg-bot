from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Missing patch anchor: {label}")
    return text.replace(old, new, 1)


def replace_span(text, start, end, replacement, label):
    start_index = text.find(start)
    if start_index < 0:
        raise RuntimeError(f"Missing patch start: {label}")
    end_index = text.find(end, start_index)
    if end_index < 0:
        raise RuntimeError(f"Missing patch end: {label}")
    return text[:start_index] + replacement + text[end_index:]


# --- Legacy arena callback -------------------------------------------------
arena_path = Path('callbacks/game/arena/arena.js')
arena = arena_path.read_text()

arena = replace_once(
    arena,
    "import getSession from '../../../functions/getters/getSession.js';\nimport loadPlayer from '../../../functions/getters/loadPlayer.js';\n",
    "import getSession from '../../../functions/getters/getSession.js';\nimport saveSession from '../../../functions/getters/saveSession.js';\n",
    'arena session imports',
)
for unused in [
    "import getBattleResult from '../../../functions/game/arena/getBattleResult.js';\n",
    "import calculatePoints from '../../../functions/game/arena/calculatePoints.js';\n",
    "import setPlayerRating from '../../../functions/game/arena/setPlayerRating.js';\n",
]:
    arena = replace_once(arena, unused, '', f'remove {unused.strip()}')

arena = replace_once(
    arena,
    "import getTime from '../../../functions/getters/getTime.js';\n\nexport default",
    "import getTime from '../../../functions/getters/getTime.js';\n"
    "import Chat from '../../../db/models/Chat.js';\n"
    "import { getArenaRatingDoc } from '../../../functions/game/arena/ratingStore.js';\n"
    "import { normalizeArenaInventory, getArenaMedalUpgradeState, upgradeArenaMedal } from '../../../functions/game/arena/arenaInventory.js';\n"
    "import { attackArena } from '../../../miniapp/arena.js';\n\n"
    "async function resolveArenaDefenderSession(arenaType, chatId, defenderId) {\n"
    "    if (arenaType === 'common') return getSession(chatId, defenderId);\n\n"
    "    const ratingDoc = await getArenaRatingDoc(defenderId, 'expansion', chatId, {create: false});\n"
    "    if (!ratingDoc) return null;\n\n"
    "    if (ratingDoc.chatId != null) {\n"
    "        const preferred = await Chat.findOne({chatId: Number(ratingDoc.chatId), 'members.userId': Number(defenderId)});\n"
    "        if (preferred) return getSession(preferred.chatId, defenderId);\n"
    "    }\n\n"
    "    const fallback = await Chat.findOne({'members.userId': Number(defenderId)}).sort({updatedAt: -1});\n"
    "    return fallback ? getSession(fallback.chatId, defenderId) : null;\n"
    "}\n\n"
    "function arenaBattleMessage(result) {\n"
    "    if (!result.ok) {\n"
    "        if (result.reason === 'no_chances') return 'У тебя нет попыток для битвы на арене.';\n"
    "        if (result.reason === 'self_attack') return 'Нельзя атаковать самого себя.';\n"
    "        return 'Соперник больше недоступен. Обнови список противников.';\n"
    "    }\n\n"
    "    if (result.result === 'win') return `Победа!\\nТы получил: ${result.points} очков рейтинга!`;\n"
    "    if (result.result === 'lose') return `Проигрыш!\\nТы потерял: ${result.points} очков рейтинга.\\nОсталось ${getEmoji('hp')} хп у защитника: ${result.defenderHpPercent.toFixed(2)}%`;\n"
    "    return `Ничья!\\nРейтинг остаётся таким же.\\nОсталось ${getEmoji('hp')} хп у защитника: ${result.defenderHpPercent.toFixed(2)}%`;\n"
    "}\n\n"
    "function medalEffect(medal, name, fallback = 0) {\n"
    "    return Number(medal?.effects?.find(stat => stat?.name === name)?.value) || fallback;\n"
    "}\n\n"
    "export default",
    'arena shared helpers',
)

arena = replace_once(
    arena,
    "    let [rating] = await getPlayerRating(callback.from.id, \"common\", chatId);\n    let buttons = buildArenaKeyboard(callback.from.id, `arena.common.${chatId}`, rating, \"common\", chatId, showedPlayers);\n    let fullMessage = `Мой рейтинг: ${rating}\\nРанг: ${updateRank(callback.from.id, \"common\", chatId)}\\nКоличество попыток для атаки: ${attacker.game.arenaChances}\\n\\n(Обычная арена) Список соперников:\\n\\n${message}`;",
    "    let [rating] = await getPlayerRating(callback.from.id, \"common\", chatId);\n    let rank = await updateRank(callback.from.id, \"common\", chatId);\n    let buttons = buildArenaKeyboard(callback.from.id, `arena.common.${chatId}`, rating, \"common\", chatId, showedPlayers);\n    let fullMessage = `Мой рейтинг: ${rating}\\nРанг: ${rank}\\nКоличество попыток для атаки: ${attacker.game.arenaChances}\\n\\n(Обычная арена) Список соперников:\\n\\n${message}`;",
    'await common arena rank',
)

arena = replace_once(
    arena,
    "    let [rating] = await getPlayerRating(callback.from.id, \"expansion\", chatId);\n    let buttons = buildArenaKeyboard(callback.from.id, `arena.expansion.${chatId}`, rating, \"expansion\", chatId, showedPlayers);\n    let fullMessage = `Мой рейтинг: ${rating}\\nРанг: ${updateRank(callback.from.id, \"expansion\", chatId)}\\nКоличество попыток для атаки: ${attacker.game.arenaExpansionChances}\\n\\n(Мировая арена) Список соперников:\\n\\n${message}`;",
    "    let [rating] = await getPlayerRating(callback.from.id, \"expansion\", chatId);\n    let rank = await updateRank(callback.from.id, \"expansion\", chatId);\n    let buttons = buildArenaKeyboard(callback.from.id, `arena.expansion.${chatId}`, rating, \"expansion\", chatId, showedPlayers);\n    let fullMessage = `Мой рейтинг: ${rating}\\nРанг: ${rank}\\nКоличество попыток для атаки: ${attacker.game.arenaExpansionChances}\\n\\n(Мировая арена) Список соперников:\\n\\n${message}`;",
    'await expansion arena rank',
)

arena = replace_once(
    arena,
    "    let [rating] = await getPlayerRating(callback.from.id, arenaType, chatId);\n    let buttons = buildArenaKeyboard(callback.from.id, `arena.${arenaType}.${chatId}`, rating, arenaType, chatId);",
    "    let [rating] = await getPlayerRating(callback.from.id, arenaType, chatId);\n    let [, showedPlayers] = await getDefendersList(arenaType, chatId, callback.from.id);\n    let buttons = buildArenaKeyboard(callback.from.id, `arena.${arenaType}.${chatId}`, rating, arenaType, chatId, showedPlayers);",
    'arena pagination defenders',
)

arena = replace_once(
    arena,
    "    let defender = await getSession(chatId, defenderId);\n    let attacker = await getSession(chatId, callback.from.id);",
    "    let defender = await resolveArenaDefenderSession(arenaType, chatId, defenderId);\n    let attacker = await getSession(chatId, callback.from.id);\n\n    if (!defender) {\n        return sendMessage(callback.message.chat.id, 'Соперник больше недоступен. Обнови список противников.', {\n            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),\n            disable_notification: true\n        });\n    }",
    'resolve expansion defender preview',
)

arena = replace_once(
    arena,
    "`Рейтинг: ${await getPlayerRating(null, arenaType, null, arenaBot)}\\n\\n${await getDefenderDataString(arenaBot, true)}`",
    "`Рейтинг: ${(await getPlayerRating(null, arenaType, null, arenaBot))[0]}\\n\\n${await getDefenderDataString(arenaBot, true)}`",
    'bot rating preview',
)

player_battle_start = "}], [/^arena\\.(\\w+)\\.([\\-0-9]+)\\.([0-9]+)\\.0$/, async function (session, callback, [, arenaType, chatId, defenderId]) {"
bot_battle_start = "}], [/^arena\\.(\\w+)\\.([\\-0-9]+)\\.bot_([0-9]+)\\.0$/, async function (session, callback, [, arenaType, chatId, botNumber]) {"
player_battle = """}], [/^arena\.(\w+)\.([\-0-9]+)\.([0-9]+)\.0$/, async function (session, callback, [, arenaType, chatId, defenderId]) {
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
"""
arena = replace_span(arena, player_battle_start, bot_battle_start, player_battle, 'player arena battle')

shop_start = "}], [/^arena\\.shop\\.([\\-0-9]+)(?:\\.back)?$/, async function (session, callback, [, chatId]) {"
bot_battle = """}], [/^arena\.(\w+)\.([\-0-9]+)\.bot_([0-9]+)\.0$/, async function (session, callback, [, arenaType, chatId, botNumber]) {
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
"""
arena = replace_span(arena, bot_battle_start, shop_start, bot_battle, 'bot arena battle')

shop_replacement = """}], [/^arena\.shop\.([\-0-9]+)(?:\.back)?$/, async function (session, callback, [, chatId]) {
    const isBack = callback.data.includes("back");
    const member = await getSession(chatId, callback.from.id);
    const arenaInventory = normalizeArenaInventory(member.game);
    const fullMessage = `Количество токенов арены: ${arenaInventory.tokens}\n`;

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
    const fullMessage = `Предмет исчезнет через: ${getTime(pvpSign.lifeTime)}\n${pvpSign.translatedName} - ур. ${pvpSign.lvl}\nУвеличение исходящего урона по противнику: ${medalEffect(pvpSign, 'increasePvpDamage', 1) * 100}%\nУменьшение входящего урона по себе: ${medalEffect(pvpSign, 'decreaseIncomingPvpDamage', 0) * 100}%\n\nКоличество токенов арены: ${arenaInventory.tokens}\n\nУровень после улучшения: ${upgrade.nextLevel}\nУвеличение исходящего урона после улучшения: ${nextDamage * 100}%\nУменьшение входящего урона после улучшения: ${nextDefense * 100}%\nСтоимость улучшения: ${upgrade.cost}`;

    await editMessageCaption(`Ты уверен, что хочешь улучшить медаль?\n\n${fullMessage}`, {
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
    await editMessageCaption(`Вы улучшили медаль до ур. ${result.level}! Потрачено токенов: ${result.spent}. Осталось: ${result.tokens}.\n\nУвеличение исходящего урона по противнику: ${medalEffect(pvpSign, 'increasePvpDamage', 1) * 100}%\nУменьшение входящего урона по себе: ${medalEffect(pvpSign, 'decreaseIncomingPvpDamage', 0) * 100}%`, {
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
"""
arena = arena[:arena.find(shop_start)] + shop_replacement
arena_path.write_text(arena)


# --- Legacy inventory callback --------------------------------------------
inv_path = Path('callbacks/game/player/showInventory.js')
inv = inv_path.read_text()
inv = replace_once(
    inv,
    "import getSession from '../../../functions/getters/getSession.js';\n",
    "import getSession from '../../../functions/getters/getSession.js';\nimport saveSession from '../../../functions/getters/saveSession.js';\n",
    'inventory saveSession import',
)

inv = replace_once(
    inv,
    "    if (foundedItem.hasOwnProperty(\"bottleType\")) {\n        let healResult = useHealPotion(foundedSession, foundedItem);\n        return sendHealMessage(healResult, callback, foundedSession, foundedItem, chatId);\n    }",
    "    if (foundedItem.hasOwnProperty(\"bottleType\")) {\n        let healResult = useHealPotion(foundedSession, foundedItem);\n        if (healResult === 0) await saveSession(foundedSession);\n        return sendHealMessage(healResult, callback, foundedSession, foundedItem, chatId);\n    }",
    'persist potion use',
)

inv = replace_once(
    inv,
    "        if (equipResult === 0) {\n            message = `@${await getUserName(foundedSession, \"nickname\")}, ты надел предмет: ${foundedItem.name}!`;\n        } else {",
    "        if (equipResult === 0) {\n            await saveSession(foundedSession);\n            message = `@${await getUserName(foundedSession, \"nickname\")}, ты надел предмет: ${foundedItem.name}!`;\n        } else {",
    'persist legacy equip',
)

inv = replace_once(
    inv,
    "    let equipResult = equipItem(foundedSession, foundedItem);\n    if (equipResult === 1) {\n        unequipItem(foundedSession, foundedItem);\n    } else {\n        return sendMessageWithDelete(callback.message.chat.id, `Произошла ошибка при попытке снять предмет (${foundedItem.name}).`, {\n            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})\n        }, 10 * 1000);\n    }\n\n    await editMessageCaption",
    "    let unequipResult = unequipItem(foundedSession, foundedItem);\n    if (unequipResult !== 0) {\n        return sendMessageWithDelete(callback.message.chat.id, `Произошла ошибка при попытке снять предмет (${foundedItem.name}).`, {\n            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})\n        }, 10 * 1000);\n    }\n    await saveSession(foundedSession);\n\n    await editMessageCaption",
    'legacy unequip semantics',
)

sale_start = "}], [/^player\\.([\\-0-9]+)\\.inventory\\.([^.]+)\\.([^.]+)\\.2$/, async function (session, callback, [, chatId, items, i]) {"
sale_end = "}]];\n\nasync function sendHealMessage"
sale = """}], [/^player\.([\-0-9]+)\.inventory\.([^.]+)\.([^.]+)\.2$/, async function (session, callback, [, chatId, items, i]) {
    // Продажа снаряжения
    if (!checkUserCall(callback, session)) {
        return;
    }

    if (items !== "equipment") {
        return;
    }

    let foundedSession = await getSession(chatId, callback.from.id);
    let itemsList = foundedSession.game.inventory.equipment.items;
    let foundedItem = itemsList[i];

    if (!foundedItem) {
        return sendMessageWithDelete(callback.message.chat.id, `Произошла ошибка при попытке взаимодействия с (${inventoryTranslate[items]}).`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 10 * 1000);
    }

    // Всегда пробуем очистить slot snapshots перед удалением. Это также лечит
    // старые случаи, где isUsed уже расходился с equipmentStats.
    unequipItem(foundedSession, foundedItem);
    const soldGold = Math.max(0, Number(foundedItem.cost) || 0);
    const indexOf = itemsList.indexOf(foundedItem);
    if (indexOf < 0) {
        return sendMessageWithDelete(callback.message.chat.id, `Предмет больше недоступен для продажи.`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 10 * 1000);
    }

    foundedSession.game.inventory.gold = (Number(foundedSession.game.inventory.gold) || 0) + soldGold;
    itemsList.splice(indexOf, 1);
    await saveSession(foundedSession);

    await editMessageCaption(`@${await getUserName(foundedSession, "nickname")}, снаряжение продано: ${foundedItem.name}! Получено золота: ${soldGold}. ${getEmoji("gold")} Твоё золото: ${foundedSession.game.inventory.gold}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [[{
                text: "Главная",
                callback_data: `player.${chatId}.whoami`
            }], [{
                text: "Назад",
                callback_data: `player.${chatId}.inventory.back`
            }, {text: "Закрыть", callback_data: "close"}]]
        }
    }, callback.message.photo);
}]];

async function sendHealMessage"""
inv = replace_span(inv, sale_start, sale_end, sale, 'legacy equipment sale')
inv_path.write_text(inv)


# --- Main CI syntax coverage ----------------------------------------------
ci_path = Path('.github/workflows/miniapp-ci.yml')
ci = ci_path.read_text()
ci = replace_once(
    ci,
    "          node --check functions/game/arena/getPvpSign.js\n          node --check functions/game/arena/generateArenaBot.js\n",
    "          node --check functions/game/arena/getPvpSign.js\n          node --check functions/game/arena/arenaInventory.js\n          node --check functions/game/arena/generateArenaBot.js\n",
    'arena inventory syntax coverage',
)
ci = replace_once(
    ci,
    "          node --check functions/game/sword/swordCore.js\n",
    "          node --check functions/game/player/useHealPotion.js\n          node --check functions/game/player/userDealDamage.js\n          node --check functions/game/sword/swordCore.js\n",
    'player heal syntax coverage',
)
ci = replace_once(
    ci,
    "          node --check callbacks/game/shop/shop.js\n",
    "          node --check callbacks/game/arena/arena.js\n          node --check callbacks/game/player/showInventory.js\n          node --check callbacks/game/player/userSkillsCallback.js\n          node --check callbacks/game/shop/shop.js\n",
    'legacy callback syntax coverage',
)
ci_path.write_text(ci)
