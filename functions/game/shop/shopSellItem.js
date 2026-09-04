import shopTemplate from "../../../template/shopTemplate.js";
import potionsInInventoryTemplate from "../../../template/potionsInInventoryTemplate.js";
import getOffsetToDay from "../../getters/getOffsetToDay.js";
import getOffset from "../../getters/getOffset.js";
import getUserName from "../../getters/getUserName.js";

function getPotionCharacteristics(command) {
    const match = command.match(/^(potion|elixir)(Hp|Mp)(\d+)$/);
    if (!match) return null;

    const [, bottleType, itemType, power] = match;
    return {
        bottleType,
        type: itemType.toLowerCase(),
        power: parseInt(power),
    };
}

function updateShopTimer(session, command, isDaily = false) {
    session.game.shopTimers[command] = isDaily ? getOffsetToDay() : getOffset();
}

function addPotion(session, command) {
    const potion = getPotionCharacteristics(command);
    if (!potion) return;

    let existing = session.game.inventory.potions.items.find(
        (p) =>
            p.bottleType === potion.bottleType &&
            p.type === potion.type &&
            p.power === potion.power
    );

    if (existing) {
        existing.count++;
    } else {
        const template = potionsInInventoryTemplate.find(
            (p) =>
                p.bottleType === potion.bottleType &&
                p.type === potion.type &&
                p.power === potion.power
        );
        if (template) {
            session.game.inventory.potions.items.push({ ...template, count: 1 });
        }
    }
}

async function check(session, command, item, isDaily) {
    // Проверка таймеров
    if (!isDaily && session.game.shopTimers[command] >= getOffsetToDay()) {
        return `${await getUserName(session, "nickname")}, покупка уже была совершена на этой неделе. Обновится в понедельник в 00.00`;
    }
    if (session.game.shopTimers[command] >= getOffset()) {
        return `${await getUserName(session, "nickname")}, покупка уже была совершена сегодня. Обновится в 00.00`;
    }

    // Проверка золота
    if (session.game.inventory.gold < item.cost) {
        return `${await getUserName(session, "nickname")}, сначала нужно обзавестись золотишком, чтобы что-то купить.`;
    }

    // Логика покупок
    if (command.includes("swordImmune")) {
        session.swordImmune = true;
        updateShopTimer(session, command, true);
    } else if (command.includes("swordAddMm")) {
        session.sword += 25;
        updateShopTimer(session, command, true);
    } else if (command.includes("bossAddDmg")) {
        session.game.effects.push({name: "addDamageToBoss", amount: 75, count: 5});
        updateShopTimer(session, command, true);
    } else if (command.includes("bossAddCrChance")) {
        session.game.effects.push({name: "addCritChanceToBoss", amount: 50, count: 5});
        updateShopTimer(session, command, true);
    } else if (command.includes("bossAddCrDmg")) {
        session.game.effects.push({name: "addCritDamageToBoss", amount: 150, count: 5});
        updateShopTimer(session, command, true);
    } else if (command.includes("swordAddTry")) {
        session.timerSwordCallback = 0;
        updateShopTimer(session, command, true);
    } else if (command.includes("potion") || command.includes("elixir")) {
        addPotion(session, command);
        updateShopTimer(session, command, true);
    } else if (command.includes("chestAddTry")) {
        session.chestCounter = 0;
        session.chosenChests = [];
        session.chestButtons = [];
        session.chestTries += 1;
        updateShopTimer(session, command, true);
    } else if (command.includes("palace") && command !== "palaceChangeName") {
        const buildType = shopTemplate.find((i) => i.command === command)?.type;
        if (session.game.builds.palace.availableTypes.includes(buildType)) {
            return `${await getUserName(session, "nickname")}, у тебя уже есть этот тип здания.`;
        }
        session.game.builds.palace.availableTypes.push(buildType);
    } else if (command.includes("palaceChangeName")) {
        if (session?.game?.builds?.palace?.canChangeName) {
            return `${await getUserName(session, "nickname")}, у тебя уже есть карточка на смену названия этого здания.`;
        }
        session.game.builds.palace.canChangeName = true;
    }

    // Списание золота
    session.game.inventory.gold -= item.cost;
    return `${await getUserName(session, "nickname")}, ${item.message}`;
}

export default async function buyItem(session, command, item) {
    if (!session.game) {
        return `${await getUserName(session, "nickname")}, сначала нужно обзавестись золотишком, чтобы что-то купить.`;
    }

    const isPotion = command.includes("potion") || command.includes("elixir");
    return check(session, command, item, isPotion);
}
