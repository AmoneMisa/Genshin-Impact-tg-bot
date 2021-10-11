module.exports = function (session) {
    let message = `Статистика @${session.userChatData.user.username}:\n`;
    message += `Уровень: ${session.game.stats.lvl}\n`;
    message += `Текущее к-во опыта: ${session.game.stats.currentExp}\n`;
    message += `Требуемое к-во опыта до следующего уровня: ${session.game.stats.needExp}\n`;
    message += `Золото: ${session.game.inventory.gold}\n`;
    message += `Хп всего: ${session.game.boss.hp}.\n`;
    message += `Получено урона: ${session.game.boss.damagedHp}.\n`;
    message += `Осталось хп: ${session.game.boss.hp - session.game.boss.damagedHp}\n`;

    if (session.game.inventory.potions[0].count > 0) {
        message += `Зелий хп (1000): ${session.game.inventory.potions[0].count}\n`;
    }

    if (session.game.inventory.potions[1].count > 0) {
        message += `Зелий хп (3000): ${session.game.inventory.potions[1].count}\n`;
    }

    if (session.game.boss.bonus) {
        message +=  "Твой бонус: ";
        if (session.game.boss.bonus.criticalChance) {
            message += "увеличение шанса критического удара на 50% на 10 ударов.\n"
        }
        if (session.game.boss.bonus.criticalDamage) {
            message +="увеличение критического урона на 150% на 10 ударов.\n"

        }
        if (session.game.boss.bonus.damage) {
            message += "увеличение урона на 75% на 10 ударов.\n"
        }
    }

    if (session.swordImmune) {
        message += "Иммунитет к выпадению отрицательного числа при увеличении меча.\n"
    }

    return message;
};