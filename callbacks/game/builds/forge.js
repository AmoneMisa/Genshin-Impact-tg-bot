import editMessageCaption from '../../../functions/tgBotFunctions/editMessageCaption.js';
import buttonsDictionary from '../../../dictionaries/buttons.js';
import getEmoji from '../../../functions/getters/getEmoji.js';
import loadPlayer from '../../../functions/getters/loadPlayer.js';
import getItemString from '../../../functions/game/equipment/getItemString.js';
import nameShortener from '../../../functions/game/equipment/nameShortener.js';
import craftItem, { CRAFT_COSTS, getCraftableGrades, canAffordCraft } from '../../../functions/game/equipment/craftItem.js';
import upgradeItem, { getItemUpgradeLevel, getItemUpgradeCost, MAX_UPGRADE_LEVEL } from '../../../functions/game/equipment/upgradeItem.js';

const closeButton = {text: buttonsDictionary["ru"].close, callback_data: "close"};
const backButton = (chatId) => ({text: "Назад", callback_data: `builds.${chatId}.forge.back`});

function formatCost(cost) {
    return `${cost.gold} ${getEmoji("gold")}, ${cost.crystals} ${getEmoji("crystals")}, ${cost.ironOre} ${getEmoji("ironOre")}`;
}

function editCaption(callback, message, keyboard = []) {
    return editMessageCaption(message, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: keyboard
        }
    }, callback.message.photo);
}

