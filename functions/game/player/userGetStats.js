const getAttack = require("./getAttack");
const getDefence = require("./getDefence");
const getDamageMultiplier = require("./getDamageMultiplier");

module.exports = function (session) {
    let message = `Статистика @${session.userChatData.user.username}:\n`;
    message += `Уровень: ${session.game.stats.lvl}\n`;
    message += `Текущее к-во опыта: ${session.game.stats.currentExp}\n`;
    message += `Требуемое к-во опыта до следующего уровня: ${session.game.stats.needExp}\n`;
    message += `Золото: ${session.game.inventory.gold}\n`;

    if (session.game.inventory.hasOwnProperty("crystals")) {
        message += `Кристаллы: ${session.game.inventory.crystals}\n`;
    }

    if (session.game.hasOwnProperty("gameClass")) {
        message += `Класс: ${session.game.gameClass.stats.translateName}\n`;
        message += `Атака: ${getAttack(session)}\n`;
        message += `Защита: ${getDefence(session)}\n`;
        message += `Крит. шанс: ${session.game.gameClass.stats.criticalChance}\n`;
        message += `Крит. урон x${session.game.gameClass.stats.criticalDamage}\n`;
        message += `Множитель урона x${getDamageMultiplier(session)}\n`;
    }

    message += `Хп всего: ${session.game.boss.hp}.\n`;
    message += `Получено урона: ${session.game.boss.damagedHp}.\n`;
    message += `Осталось хп: ${session.game.boss.hp - session.game.boss.damagedHp}\n`;

    if (session.game.inventory.potions[0].count > 0) {
        message += `Зелий хп (1000): ${session.game.inventory.potions[0].count}\n`;
    }

    if (session.game.inventory.potions[1].count > 0) {
        message += `Зелий хп (3000): ${session.game.inventory.potions[1].count}\n`;
    }

    if (session.swordImmune) {
        message += "Иммунитет к выпадению отрицательного числа при увеличении меча.\n"
    }

    return message;
};