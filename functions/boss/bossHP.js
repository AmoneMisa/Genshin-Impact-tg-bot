const bot = require('../../bot');
const bossesTemplate = require('../../templates/bossTemplate');
const getRandom = require('../../functions/getRandom');

module.exports = async function (chatId, bosses, sessions) {
    if (!bosses[chatId]) {
        bosses[chatId] = {};
    }

    let boss = bosses[chatId];

    if (!boss.hp || boss.hp < boss.damagedHp) {
        boss.damagedHp = 0;
        let countChatMembers = await bot.getChatMembersCount(chatId);
        let maxHp = countChatMembers * 1500;
        boss.hp = getRandom(maxHp * 0.33, maxHp);
        
        for (let session of Object.values(sessions)) {
            if (session.game && session.game.boss && session.game.boss.damage) {
                session.game.boss.damage = 0;
            }
        }

        return `Группа призвала босса ${bossesTemplate.nameCall}! Его хп: ${boss.hp}\nНанести урон: /damage_the_boss`;
    }

    return `Группа уже призвала босса ${bossesTemplate.nameCall}. Посмотреть хп босса: /boss_show_hp. Нанести урон: /damage_the_boss`;
};