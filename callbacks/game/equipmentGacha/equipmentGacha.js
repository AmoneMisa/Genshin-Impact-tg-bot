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
const checkUserCall = require("../../../functions/misc/checkUserCall");

module.exports = [[/^lucky_roll$/, async function (session, callback) {
    if (!checkUserCall(callback, session)) {
        return;
    }

    let file = getFile(`images/gacha`, "choice");

    await editMessageMedia(file, `@${getUserName(session, "nickname")}, выбери спираль удачи`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [[{
                text: "Спираль новичка",
                callback_data: "lucky_roll.newbie"
            }, {
                text: "Обычная спираль",
                callback_data: "lucky_roll.common"
            }], [{
                text: "Спираль редкостей",
                callback_data: "lucky_roll.rare"
            }, {
                text: "Королевская спираль",
                callback_data: "lucky_roll.royal"
            }], [{
                text: "Божественная спираль",
                callback_data: "lucky_roll.goddess"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], [/^lucky_roll.([^.]+)$/, async function (session, callback, [, gachaType]) {
    if (!checkUserCall(callback, session)) {
        return;
    }

    let gacha = gachaTemplate.find(item => item.name === gachaType);

    if (!session.game.gacha.find(item => item.name === gachaType)) {
        session.game.gacha.push({name: gachaType, freeSpins: gacha.freeSpins, piecesForFleeCall: 0});
    }

    let costMessage = "";
    let message = "";
    let result = isCanBeRolled(session, gachaType);

    if (result === 1) {
        message = `@${getUserName(session, "nickname")}, твой уровень слишком низкий. Текущий уровень: ${session.game.stats.lvl}. Требуемый уровень: ${gacha.needLvl}`;
    } else if (result === 2) {
        message = `@${getUserName(session, "nickname")}, недостаточно золота. Твоё золото: ${session.game.inventory.gold}. Требуемое количество: ${gacha.spinCost.gold}`;
    } else if (result === 3) {
        message = `@${getUserName(session, "nickname")}, недостаточно кристаллов. Твои кристаллы: ${session.game.inventory.crystals}. Требуемое количество: ${gacha.spinCost.crystals}`;
    } else if (result === -2) {
        message = `@${getUserName(session, "nickname")}, бесплатные попытки! Количество: ${session.game.gacha.find(item => item.name === gachaType).freeSpins}. (Обновляются каждый день)\n`;
    } else if (result === -1) {
        message = `@${getUserName(session, "nickname")}, в первую очередь расходуются осколки. Твоё количество осколков: ${session.game.gacha.find(item => item.name === gachaType).piecesForFleeCall}. Необходимое количество: ${gacha.piecesForFleeCall}\n`;
    }  else if (result === 0) {
        for (let [costKey, costValue] of Object.entries(gacha.spinCost)) {
            costMessage += `${getEmoji(costKey)} ${inventory[costKey]} - ${costValue}\n`;
        }

        message = `@${getUserName(session, "nickname")}, ${gachaTemplate.find(item => item.name === gachaType).translatedName} - попытай свою удачу!\nСтоимость крутки: ${costMessage}`;
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
                    callback_data: `lucky_roll`
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
                    callback_data: `lucky_roll.${gachaType}.roll`
                }], [{
                    text: "Главное меню",
                    callback_data: `lucky_roll`
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    }
}], [/^lucky_roll.([^.]+)\.roll$/, async function (session, callback, [, gachaType]) {
    if (!checkUserCall(callback, session)) {
        return;
    }

    let gacha = gachaTemplate.find(item => item.name === gachaType);
    let gachaItemInInventory = session.game.gacha.find(item => item.name === gachaType);
    let isCanBeRolledResult = isCanBeRolled(session, gachaType);

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

    let randomGrade = makeRoll(session.game, gachaTemplate.find(item => item.name === gachaType), isCanBeRolledResult < 0);
    let result = generateRandomEquipment(session.game.gameClass, session.game.stats.lvl, randomGrade);
    session.game.gachaTempItem = result;

    await editMessageCaption(`@${getUserName(session, "nickname")}, твой выигрыш:\n${getItemString(result)}\nТы можешь оставить его или распылить на осколки для призыва.`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Оставить",
                callback_data: `lucky_roll.${gachaType}.save`
            }], [{
                text: "Распылить",
                callback_data: `lucky_roll.${gachaType}.break`
            }]]
        }
    }, callback.message.photo);
}], [/^lucky_roll.([^.]+)\.save$/, async function (session, callback, [, gachaType]) {
    if (!checkUserCall(callback, session)) {
        return;
    }

    addItemToUserInventory(session, session.game.gachaTempItem);
    await editMessageCaption(`@${getUserName(session, "nickname")}, предмет добавлен в инвентарь.`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Главное меню",
                callback_data: `lucky_roll`
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^lucky_roll.([^.]+)\.break$/, async function (session, callback, [, gachaType]) {
    if (!checkUserCall(callback, session)) {
        return;
    }

    let countItems = breakItemToSpins(session.game.inventory, session.game.gachaTempItem, gachaType);

    await editMessageCaption(`@${getUserName(session, "nickname")}, ты получил ${countItems} осколков для "${gachaTemplate.find(item => item.name === gachaType).translatedName}"!`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Главное меню",
                callback_data: `lucky_roll`
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}]];