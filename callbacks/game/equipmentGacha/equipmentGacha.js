const generateRandomEquipment = require('../../../functions/game/equipment/generateRandomEquipment');
const getUserName = require('../../../functions/getters/getUserName');
const editMessageCaption = require('../../../functions/tgBotFunctions/editMessageCaption');
const editMessageMedia = require('../../../functions/tgBotFunctions/editMessageMedia');
const getFile = require("../../../functions/getters/getFile");
const buttonsDictionary = require("../../../dictionaries/buttons");
const gachaTemplate = require("../../../templates/gachaTemplate");
const inventory = require("../../../dictionaries/inventory");
const getItemString = require("../../../functions/game/equipment/getItemString");
const makeRoll = require("../../../functions/game/equipment/makeRoll");
const isCanBeRolled = require("../../../functions/game/equipment/isCanBeRolled");
const breakItemToSpins = require("../../../functions/game/equipment/breakItemToSpins");
const addItemToUserInventory = require("../../../functions/game/equipment/addItemToUserInventory");
const getEmoji = require("../../../functions/getters/getEmoji");
const getSession = require("../../../functions/getters/getSession");

module.exports = [[/^lucky_roll\.([\-0-9]+)$/, async function (session, callback, [ , chatId]) {
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

    if (!foundSession.game.gacha.find(item => item.name === gachaType)) {
        foundSession.game.gacha.push({name: gachaType, freeSpins: gacha.freeSpins, piecesForFleeCall: 0});
    }

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
        message = `@${getUserName(foundSession, "nickname")}, бесплатные попытки! Количество: ${foundSession.game.gacha.find(item => item.name === gachaType).freeSpins}. (Обновляются каждый день)\n`;
    } else if (result === -1) {
        message = `@${getUserName(foundSession, "nickname")}, в первую очередь расходуются осколки. Твоё количество осколков: ${foundSession.game.gacha.find(item => item.name === gachaType).piecesForFleeCall}. Необходимое количество: ${gacha.piecesForFleeCall}\n`;
    }  else if (result === 0) {
        for (let [costKey, costValue] of Object.entries(gacha.spinCost)) {
            costMessage += `${getEmoji(costKey)} ${inventory[costKey]} - ${costValue}\n`;
        }

        message = `@${getUserName(foundSession, "nickname")}, ${gachaTemplate.find(item => item.name === gachaType).translatedName} - попытай свою удачу!\nСтоимость крутки: ${costMessage}`;
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
    let gachaItemInInventory = foundSession.game.gacha.find(item => item.name === gachaType);
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
        gachaItemInInventory.piecesForFleeCall -= gacha.piecesForFleeCall;
    }

    let randomGrade = makeRoll(foundSession.game, gachaTemplate.find(item => item.name === gachaType), isCanBeRolledResult < 0);
    let result = generateRandomEquipment(foundSession.game.stats.lvl, randomGrade);
    foundSession.game.gachaTempItem = result;

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
    addItemToUserInventory(foundSession, foundSession.game.gachaTempItem);

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
    let countItems = breakItemToSpins(foundSession.game.inventory, foundSession.game.gachaTempItem, gachaType);

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