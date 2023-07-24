const getBossLevel = require("./getters/getBossLevel");
const getBossLevelTemplate = require("./getters/getBossLevelTemplate");

module.exports = function (chatId, boss, isAlreadyCalled) {
    let lvl = getBossLevel(boss);
    let nextLvl = getBossLevelTemplate(boss.name, lvl + 1);

    if (isAlreadyCalled) {
        return `Группа уже призвала босса ${boss.nameCall} - ${boss.description}. Посмотреть хп босса: /boss.\nЕго скилл: ${boss.skill.name} - ${boss.skill.description}\nНанести урон: /boss`;
    }

    return `Группа призвала босса ${boss.nameCall} - ${boss.description}\nУровень: ${lvl}\nЕго хп: ${boss.hp}\nЕго скилл: ${boss.skill.name} - ${boss.skill.description}\nКоличество призывов: ${boss.stats.currentSummons}\nКоличество призывов до следующего уровня: ${nextLvl.needSummons - boss.stats.currentSummons}\nНанести урон: /boss`;
};