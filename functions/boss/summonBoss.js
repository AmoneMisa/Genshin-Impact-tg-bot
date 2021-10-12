const bot = require('../../bot');
const bossTemplate = require('../../templates/bossTemplate');
const getRandom = require('../getRandom');
const getSession = require('../getSession');

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

        // let skill = getRandom(0, bossTemplate.skills.length - 1);
        boss.skill = bossTemplate.skill;

        for (let session of Object.values(sessions)) {
            if (!session.game || !session.game.boss) {
               await getSession(sessions, chatId, session.userChatData.user.id);
            }

            if (session.game.boss.damage > 0) {
                session.game.boss.damage = 0;
            }

            if (session.game.boss.damagedHp > 0) {
                session.game.boss.damagedHp = 0;
            }
        }

        return `Группа призвала босса ${bossTemplate.nameCall}! Его хп: ${boss.hp}\nЕго скилл: ${boss.skill.name} - ${boss.skill.description}\nНанести урон: /damage_the_boss`;
    }

    return `Группа уже призвала босса ${bossTemplate.nameCall}. Посмотреть хп босса: /boss_show_hp.\nЕго скилл: ${boss.skill.name} - ${boss.skill.description}\nНанести урон: /damage_the_boss`;
};