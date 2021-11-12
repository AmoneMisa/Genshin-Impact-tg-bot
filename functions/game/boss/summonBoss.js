const bot = require('../../../bot');
const bossTemplate = require('../../../templates/bossTemplate');
const getRandom = require('../../getRandom');
const getSession = require('../../getSession');
const getBossStats = require('../../game/boss/getBossStats');
const bossUpdateLoot = require('../../game/boss/bossUpdateLoot');

module.exports = async function (chatId, bosses, sessions) {
    if (!bosses[chatId]) {
        bosses[chatId] = {
            stats: bossTemplate.stats
        };
    }

    let boss = bosses[chatId];

    if (!boss.hasOwnProperty("stats")) {
        boss.stats = bossTemplate.stats;
    }

    getBossStats(boss);
    bossUpdateLoot(boss);

    if (!boss.hp || boss.hp < boss.damagedHp) {
        boss.damagedHp = 0;
        let countChatMembers = await bot.getChatMembersCount(chatId);
        let maxHp = countChatMembers * 1200;
        boss.hp = getRandom(maxHp * 0.33, maxHp);

        boss.skill = bossTemplate.skills[getRandom(0, bossTemplate.skills.length - 1)];

        if (boss.skill.effect.includes("rage")) {
            boss.hp = boss.hp / 2;
        }

        if (boss.skill.effect.includes("resistance")) {
            boss.stats.attack *= 0.4;
            boss.stats.defence *= 2;
        }

        if (boss.skill.effect.includes("life")) {
            boss.stats.attack *= 2;
            boss.stats.defence *= 2;
        }

        for (let session of Object.values(sessions)) {
            if (!session.game || !session.game.boss) {
                await getSession(chatId, session.userChatData.user.id);
            }
            session.game.boss.isDead = false;
            session.game.boss.damage = 0;
            session.game.boss.damagedHp = 0;
        }

        boss.stats.currentSummons = boss.stats.currentSummons++ || 1;

        return `Группа призвала босса ${bossTemplate.nameCall}! Уровень: ${boss.stats.lvl}\nЕго хп: ${boss.hp}\nЕго скилл: ${boss.skill.name} - ${boss.skill.description}\nНанести урон: /deal_damage`;
    }

    return `Группа уже призвала босса ${bossTemplate.nameCall}. Посмотреть хп босса: /boss_hp.\nЕго скилл: ${boss.skill.name} - ${boss.skill.description}\nНанести урон: /deal_damage`;
};