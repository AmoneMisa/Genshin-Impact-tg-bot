const shopTemplate = require('../../templates/shopTemplate');

module.exports = function (session, command) {
    if (!session.game.boss) {
        return `${session.userChatData.user.username}, сначала нужно обзавестись золотишком, чтобы что-то купить.`
    }

    for (let item of shopTemplate) {
        if (session.game.inventory.gold >= item.cost) {
            if (command.includes("sword_immune")) {
                session.sword_immune = true;
                session.game.inventory.gold -= item.cost;
                return `${session.userChatData.user.username}, ${item.message}`;
            }
            if (command.includes("sword_add_mm")) {
                session.sword += 25;
                session.game.inventory.gold -= item.cost;
                return `${session.userChatData.user.username}, ${item.message}`;
            }
            if (command.includes("boss_add_dmg")) {
                session.game.boss.bonus.damage = 75;
                session.game.inventory.gold -= item.cost;
                return `${session.userChatData.user.username}, ${item.message}`;
            }
            if (command.includes("boss_add_cr_chance")) {
                session.game.boss.bonus.criticalChance = 50;
                session.game.inventory.gold -= item.cost;

                return `${session.userChatData.user.username}, ${item.message}`;
            }
            if (command.includes("boss_add_cr_dmg")) {
                session.game.boss.bonus.criticalDamage = 1.5;
                session.game.inventory.gold -= item.cost;
                return `${session.userChatData.user.username}, ${item.message}`;
            }
            if (command.includes("sword_add_try")) {
                session.timerSwordCallback = 0;
                session.game.inventory.gold -= item.cost;
                return `${session.userChatData.user.username}, ${item.message}`;
            }
        }

    }
    return `${session.userChatData.user.username}, такой команды не существует. Попробуй ещё раз`
};