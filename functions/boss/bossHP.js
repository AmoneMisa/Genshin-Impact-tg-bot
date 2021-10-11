const bot = require('../../bot');
const bossTemplate = require('../../templates/bossTemplate');
const getRandom = require('../getRandom');

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

        let skill = getRandom(0, bossTemplate.skills.length - 1);
        boss.skill = skill;

        for (let session of Object.values(sessions)) {
            if (session.game && session.game.boss && session.game.boss.damage) {
                session.game.boss.damage = 0;
            }
        }

        return `Группа призвала босса ${bossTemplate.nameCall}! Его хп: ${boss.hp}\nЕго скилл: ${skill.name} - ${skill.description}\nНанести урон: /damage_the_boss`;
    }

    let skill = boss.skill;

    return `Группа уже призвала босса ${bossTemplate.nameCall}. Посмотреть хп босса: /boss_show_hp.\nЕго скилл: ${skill.name} - ${skill.description}\nНанести урон: /damage_the_boss`;
};