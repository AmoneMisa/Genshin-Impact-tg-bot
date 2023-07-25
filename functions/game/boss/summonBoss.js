const getMembers = require('../../getters/getMembers');
const getBossStats = require('./getBossStats/getBossStats');
const getBossSkill = require('./getters/getBossSkill');
const getBossHp = require('./getBossStats/getBossHp');
const initBossDealDamage = require('./initBossDealDamage');
const getRandomBoss = require("./getters/getRandomBoss");
const getBossByName = require("./getters/getBossByName");
const addBossIntoChatSession = require("./addBossIntoChatSession");
const updateBossLevel = require("./updateBossLevel");
const lodash = require("lodash");

module.exports = async function (chatId) {
    let bossTemplate = getRandomBoss();
    let boss = getBossByName(chatId, bossTemplate.name);

    if (!boss) {
        boss = lodash.cloneDeep(bossTemplate);
        addBossIntoChatSession(chatId, boss);
    }
    updateBossLevel(boss);

    boss.skill = getBossSkill(boss.name);
    boss.hp = await getBossHp(boss.skill, chatId);
    boss.currentHp = boss.hp;
    let currentSummons = boss.stats.currentSummons || bossTemplate.stats.currentSummons;
    let needSummons = boss.stats.needSummons || bossTemplate.stats.needSummons;
    let lvl = boss.stats.lvl || bossTemplate.stats.lvl;

    boss.stats = {...getBossStats(boss, bossTemplate), currentSummons, needSummons, lvl};

    let members = await getMembers(chatId);
    for (let session of Object.values(members)) {
        session.timerDealDamageCallback = 0;
    }

    boss.stats.currentSummons++;
    initBossDealDamage(chatId);

    return boss;
};