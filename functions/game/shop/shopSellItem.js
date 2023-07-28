const shopTemplate = require('../../../templates/shopTemplate');
const potionsInInventoryTemplate = require('../../../templates/potionsInInventoryTemplate');
const getOffsetToDay = require('../../getters/getOffsetToDay');
const getOffset = require('../../getters/getOffset');
const getUserName = require('../../getters/getUserName');

function getPotionCharacteristics(command) {
    const match = command.match(/^(potion|elixir)(Hp|Mp)(\d+)$/);

    if (match) {
        const [, bottleType, itemType, power] = match;
        return {
            bottleType,
            type: itemType.toLowerCase(),
            power: parseInt(power)
        };
    }
}

function check(session, command, item, isDaily) {
    if (!isDaily) {
        if (session.game.shopTimers[command] >= getOffsetToDay()) {
            return `${getUserName(session, "nickname")}, уже была совершена покупка на этой неделе. Попытка обновится в понедельник в 00.00`;
        }
    }

    if (session.game.shopTimers[command] >= getOffset()) {
        return `${getUserName(session, "nickname")}, уже покупка была совершена сегодня. Попытка обновится в 00.00`;
    }

    if (session.game.inventory.gold >= item.cost) {
        if (command.includes("swordImmune")) {
            session.swordImmune = true;
            session.game.shopTimers[command] = getOffsetToDay();
        } else if (command.includes("swordAddMm")) {
            session.sword += 25;
            session.game.shopTimers[command] = getOffsetToDay();
        } else if (command.includes("bossAddDmg")) {
            session.game.effects.push({name: "addDamage", amount: 75, count: 10});
            session.game.shopTimers[command] = getOffsetToDay();
        } else if (command.includes("bossAddCrChance")) {
            session.game.effects.push({name: "addCritChance", amount: 50, count: 10});
            session.game.shopTimers[command] = getOffsetToDay();
        } else if (command.includes("bossAddCrDmg")) {
            session.game.effects.push({name: "addCritDamage", amount: 150, count: 10});
            session.game.shopTimers[command] = getOffsetToDay();
        } else if (command.includes("swordAddTry")) {
            session.timerSwordCallback = 0;
            session.game.shopTimers[command] = getOffsetToDay();
        } else if (command.includes("potion") || command.includes("elixir")) {
            let potion = getPotionCharacteristics(command);
            let foundedPotion = session.game.inventory.potions.find(_potion => _potion.bottleType === potion.bottleType && _potion.type === potion.type && _potion.power === potion.power);

            if (foundedPotion) {
                foundedPotion.count++;
            } else {
                let potionTemplate = potionsInInventoryTemplate.find(_potion => _potion.bottleType === potion.bottleType && _potion.type === potion.type && _potion.power === potion.power);
                session.game.inventory.potions.push(potionTemplate);
                let foundedPotion = session.game.inventory.potions.find(_potion => _potion.bottleType === potion.bottleType && _potion.type === potion.type && _potion.power === potion.power);
                foundedPotion.count++;
            }

            session.game.shopTimers[command] = getOffset();
        } else if (command.includes("chestAddTry")) {
            session.chestCounter = 0;
            session.chosenChests = [];
            session.chestButtons = [];
            session.timerOpenChestCallback = 0;
            session.game.shopTimers[command] = getOffsetToDay();
        } else if (command.includes("palace") && command !== "palaceChangeName") {
            let buildType = shopTemplate.filter(item => item.command === command).map(item => item.type)[0];
            if (session.game.builds.palace.availableTypes.includes(buildType)) {
                return `${getUserName(session, "nickname")}, у тебя уже есть этот тип здания.`;
            }

            session.game.builds.palace.availableTypes.push(buildType);
        } else if (command.includes("palaceChangeName")) {
            if (session?.game?.builds?.palace?.canChangeName) {
                return `${getUserName(session, "nickname")}, у тебя уже есть карточка на смену названия этого здания.`;
            }

            session.game.builds.palace.canChangeName = true;
        }

        session.game.inventory.gold -= item.cost;
        return `${getUserName(session, "nickname")}, ${item.message}`;
    }
    return `${getUserName(session, "nickname")}, сначала нужно обзавестись золотишком, чтобы что-то купить.`
}

module.exports = function (session, command, item) {
    if (!session.game) {
        return `${getUserName(session, "nickname")}, сначала нужно обзавестись золотишком, чтобы что-то купить.`
    }

    if (command.includes("potion") || command.includes("elixir")) {
        return check(session, command, item, true);
    }

    return check(session, command, item);
};