const shopTemplate = require('../../templates/shopTemplate');
const getOffset = require('../getOffsetToDay');

let commandsArray = ["sword_immune", "sword_add_mm", "boss_add_dmg", "boss_add_cr_chance", "boss_add_cr_dmg", "sword_add_try", "potion_hp_1000", "potion_hp_3000"];

function check(session, command, item, shopTimer) {
    try {
        if (session.game.shopTimers[shopTimer] >= getOffset()) {
            return `${session.userChatData.user.username}, уже была совершена покупка на этой неделе. Попытка обновится в понедельник в 00.00`
        }

        if (session.game.inventory.gold >= item.cost) {
            if (command.includes("sword_immune")) {
                session.swordImmune = true;
            } else if (command.includes("sword_add_mm")) {
                session.sword += 25;
            } else if (command.includes("boss_add_dmg")) {
                session.game.boss.bonus.damage = true;
            } else if (command.includes("boss_add_cr_chance")) {
                session.game.boss.bonus.criticalChance = true;
            } else if (command.includes("boss_add_cr_dmg")) {
                session.game.boss.bonus.criticalDamage = true;
            } else if (command.includes("sword_add_try")) {
                session.timerSwordCallback = 0;
            } else if (command.includes("potion_hp_1000")) {
                session.game.inventory.potions[0].count++;
            } else if (command.includes("potion_hp_3000")) {
                session.game.inventory.potions[1].count++;
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

module.exports = function (session, command) {
    if (!session.game) {
        return `${session.userChatData.user.username}, сначала нужно обзавестись золотишком, чтобы что-то купить.`
    }

    if (!commandsArray.includes(command)) {
        return `${session.userChatData.user.username}, такой команды не существует. Попробуй ещё раз`;
    }

    for (let item of shopTemplate) {
        if ((command.includes(item.command)) && item.command.includes("sword_immune")) {
            return check(session, command, item, "swordImmune");
        }

        if ((command.includes(item.command)) && item.command.includes("sword_add_mm")) {
            return check(session, command, item, "swordAddMM");
        }

        if ((command.includes(item.command)) && item.command.includes("boss_add_dmg")) {
            return check(session, command, item, "addBossDmg");
        }

        if ((command.includes(item.command)) && item.command.includes("boss_add_cr_chance")) {
            return check(session, command, item, "addBossCritChance");
        }

        if ((command.includes(item.command)) && item.command.includes("boss_add_cr_dmg")) {
            return check(session, command, item, "addBossCritDmg");
        }

        if ((command.includes(item.command)) && item.command.includes("sword_add_try")) {
            return check(session, command, item, "swordAdditionalTry");
        }

        if ((command.includes(item.command)) && item.command.includes("potion_hp_1000")) {
            return check(session, command, item, "hpPotion1000");
        }

        if ((command.includes(item.command)) && item.command.includes("potion_hp_3000")) {
            return check(session, command, item, "hpPotion3000");
        }
    }
};