export default [
    // ---- Craft ----
    [/^builds\.([\-0-9]+)\.forge\.craft$/, async function (session, callback, [, chatId]) {
        const {member} = await loadPlayer(chatId, callback.from.id);
        const grades = getCraftableGrades(member.game.stats.lvl);

        if (!grades.length) {
            return editCaption(callback, "Твой уровень пока не позволяет создавать снаряжение.", [[backButton(chatId)], [closeButton]]);
        }

        let message = "Выкуй новое снаряжение случайного вида.\n\nВыбери грейд:\n\n";
        const keyboard = [];
        for (const grade of grades) {
            const cost = CRAFT_COSTS[grade.name];
            message += `${grade.name}: ${formatCost(cost)}\n`;
            keyboard.push([{
                text: `${grade.name} (${formatCost(cost)})`,
                callback_data: `builds.${chatId}.forge.craft_${grade.name}`
            }]);
        }
        keyboard.push([backButton(chatId)], [closeButton]);

        return editCaption(callback, message, keyboard);
    }],

    [/^builds\.([\-0-9]+)\.forge\.craft_([a-zA-Z]+)$/, async function (session, callback, [, chatId, grade]) {
        const {member} = await loadPlayer(chatId, callback.from.id);
        const cost = CRAFT_COSTS[grade];

        if (!cost) {
            return editCaption(callback, "Неизвестный грейд.", [[backButton(chatId)], [closeButton]]);
        }

        const affordable = canAffordCraft(member.game.inventory, grade);
        let message = `Выковать предмет грейда ${grade}?\n\nСтоимость: ${formatCost(cost)}`;
        if (!affordable) {
            message += "\n\nНедостаточно ресурсов.";
        }

        const keyboard = affordable
            ? [[{text: "Подтвердить", callback_data: `builds.${chatId}.forge.craft_${grade}.0`}], [backButton(chatId)], [closeButton]]
            : [[backButton(chatId)], [closeButton]];

        return editCaption(callback, message, keyboard);
    }],

    [/^builds\.([\-0-9]+)\.forge\.craft_([a-zA-Z]+)\.0$/, async function (session, callback, [, chatId, grade]) {
        const {chat, member} = await loadPlayer(chatId, callback.from.id);
        const result = craftItem(member.game.inventory, grade, member.game.stats.lvl);

        if (!result.ok) {
            const reasons = {
                unknown_grade: "Неизвестный грейд.",
                level_too_low: `Требуется уровень ${result.requiredLevel}.`,
                not_enough_resources: `Недостаточно ресурсов. Нужно: ${formatCost(result.cost)}.`,
            };
            return editCaption(callback, reasons[result.reason] || "Не удалось выковать предмет.", [[backButton(chatId)], [closeButton]]);
        }

        await chat.save();

        return editCaption(callback, `Предмет выкован!\n\n${getItemString(result.item)}`, [[
            {text: "Ещё выковать", callback_data: `builds.${chatId}.forge.craft`}
        ], [backButton(chatId)], [closeButton]]);
    }],

    // ---- Upgrade ----
    [/^builds\.([\-0-9]+)\.forge\.itemUpgrade$/, async function (session, callback, [, chatId]) {
        const {member} = await loadPlayer(chatId, callback.from.id);
        const items = member.game.inventory?.equipment?.items || [];

        if (!items.length) {
            return editCaption(callback, "У тебя нет снаряжения для улучшения.", [[backButton(chatId)], [closeButton]]);
        }

        let message = "Выбери предмет для улучшения:\n\n";
        const keyboard = [];
        items.forEach((item, index) => {
            const level = getItemUpgradeLevel(item);
            const label = `${item.isUsed ? '⭐ ' : ''}${nameShortener(item.name)}${level > 0 ? ` +${level}` : ''}`;
            keyboard.push([{text: label, callback_data: `builds.${chatId}.forge.itemUpgrade_${index}`}]);
        });
        keyboard.push([backButton(chatId)], [closeButton]);

        return editCaption(callback, message, keyboard);
    }],

    [/^builds\.([\-0-9]+)\.forge\.itemUpgrade_([0-9]+)$/, async function (session, callback, [, chatId, rawIndex]) {
        const {member} = await loadPlayer(chatId, callback.from.id);
        const index = Number(rawIndex);
        const item = member.game.inventory?.equipment?.items?.[index];

        if (!item) {
            return editCaption(callback, "Предмет не найден.", [[backButton(chatId)], [closeButton]]);
        }

        const level = getItemUpgradeLevel(item);
        const cost = getItemUpgradeCost(item);
        let message = `${getItemString(item)}\n`;

        if (!cost) {
            message += `\nПредмет уже максимального уровня улучшения (+${MAX_UPGRADE_LEVEL}).`;
            return editCaption(callback, message, [[backButton(chatId)], [closeButton]]);
        }

        message += `\nУлучшение: +${level} → +${level + 1}\nСтоимость: ${formatCost(cost)}`;

        return editCaption(callback, message, [[
            {text: "Подтвердить улучшение", callback_data: `builds.${chatId}.forge.itemUpgrade_${index}.0`}
        ], [{text: "Назад к списку", callback_data: `builds.${chatId}.forge.itemUpgrade`}], [closeButton]]);
    }],

    [/^builds\.([\-0-9]+)\.forge\.itemUpgrade_([0-9]+)\.0$/, async function (session, callback, [, chatId, rawIndex]) {
        const {chat, member} = await loadPlayer(chatId, callback.from.id);
        const index = Number(rawIndex);
        const item = member.game.inventory?.equipment?.items?.[index];

        if (!item) {
            return editCaption(callback, "Предмет не найден.", [[backButton(chatId)], [closeButton]]);
        }

        const result = upgradeItem(item, member.game.inventory);

        if (!result.ok) {
            const reasons = {
                nothing_to_upgrade: "У этого предмета нет дополнительных характеристик для улучшения.",
                max_level: `Предмет уже максимального уровня улучшения (+${MAX_UPGRADE_LEVEL}).`,
                not_enough_gold: `Недостаточно золота. Нужно ${result.cost?.gold}.`,
                not_enough_crystals: `Недостаточно кристаллов. Нужно ${result.cost?.crystals}.`,
                not_enough_iron_ore: `Недостаточно железной руды. Нужно ${result.cost?.ironOre}.`,
            };
            return editCaption(callback, reasons[result.reason] || "Не удалось улучшить предмет.", [[backButton(chatId)], [closeButton]]);
        }

        // Keep the live combat snapshot in sync if this exact item is currently
        // equipped — equipItem.js copies the item into equipmentStats per slot,
        // so an upgrade after equipping wouldn't otherwise be reflected in combat.
        for (const slot of Object.values(member.game.equipmentStats || {})) {
            if (slot && slot.kind === item.kind && Array.isArray(slot.slots) && item.slots?.length && slot.slots.join(',') === item.slots.join(',')) {
                Object.assign(slot, {stats: item.stats, forgeLevel: item.forgeLevel});
            }
        }

        await chat.save();

        return editCaption(callback, `${nameShortener(item.name)} улучшен до +${result.level}!\n\n${getItemString(item)}`, [[
            {text: "Назад к списку", callback_data: `builds.${chatId}.forge.itemUpgrade`}
        ], [closeButton]]);
    }]
];
