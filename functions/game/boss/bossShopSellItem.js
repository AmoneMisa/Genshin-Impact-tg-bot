const shopTemplate = require('../../../templates/shopTemplate');
const getOffsetToDay = require('../../getters/getOffsetToDay');
const getOffset = require('../../getters/getOffset');
const getUserName = require('../../getters/getUserName');

let commandsArray = ["sword_immune", "sword_add_mm", "boss_add_dmg", "boss_add_cr_chance", "boss_add_cr_dmg",
    "sword_add_try", "potion_hp_1000", "potion_hp_3000", "chest_add_try"];

function check(session, command, item, shopTimer, isDaily) {
    try {

        if (!isDaily) {
            if (session.game.shopTimers[shopTimer] >= getOffsetToDay()) {
                return `${getUserName(session, "nickname")}, уже была совершена покупка на этой неделе. Попытка обновится в понедельник в 00.00`;
            }
        } else {
            if (session.game.shopTimers[shopTimer] >= getOffset()) {
                return `${getUserName(session, "nickname")}, уже была совершена покупка на этой неделе. Попытка обновится в 00.00`;
            }
        }

        if (session.game.inventory.gold >= item.cost) {
            if (command.includes("sword_immune")) {
                session.swordImmune = true;
                session.game.shopTimers[shopTimer] = getOffsetToDay();
            } else if (command.includes("sword_add_mm")) {
                session.sword += 25;
                session.game.shopTimers[shopTimer] = getOffsetToDay();
            } else if (command.includes("boss_add_dmg")) {
                session.game.effects.push({name: "add_damage", amount: 75, count: 10});
                session.game.shopTimers[shopTimer] = getOffsetToDay();
            } else if (command.includes("boss_add_cr_chance")) {
                session.game.effects.push({name: "add_crit_chance", amount: 50, count: 10});
                session.game.shopTimers[shopTimer] = getOffsetToDay();
            } else if (command.includes("boss_add_cr_dmg")) {
                session.game.effects.push({name: "add_crit_damage", amount: 150, count: 10});
                session.game.shopTimers[shopTimer] = getOffsetToDay();
            } else if (command.includes("sword_add_try")) {
                session.timerSwordCallback = 0;
                session.game.shopTimers[shopTimer] = getOffsetToDay();
            } else if (command.includes("potion_hp_1000")) {
                session.game.inventory.potions[0].count++;
                session.game.shopTimers[shopTimer] = getOffset();
            } else if (command.includes("potion_hp_3000")) {
                session.game.inventory.potions[1].count++;
                session.game.shopTimers[shopTimer] = getOffset();
            } else if (command.includes("chest_add_try")) {
                session.chestCounter = 0;
                session.chosenChests = [];
                session.chestButtons = [];
                session.timerOpenChestCallback = 0;
                session.game.shopTimers[shopTimer] = getOffsetToDay();
            }

            session.game.inventory.gold -= item.cost;
            return `${getUserName(session, "nickname")}, ${item.message}`;
        }
        return `${getUserName(session, "nickname")}, сначала нужно обзавестись золотишком, чтобы что-то купить.`
    } catch (e) {
        console.error(e);
    }
}

module.exports = function (session, command) {
    if (!session.game) {
        return `${getUserName(session, "nickname")}, сначала нужно обзавестись золотишком, чтобы что-то купить.`
    }

    if (!commandsArray.includes(command)) {
        return `${getUserName(session, "nickname")}, такой команды не существует. Попробуй ещё раз`;
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
            return check(session, command, item, "hpPotion1000", true);
        }

        if ((command.includes(item.command)) && item.command.includes("potion_hp_3000")) {
            return check(session, command, item, "hpPotion3000", true);
        }

        if ((command.includes(item.command)) && item.command.includes("chest_add_try")) {
            return check(session, command, item, "chestAddTry");
        }
    }
};