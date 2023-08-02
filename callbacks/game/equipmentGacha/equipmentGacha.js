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

    let gacha = gachaTemplate[gachaType];
    let costMessage = "";

    let isFreeSpin = session.game.gacha[gachaType] > 0;
    let isLevelEnough = session.game.stats.lvl >= gacha.needLvl;

    if (!isLevelEnough) {
        return editMessageCaption(`@${getUserName(session, "nickname")}, твой уровень слишком низкий. Текущий уровень: ${session.game.stats.lvl}. Требуемый уровень: ${gacha.needLvl}`, {
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
    }

    if (isFreeSpin) {
        costMessage += `Бесплатные попытки! Количество: ${session.game.gacha[gachaType]}. (Обновляются каждый день)\n`;
        session.game.gacha[gachaType]--;
    } else if (session.game.inventory.gacha[gachaType] >= gacha.piecesForFleeCall) {
        costMessage += `В первую очередь расходуются осколки. Твоё количество осколков: ${session.game.inventory.gacha[gachaType]}. Необходимое количество: ${gacha.piecesForFleeCall}\n`;
        session.game.inventory.gacha[gachaType] -= gacha.piecesForFleeCall;
    } else {
        if (gacha.spinCost.gold > session.game.inventory.gold) {
            return editMessageCaption(`@${getUserName(session, "nickname")}, недостаточно золота. Твоё золото: ${session.game.inventory.gold}. Требуемое количество: ${gacha.spinCost.gold}`, {
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
        }

        if (gachaTemplate[gachaType].spinCost.crystals > session.game.inventory.crystals) {
            return editMessageCaption(`@${getUserName(session, "nickname")}, недостаточно кристаллов. Твои кристаллы: ${session.game.inventory.gold}. Требуемое количество: ${gacha.spinCost.crystals}`, {
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
        }

        for (let [costKey, costValue] of Object.entries(gacha.spinCost)) {
            costMessage += `${getEmoji(costKey)} ${inventory[costKey]} - ${costValue}\n`;
        }
    }

    let file = getFile(`images/gacha`, gachaType);

    if (file) {
        await editMessageMedia(file, `@${getUserName(session, "nickname")}, ${gachaTemplate[gachaType].name} - попытай свою удачу!\nСтоимость крутки: ${costMessage}`, {
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

    let randomGrade = makeRoll(session.game.inventory, gachaTemplate[gachaType]);
    let result = generateRandomEquipment(session.game.gameClass, session.game.stats.lvl, randomGrade);
    session.game.gacha.tepmItem = result;

    await editMessageCaption(`@${getUserName(session, "nickname")}, твой выигрыш:\n${getItemString(result)} Ты можешь оставить его или распылить на осколки для призыва.`, {
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

    addItemToUserInventory(session, session.game.gacha.tepmItem);
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

    let countItems = breakItemToSpins(session.game.inventory, session.game.gacha.tepmItem, gachaType);

    await editMessageCaption(`@${getUserName(session, "nickname")}, ты получил ${countItems} осколков для "${gachaTemplate[gachaType].name}"!`, {
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