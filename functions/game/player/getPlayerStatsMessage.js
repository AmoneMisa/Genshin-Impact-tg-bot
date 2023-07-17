const getAttack = require("./getAttack");
const getDefence = require("./getDefence");
const getDamageMultiplier = require("./getDamageMultiplier");

module.exports = function (session) {
    let message = "";
    if (!session.game.hasOwnProperty("gameClass")) {
        return message;
    }

    let classStats = session.game.gameClass.stats;
    message += `Класс: ${classStats.translateName}\n`;
    message += `Атака: ${getAttack(session)}\n`;
    message += `Защита: ${getDefence(session)}\n`;
    message += `Крит. шанс: ${classStats.criticalChance}\n`;
    message += `Крит. урон x${classStats.criticalDamage}\n`;
    message += `Уменьшение входящего урона: ${classStats.reduceIncomingDamage}%\n`;
    message += `Увеличение урона: ${classStats.additionalDamage}%\n`;
    message += `Множитель урона x${getDamageMultiplier(session)}\n`;
    message += `Скорость: ${classStats.speed}\n`;

    message += `Хп всего: ${classStats.maxHp}.\n`;
    message += `Получено урона: ${classStats.maxHp - classStats.hp}.\n`;
    message += `Осталось хп: ${classStats.hp}\n`;
    message += `Скорость восстановления хп: ${classStats.hpRestoreSpeed} ед. в сек.\n`;

    message += `Мп всего: ${classStats.maxMp}.\n`;
    message += `Потрачено маны: ${classStats.maxMp - classStats.mp}.\n`;
    message += `Осталось мп: ${classStats.mp}\n`;
    message += `Скорость восстановления мп: ${classStats.mpRestoreSpeed} ед. в сек. \n`;
    return message;
}