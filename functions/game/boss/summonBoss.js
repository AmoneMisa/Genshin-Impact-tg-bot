import getBossStats from './getBossStats/getBossStats.js';
import getBossSkill from './getters/getBossSkill.js';
import getBossHp from './getBossStats/getBossHp.js';
import getRandomBoss from './getters/getRandomBoss.js';
import getBossByName from './getters/getBossByName.js';
import addBossIntoChatSession from './addBossIntoChatSession.js';
import updateBossLevel from './updateBossLevel.js';
import lodash from 'lodash';

export default async function (chatId) {
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
    boss.listOfDamage = [];
    boss.aliveTime = new Date().getTime() + 15 * 60 * 1000;

    let currentSummons = boss.stats.currentSummons || bossTemplate.stats.currentSummons;
    let needSummons = boss.stats.needSummons || bossTemplate.stats.needSummons;
    let lvl = boss.stats.lvl || bossTemplate.stats.lvl;

    boss.stats = {...getBossStats(boss, bossTemplate), currentSummons, needSummons, lvl};
    boss.stats.currentSummons++;

    return boss;
};