import generateRandomEquipment from '../../../functions/game/equipment/generateRandomEquipment.js';
import getUserName from '../../../functions/getters/getUserName.js';
import editMessageCaption from '../../../functions/tgBotFunctions/editMessageCaption.js';
import editMessageMedia from '../../../functions/tgBotFunctions/editMessageMedia.js';
import getFile from '../../../functions/getters/getFile.js';
import buttonsDictionary from '../../../dictionaries/buttons.js';
import gachaTemplate from '../../../template/gachaTemplate.js';
import inventory from '../../../dictionaries/inventory.js';
import getItemString from '../../../functions/game/equipment/getItemString.js';
import makeRoll from '../../../functions/game/equipment/makeRoll.js';
import isCanBeRolled from '../../../functions/game/equipment/isCanBeRolled.js';
import breakItemToSpins from '../../../functions/game/equipment/breakItemToSpins.js';
import addItemToUserInventory from '../../../functions/game/equipment/addItemToUserInventory.js';
import getEmoji from '../../../functions/getters/getEmoji.js';
import getSession from '../../../functions/getters/getSession.js';
import { ensureGachaEntry, getGachaShardEntry } from '../../../functions/game/equipment/normalizeGachaState.js';

export default [[/^lucky_roll\.([\-0-9]+)$/, async function (session, callback, [ , chatId]) {
    let file = getFile(`images/gacha`, "choice");
    let foundSession = await getSession(chatId, callback.from.id);

    await editMessageMedia(file, `@${getUserName(foundSession, "nickname")}, выбери спираль удачи`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [[{
                text: "Спираль новичка",
                callback_data: `lucky_roll.${chatId}.newbie`
            }, {
                text: "Обычная спираль",
                callback_data: `lucky_roll.${chatId}.common`
            }], [{
                text: "Спираль редкостей",
                callback_data: `lucky_roll.${chatId}.rare`
            }, {
                text: "Королевская спираль",
                callback_data: `lucky_roll.${chatId}.royal`
            }], [{
                text: "Божественная спираль",
                callback_data: `lucky_roll.${chatId}.goddess`
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], [/^lucky_roll\.([\-0-9]+)\.([^.]+)$/, async function (session, callback, [, chatId, gachaType]) {
    let gacha = gachaTemplate.find(item => item.name === gachaType);
    let foundSession = await getSession(chatId, callback.from.id);
    let gachaState = ensureGachaEntry(foundSession, gachaType);
    let shardState = getGachaShardEntry(foundSession, gachaType, true);

    let costMessage = "";
    let message = "";
    let result = isCanBeRolled(foundSession, gachaType);

    if (result === 1) {
        message = `@${getUserName(foundSession, "nickname")}, твой уровень слишком низкий. Текущий уровень: ${foundSession.game.stats.lvl}. Требуемый уровень: ${gacha.needLvl}`;
    } else if (result === 2) {
        message = `@${getUserName(foundSession, "nickname")}, недостаточно золота. Твоё золото: ${foundSession.game.inventory.gold}. Требуемое количество: ${gacha.spinCost.gold}`;
    } else if (result === 3) {
        message = `@${getUserName(foundSession, "nickname")}, недостаточно кристаллов. Твои кристаллы: ${foundSession.game.inventory.crystals}. Требуемое количество: ${gacha.spinCost.crystals}`;
    } else if (result === -2) {
        message = `@${getUserName(foundSession, "nickname")}, бесплатные попытки! Количество: ${gachaState.freeSpins}. (Обновляются каждый день)\n`;
    } else if (result === -1) {
        message = `@${getUserName(foundSession, "nickname")}, в первую очередь расходуются осколки. Твоё количество осколков: ${shardState.value}. Необходимое количество: ${gacha.piecesForFleeCall}\n`;
    }  else if (result === 0) {
        for (let [costKey, costValue] of Object.entries(gacha.spinCost)) {
            costMessage += `${getEmoji(costKey)} ${inventory[costKey]} - ${costValue}\n`;
        }

        message = `@${getUserName(foundSession, "nickname")}, ${gacha.translatedName} - попытай свою удачу!\nСтоимость крутки: ${costMessage}`;
    } else {
        throw new Error("Что-то пошло не так при попытке проверить возможность крутить гачу.");
    }

    if (result > 0) {
        await editMessageCaption(message, {
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Главное меню",
                    callback_data: `lucky_roll.${chatId}`
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        }, callback.message.photo);

        return;
    }

    let file = getFile(`images/gacha`, gachaType);

    if (file) {
        await editMessageMedia(file, message, {
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Крутка!",
                    callback_data: `lucky_roll.${chatId}.${gachaType}.roll`
                }], [{
                    text: "Главное меню",
                    callback_data: `lucky_roll.${chatId}`
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    }
}], [/^lucky_roll\.([\-0-9]+)\.([^.]+)\.roll$/, async function (session, callback, [, chatId, gachaType]) {
    let gacha = gachaTemplate.find(item => item.name === gachaType);
    let foundSession = await getSession(chatId, callback.from.id);
    let gachaItemInInventory = ensureGachaEntry(foundSession, gachaType);
    let shardState = getGachaShardEntry(foundSession, gachaType, true);
    let isCanBeRolledResult = isCanBeRolled(foundSession, gachaType);

    if (isCanBeRolledResult === 1) {
        return;
    } else if (isCanBeRolledResult === 2) {
        return;
    } else if (isCanBeRolledResult === 3) {
        return;
    } else if (isCanBeRolledResult === -2) {
        gachaItemInInventory.freeSpins--;
    } else if (isCanBeRolledResult === -1) {
        shardState.value -= gacha.piecesForFleeCall;
    }

    let randomGrade = makeRoll(foundSession.game, gacha, isCanBeRolledResult < 0);
    let result = generateRandomEquipment(foundSession.game.stats.lvl, randomGrade);
    foundSession.game.gachaTempItem = result;
    foundSession.game.gachaTempType = gachaType;

    await editMessageCaption(`@${getUserName(foundSession, "nickname")}, твой выигрыш:\n${getItemString(result)}\nТы можешь оставить его или распылить на осколки для призыва.`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Оставить",
                callback_data: `lucky_roll.${chatId}.${gachaType}.save`
            }], [{
                text: "Распылить",
                callback_data: `lucky_roll.${chatId}.${gachaType}.break`
            }]]
        }
    }, callback.message.photo);
}], [/^lucky_roll\.([\-0-9]+)\.([^.]+)\.save$/, async function (session, callback, [, chatId, gachaType]) {
    let foundSession = await getSession(chatId, callback.from.id);
    if (!foundSession.game.gachaTempItem || foundSession.game.gachaTempType !== gachaType) {
        return;
    }

    addItemToUserInventory(foundSession, foundSession.game.gachaTempItem);
    foundSession.game.gachaTempItem = null;
    foundSession.game.gachaTempType = null;

    await editMessageCaption(`@${getUserName(foundSession, "nickname")}, предмет добавлен в инвентарь.`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Главное меню",
                callback_data: `lucky_roll.${chatId}`
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^lucky_roll\.([\-0-9]+)\.([^.]+)\.break$/, async function (session, callback, [, chatId, gachaType]) {
    let foundSession = await getSession(chatId, callback.from.id);
    if (!foundSession.game.gachaTempItem || foundSession.game.gachaTempType !== gachaType) {
        return;
    }

    let countItems = breakItemToSpins(foundSession.game.inventory, foundSession.game.gachaTempItem, gachaType);
    foundSession.game.gachaTempItem = null;
    foundSession.game.gachaTempType = null;

    await editMessageCaption(`@${getUserName(foundSession, "nickname")}, ты получил ${countItems} осколков для "${gachaTemplate.find(item => item.name === gachaType).translatedName}"!`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Главное меню",
                callback_data: `lucky_roll.${chatId}`
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}]];