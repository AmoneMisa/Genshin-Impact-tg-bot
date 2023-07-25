module.exports = function (chatId, boss, isAlreadyCalled) {
    if (isAlreadyCalled) {
        return `Группа уже призвала босса ${boss.nameCall} - ${boss.description}. Посмотреть хп босса: /boss - статистика.\nЕго скилл: ${boss.skill.name} - ${boss.skill.description}\nНанести урон: /boss`;
    }

    return `Группа призвала босса ${boss.nameCall} - ${boss.description}\nУровень: ${boss.stats.lvl}\nЕго хп: ${boss.hp}\nЕго скилл: ${boss.skill.name} - ${boss.skill.description}\nКоличество призывов: ${boss.stats.currentSummons}\nКоличество призывов до следующего уровня: ${boss.stats.needSummons - boss.stats.currentSummons}\nНанести урон: /boss`;
};