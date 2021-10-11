const shopTemplate = require('../../templates/shopTemplate');
const getOffset = require('../getOffsetToDay');

function check(session, command, item, userProperty, isDeepUserProperty, userPropertyValue, shopTimer, operation = "=") {
    try {
        if (session.game.shopTimers[shopTimer] >= getOffset()) {
            return `${session.userChatData.user.username}, уже была совершена покупка на этой неделе. Попытка обновится в понедельник в 00.00`
        }

        if (session.game.inventory.gold >= item.cost) {
            if (isDeepUserProperty) {
                userProperty = userPropertyValue;
            }

            if (operation === "+") {
                session[userProperty] += userPropertyValue;
            } else {
                session[userProperty] = userPropertyValue;
            }
            session.game.inventory.gold -= item.cost;
            session.game.shopTimers[shopTimer] = getOffset();
            return `${session.userChatData.user.username}, ${item.message}`;
        }
        return `${session.userChatData.user.username}, сначала нужно обзавестись золотишком, чтобы что-то купить.`
    } catch (e) {
        console.error(e);
    }
}

let commandsArray = ["sword_immune", "sword_add_mm", "boss_add_dmg", "boss_add_cr_chance", "boss_add_cr_dmg", "sword_add_try", "potion_hp_1000", "potion_hp_3000"];

module.exports = function (session, command) {
    if (!session.game) {
        return `${session.userChatData.user.username}, сначала нужно обзавестись золотишком, чтобы что-то купить.`
    }

    if (!commandsArray.includes(command)) {
        return `${session.userChatData.user.username}, такой команды не существует. Попробуй ещё раз`;
    }

    for (let item of shopTemplate) {
        if ((command.includes(item.command)) && item.command.includes("sword_immune")) {
            return check(session, command, item, "swordImmune", false, true, "swordImmune");
        }

        if ((command.includes(item.command)) && item.command.includes("sword_add_mm")) {
            return check(session, command, item, "sword", false, 25, "swordAddMM", "+");
        }

        if ((command.includes(item.command)) && item.command.includes("boss_add_dmg")) {
            return check(session, command, item, session.game.boss.bonus.damage, true, 75, "addBossDmg");
        }

        if ((command.includes(item.command)) && item.command.includes("boss_add_cr_chance")) {
            return check(session, command, item, session.game.boss.bonus.criticalChance, true, 50, "addBossCritChance");
        }

        if ((command.includes(item.command)) && item.command.includes("boss_add_cr_dmg")) {
            return check(session, command, item, session.game.boss.bonus.criticalDamage, true, 50, "addBossCritDmg");
        }

        if ((command.includes(item.command)) && item.command.includes("sword_add_try")) {
            return check(session, command, item, "timerSwordCallback", false, 0, "swordAdditionalTry");
        }

        if ((command.includes(item.command)) && item.command.includes("potion_hp_1000")) {
            return check(session, command, item, session.game.inventory.potions[0], true, {name: "Зелье восстановления хп (1000 единиц)", amount: 1000, count: 1}, "hpPotion1000");
        }

        if ((command.includes(item.command)) && item.command.includes("potion_hp_3000")) {
            return check(session, command, item, session.game.inventory.potions[1], true, {name: "Зелье восстановления хп (1000 единиц)", amount: 3000, count: 1}, "hpPotion3000");
        }
    }
};