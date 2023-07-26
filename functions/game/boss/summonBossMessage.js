const getEmoji = require("../../getters/getEmoji");
module.exports = function (chatId, boss, isAlreadyCalled) {
    if (isAlreadyCalled) {
        return `Группа уже призвала босса ${boss.nameCall} - ${boss.description}. Посмотреть ${getEmoji("hp")} хп босса: /boss - статистика.\nЕго скилл: ${boss.skill.name} - ${boss.skill.description}\nНанести урон: /boss`;
    }

    return `Группа призвала босса ${boss.nameCall} - ${boss.description}\n${getEmoji("lvl")} Уровень: ${boss.stats.lvl}\n${getEmoji("hp")} Его хп: ${boss.hp}\nЕго скилл: ${boss.skill.name} - ${boss.skill.description}\n${getEmoji("currentSummons")} Количество призывов: ${boss.stats.currentSummons}\n${getEmoji("needSummons")} Количество призывов до следующего уровня: ${boss.stats.needSummons - boss.stats.currentSummons}\nНанести урон: /boss`;
};