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
import {referenceHit, heroStats} from '../hunt/huntMobs.js';
import {HUNT} from '../hunt/huntConfig.js';
import {CASTS_PER_PARTY_MEMBER, HP_CAST_CAP} from './worldBosses.js';
import {partyNeeded} from '../../../template/epicPasses.js';

/** Hit points of a world boss: the casts a bare warrior of its level needs, from the real hit points of the data. */
function worldHp(world, level, partyMin) {
    const real = Math.max(150, Math.round(Math.sqrt(world.hp / 1000) * 12));
    // a boss that asks for a party is sized by it: one hero cannot land that many casts in the time of the fight
    const casts = Math.min(HP_CAST_CAP, Math.max(real, partyMin * CASTS_PER_PARTY_MEMBER));
    return Math.max(1, Math.round(casts * referenceHit(level, 'warrior')));
}

export default async function(chatId, template = null, {memberCount = null, heroLevel = null} = {}) {
    let bossTemplate = template || getRandomBoss();
    let boss = await getBossByName(chatId, bossTemplate.name);

    if (!boss) {
        boss = await addBossIntoChatSession(chatId, lodash.omit(lodash.cloneDeep(bossTemplate), ['minions']));
    }

    // a world boss keeps the level of its data: summoning it does not level it up
    const world = bossTemplate.world || null;
    if (!world) updateBossLevel(boss);
    else boss.stats = {...(boss.stats || bossTemplate.stats), lvl: 1};

    const now = Date.now();
    boss.skill = getBossSkill(boss.name);
    // an adaptive epic has the level of the hero who calls it (never below its own)
    const level = world ? (world.adaptive ? Math.max(world.level, Number(heroLevel) || 0) : world.level) : 0;
    boss.hp = world ? worldHp(world, level, partyNeeded(bossTemplate.name)) : await getBossHp(boss.skill, chatId, bossTemplate, memberCount);
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

    if (world) {
        // a monster of the real level: its defence follows the hunting formulas, so the damage of a hero is what it is on the fields
        boss.world = {npcId: world.npcId, level, baseLevel: world.level, location: world.location, adaptive: Boolean(world.adaptive), instance: Boolean(world.instance)};
        boss.hunt = {
            defence: heroStats(level).attack * HUNT.defencePerAttack / HUNT.damageScale * world.defenceRel,
            pDef: heroStats(level).attack * HUNT.defencePerAttack / HUNT.damageScale * world.defenceRel,
            mDef: heroStats(level).attack * HUNT.defencePerAttack / HUNT.damageScale * (world.magicDefenceRel ?? world.defenceRel),
            element: bossTemplate.element || null, magic: world.magic,
        };
        boss.markModified('world');
        boss.markModified('hunt');
    }

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
