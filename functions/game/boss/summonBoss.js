const bot = require('../../../bot');
const bossTemplate = require('../../../templates/bossTemplate');
const getRandom = require('../../getters/getRandom');
const getSession = require('../../getters/getSession');
const getBossStats = require('../../game/boss/getBossStats');
const getBossLevelTemplate = require('../../game/boss/getBossLevelTemplate');
const initBossDealDamage = require('../../game/boss/initBossDealDamage');
const getBossLevel = require('../../game/boss/getBossLevel');
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

    let {attack, defence} = getBossStats(boss);

    bossUpdateLoot(boss);
    let lvl = getBossLevel(boss);
    let nextLvl = getBossLevelTemplate(lvl + 1);

    if (!boss.hp || boss.currentHp <= 0) {
        let countChatMembers = await bot.getChatMembersCount(chatId);
        let maxHp = countChatMembers * 1200;
        boss.hp = getRandom(maxHp * 0.33, maxHp);
        boss.currentHp = boss.hp;

        boss.skill = bossTemplate.skills[getRandom(0, bossTemplate.skills.length - 1)];

        if (boss.skill.effect.includes("rage")) {
            boss.hp = boss.hp / 2;
        }

        if (boss.skill.effect.includes("resistance")) {
            attack *= 0.4;
            defence *= 2;
        }

        if (boss.skill.effect.includes("life")) {
            attack *= 2;
            defence *= 2;
        }

        boss.stats.defence = defence;
        boss.stats.attack = attack;

        for (let session of Object.values(sessions)) {
            if (!session.game || !session.game.boss) {
                await getSession(chatId, session.userChatData.user.id);
            }

            session.game.boss.isDead = false;
            session.timerDealDamageCallback = 0;
        }

        boss.stats.currentSummons = boss.stats.currentSummons + 1 || 1;
        initBossDealDamage(chatId);

        return `Группа призвала босса ${bossTemplate.nameCall}! Уровень: ${lvl}\nЕго хп: ${boss.hp}\nЕго скилл: ${boss.skill.name} - ${boss.skill.description}\nКоличество призывов: ${boss.stats.currentSummons}\nКоличество призывов до следующего уровня: ${nextLvl.needSummons - boss.stats.currentSummons}\nНанести урон: /deal_damage`;
    }

    return `Группа уже призвала босса ${bossTemplate.nameCall}. Посмотреть хп босса: /boss_hp.\nЕго скилл: ${boss.skill.name} - ${boss.skill.description}\nНанести урон: /deal_damage`;
};