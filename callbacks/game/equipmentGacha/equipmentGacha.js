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
import getEmoji from '../../../functions/getters/getEmoji.js';
import loadPlayer from '../../../functions/getters/loadPlayer.js';

// Returns (lazily creating) the player's per-gacha progress entry. game.gacha is
// an array of { name, freeSpins } (see getLostFieldsInSession); it tracks daily
// free spins only. Summon shards are stored separately in inventory.gacha.items.
function ensureGachaEntry(member, gachaType) {
    let entry = member.game.gacha.find(item => item.name === gachaType);
    if (!entry) {
        const gacha = gachaTemplate.find(item => item.name === gachaType);
        entry = { name: gachaType, freeSpins: gacha.freeSpins };
        member.game.gacha.push(entry);
    }
    return entry;
}

// Player's accumulated summon shards for a gacha type (inventory.gacha.items[].value).
function getShardCount(member, gachaType) {
    const shardItem = member.game.inventory?.gacha?.items?.find(item => item.name === gachaType);
    return shardItem?.value || 0;
}

export default [[/^lucky_roll\.([\-0-9]+)$/, async function (session, callback, [ , chatId]) {
    let file = getFile(`images/gacha`, "choice");
    let { member } = await loadPlayer(chatId, callback.from.id);

    await editMessageMedia(file, `@${await getUserName(member, "nickname")}, выбери спираль удачи`, {
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
    let { chat, member } = await loadPlayer(chatId, callback.from.id);

    if (!member.game.gacha.find(item => item.name === gachaType)) {
        ensureGachaEntry(member, gachaType);
        await chat.save();
    }

    let costMessage = "";
    let message = "";
    let result = isCanBeRolled(member, gachaType);

    if (result === 1) {
        message = `@${await getUserName(member, "nickname")}, твой уровень слишком низкий. Текущий уровень: ${member.game.stats.lvl}. Требуемый уровень: ${gacha.needLvl}`;
    } else if (result === 2) {
        message = `@${await getUserName(member, "nickname")}, недостаточно золота. Твоё золото: ${member.game.inventory.gold}. Требуемое количество: ${gacha.spinCost.gold}`;
    } else if (result === 3) {
        message = `@${await getUserName(member, "nickname")}, недостаточно кристаллов. Твои кристаллы: ${member.game.inventory.crystals}. Требуемое количество: ${gacha.spinCost.crystals}`;
    } else if (result === -2) {
        message = `@${await getUserName(member, "nickname")}, бесплатные попытки! Количество: ${member.game.gacha.find(item => item.name === gachaType).freeSpins}. (Обновляются каждый день)\n`;
    } else if (result === -1) {
        message = `@${await getUserName(member, "nickname")}, в первую очередь расходуются осколки. Твоё количество осколков: ${getShardCount(member, gachaType)}. Необходимое количество: ${gacha.piecesForFleeCall}\n`;
    }  else if (result === 0) {
        for (let [costKey, costValue] of Object.entries(gacha.spinCost)) {
            costMessage += `${getEmoji(costKey)} ${inventory[costKey]} - ${costValue}\n`;
        }

        message = `@${await getUserName(member, "nickname")}, ${gachaTemplate.find(item => item.name === gachaType).translatedName} - попытай свою удачу!\nСтоимость крутки: ${costMessage}`;
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
    let { chat, member } = await loadPlayer(chatId, callback.from.id);
    let gachaItemInInventory = ensureGachaEntry(member, gachaType);
    let isCanBeRolledResult = isCanBeRolled(member, gachaType);

    if (isCanBeRolledResult === 1) {
        return;
    } else if (isCanBeRolledResult === 2) {
        return;
    } else if (isCanBeRolledResult === 3) {
        return;
    } else if (isCanBeRolledResult === -2) {
        gachaItemInInventory.freeSpins--;
    } else if (isCanBeRolledResult === -1) {
        // Spend shards from the same store the inventory shows / break deposits to.
        const shardItem = member.game.inventory.gacha.items.find(item => item.name === gachaType);
        shardItem.value -= gacha.piecesForFleeCall;
    }

    // makeRoll deducts gold/crystals from member.game.inventory for paid spins.
    let randomGrade = makeRoll(member.game, gacha, isCanBeRolledResult < 0);
    let result = generateRandomEquipment(member.game.stats.lvl, randomGrade);
    member.game.gachaTempItem = result;
    await chat.save();

    await editMessageCaption(`@${await getUserName(member, "nickname")}, твой выигрыш:\n${getItemString(result)}\nТы можешь оставить его или распылить на осколки для призыва.`, {
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
    let { chat, member } = await loadPlayer(chatId, callback.from.id);
    let item = member.game.gachaTempItem;

    if (item) {
        if (!member.game.inventory?.equipment?.items) {
            member.game.inventory.equipment.items = [];
        }
        member.game.inventory.equipment.items.push(item);
        member.game.gachaTempItem = null;
        await chat.save();
    }

    await editMessageCaption(`@${await getUserName(member, "nickname")}, предмет добавлен в инвентарь.`, {
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
    let { chat, member } = await loadPlayer(chatId, callback.from.id);
    let item = member.game.gachaTempItem;
    let countItems = 0;

    if (item) {
        countItems = breakItemToSpins(member.game.inventory, item, gachaType);
        member.game.gachaTempItem = null;
        await chat.save();
    }

    await editMessageCaption(`@${await getUserName(member, "nickname")}, ты получил ${countItems} осколков для "${gachaTemplate.find(item => item.name === gachaType).translatedName}"!`, {
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
