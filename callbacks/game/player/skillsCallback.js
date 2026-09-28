import loadPlayer from '../../../functions/getters/loadPlayer.js';
import editMessageCaption from '../../../functions/tgBotFunctions/editMessageCaption.js';
import buttonsDictionary from '../../../dictionaries/buttons.js';
import getEmoji from '../../../functions/getters/getEmoji.js';
import {
    getSkillEnchantLevel,
    getSkillPowerMultiplier,
    getPowerMultiplierAtLevel,
    getEffectiveSkillCost,
    getSkillEnchantCost,
    enchantSkill,
    SKILL_ENCHANT_MAX_LEVEL,
} from '../../../functions/game/player/skillEnchant.js';

const closeButton = {text: buttonsDictionary["ru"].close, callback_data: "close"};

function formatCost(cost) {
    return `${cost.gold} ${getEmoji("gold")}, ${cost.crystals} ${getEmoji("crystals")}, ${cost.ironOre} ${getEmoji("ironOre")}, ${cost.sp} ОП`;
}

// Renders a skill's power (damage/heal/shield) at a given enchant multiplier.
function formatPower(skill, multiplier) {
    if (skill.isDealDamage) {
        return `Урон x${((skill.damageModifier || 1) * multiplier).toFixed(2)}`;
    }
    if (skill.isHeal) {
        return `Лечение ${Math.round((skill.healPower || 0) * multiplier * 100)}% ХП`;
    }
    if (skill.isShield) {
        return `Щит ${Math.round((skill.shieldPower || 0) * multiplier * 100)}% ХП`;
    }
    return "";
}

function skillPowerLabel(skill) {
    return formatPower(skill, getSkillPowerMultiplier(skill));
}

function skillPowerTransitionLabel(skill) {
    const level = getSkillEnchantLevel(skill);
    return `${formatPower(skill, getPowerMultiplierAtLevel(level))} → ${formatPower(skill, getPowerMultiplierAtLevel(level + 1))}`;
}

function editCaption(callback, message, keyboard = []) {
    return editMessageCaption(message, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [...keyboard, [closeButton]]
        }
    }, callback.message.photo);
}

export default [
    [/^player\.([\-0-9]+)\.skills$/, async function (session, callback, [, chatId]) {
        const {member} = await loadPlayer(chatId, callback.from.id);
        const skills = member.game.gameClass?.skills || [];

        if (!skills.length) {
            return editCaption(callback, "Сначала выбери игровой класс через меню игрока.");
        }

        let message = `Твои навыки (${member.game.gameClass.stats?.translateName || member.game.gameClass.stats?.name})\n`;
        message += `Очки прокачки (ОП): ${member.game.inventory.sp || 0}\n\n`;

        const keyboard = [];
        for (const skill of skills) {
            const level = getSkillEnchantLevel(skill);
            const {cost, costHp} = getEffectiveSkillCost(skill);
            const costLabel = costHp > 0 ? `${costHp} ${getEmoji("hp")}` : cost > 0 ? `${cost} ${getEmoji("mp")}` : "бесплатно";

            message += `${skill.name}${level > 0 ? ` +${level}` : ""}\n${skill.description}\n${skillPowerLabel(skill)}\nСтоимость: ${costLabel}\n\n`;

            keyboard.push([{
                text: level >= SKILL_ENCHANT_MAX_LEVEL
                    ? `${skill.name}: макс. уровень`
                    : `Улучшить: ${skill.name} (${level} → ${level + 1})`,
                callback_data: `player.${chatId}.skills.upgrade_${skill.slot}`
            }]);
        }

        return editCaption(callback, message, keyboard);
    }],

    [/^player\.([\-0-9]+)\.skills\.upgrade_([0-9]+)$/, async function (session, callback, [, chatId, slot]) {
        const {member} = await loadPlayer(chatId, callback.from.id);
        const skill = member.game.gameClass?.skills?.[slot];

        if (!skill) {
            return editCaption(callback, "Навык не найден.");
        }

        const level = getSkillEnchantLevel(skill);
        const cost = getSkillEnchantCost(skill);

        if (!cost) {
            return editCaption(callback, `${skill.name} уже максимального уровня улучшения (+${SKILL_ENCHANT_MAX_LEVEL}).`, [[{
                text: "Назад",
                callback_data: `player.${chatId}.skills`
            }]]);
        }

        const inventory = member.game.inventory;
        let message = `Улучшение навыка: ${skill.name} +${level} → +${level + 1}\n\n`;
        message += `${skillPowerTransitionLabel(skill)}\n\n`;
        message += `Требуется: ${formatCost(cost)}\n`;
        message += `У тебя: ${inventory.gold || 0} ${getEmoji("gold")}, ${inventory.crystals || 0} ${getEmoji("crystals")}, ${inventory.ironOre || 0} ${getEmoji("ironOre")}, ${inventory.sp || 0} ОП`;

        return editCaption(callback, message, [[{
            text: "Подтвердить улучшение",
            callback_data: `player.${chatId}.skills.confirm_${skill.slot}`
        }], [{
            text: "Назад",
            callback_data: `player.${chatId}.skills`
        }]]);
    }],

    [/^player\.([\-0-9]+)\.skills\.confirm_([0-9]+)$/, async function (session, callback, [, chatId, slot]) {
        const {chat, member} = await loadPlayer(chatId, callback.from.id);
        const skill = member.game.gameClass?.skills?.[slot];

        if (!skill) {
            return editCaption(callback, "Навык не найден.");
        }

        const result = enchantSkill(skill, member.game.inventory);

        if (!result.ok) {
            const reasons = {
                max_level: "Навык уже максимального уровня улучшения.",
                not_enough_gold: `Недостаточно золота. Нужно ${result.cost.gold}.`,
                not_enough_crystals: `Недостаточно кристаллов. Нужно ${result.cost.crystals}.`,
                not_enough_iron_ore: `Недостаточно железной руды. Нужно ${result.cost.ironOre}.`,
                not_enough_sp: `Недостаточно очков прокачки. Нужно ${result.cost.sp}.`,
            };
            return editCaption(callback, reasons[result.reason] || "Не удалось улучшить навык.", [[{
                text: "Назад",
                callback_data: `player.${chatId}.skills`
            }]]);
        }

        await chat.save();

        return editCaption(callback, `${skill.name} улучшен до уровня +${result.level}!\n${skillPowerLabel(skill)}`, [[{
            text: "К навыкам",
            callback_data: `player.${chatId}.skills`
        }]]);
    }]
];
