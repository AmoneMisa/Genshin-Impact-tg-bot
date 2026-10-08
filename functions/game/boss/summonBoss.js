import getBossStats from './getBossStats/getBossStats.js';
import getBossSkill from './getters/getBossSkill.js';
import getBossHp from './getBossStats/getBossHp.js';
import getRandomBoss from './getters/getRandomBoss.js';
import getBossByName from './getters/getBossByName.js';
import addBossIntoChatSession from './addBossIntoChatSession.js';
import updateBossLevel from './updateBossLevel.js';
import { addBossEvent } from './bossPhases.js';
import { spawnMinions } from './bossUnits.js';
import lodash from 'lodash';

export default async function(chatId, template = null) {
    let bossTemplate = template || getRandomBoss();
    let boss = await getBossByName(chatId, bossTemplate.name);

    if (!boss) {
        boss = await addBossIntoChatSession(chatId, lodash.omit(lodash.cloneDeep(bossTemplate), ['minions']));
    }

    updateBossLevel(boss);

    const now = Date.now();
    boss.skill = getBossSkill(boss.name);
    boss.hp = await getBossHp(boss.skill, chatId, bossTemplate);
    boss.currentHp = boss.hp;
    boss.listOfDamage = [];
    boss.aliveTime = now + 15 * 60 * 1000;
    // A fresh fight: no casts yet; the first one comes a few seconds in.
    boss.lastAttack = null;
    boss.attackLog = [];
    boss.nextAttackAt = now + 5 * 1000;
    // Encounter state: phases, enrage, debuffs, the charging ultimate and the minions.
    boss.phaseIndex = 0;
    boss.enrage = 0;
    boss.stunUntil = 0;
    boss.stunImmuneUntil = 0;
    boss.debuffs = [];
    boss.charging = null;
    boss.castCount = 0;
    boss.eventLog = [];
    boss.minions = [];
    boss.minionClock = {};

    let currentSummons = boss.stats.currentSummons || bossTemplate.stats.currentSummons;
    let needSummons = boss.stats.needSummons || bossTemplate.stats.needSummons;
    let lvl = boss.stats.lvl || bossTemplate.stats.lvl;

    boss.stats = {...getBossStats(boss, bossTemplate), currentSummons, needSummons, lvl};
    boss.stats.currentSummons++;

    spawnMinions(boss, bossTemplate.initial, now, bossTemplate);
    addBossEvent(boss, {icon: "👹", text: `${bossTemplate.title ? `${bossTemplate.title}. ` : ""}${bossTemplate.pair ? "Близнецы вышли на бой!" : "Босс вышел на бой!"}`}, now);

    boss.markModified("skill");
    boss.markModified("stats");
    boss.markModified("listOfDamage");
    boss.markModified("attackLog");
    boss.markModified("minions");
    boss.markModified("minionClock");
    boss.markModified("eventLog");
    boss.markModified("debuffs");
    await boss.save();

    return boss;
};
