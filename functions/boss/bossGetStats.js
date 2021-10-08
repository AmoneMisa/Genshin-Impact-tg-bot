module.exports = function (session) {
    return `Статистика @${session.userChatData.user.username}:\nУровень: ${session.game.stats.lvl}\nТекущее к-во опыта: ${session.game.stats.currentExp}\nТребуемое к-во опыта до следующего уровня: ${session.game.stats.needExp}`;
};