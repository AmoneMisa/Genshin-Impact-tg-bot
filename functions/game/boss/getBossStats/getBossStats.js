const getBossAttack = require("./getBossAttack");
const getBossDefence = require("./getBossDefence");
const getBossMinDamage = require("./getBossMinDamage");
const getBossMaxDamage = require("./getBossMaxDamage");
const getBossCriticalChance = require("./getBossCriticalChance");
const getBossCriticalDamage = require("./getBossCriticalDamage");

module.exports = function (boss, bossTemplate) {
    if (boss.skill.effect.includes("resistance")) {
        return {
            attack: getBossAttack(boss, bossTemplate, 1.4),
            defence: getBossDefence(boss, bossTemplate, 2),
            minDamage: getBossMinDamage(boss, bossTemplate),
            maxDamage: getBossMaxDamage(boss, bossTemplate),
            criticalChance: getBossCriticalChance(boss, bossTemplate),
            criticalDamage: getBossCriticalDamage(boss, bossTemplate)
        }
    }

    if (boss.skill.effect.includes("life")) {
        return {
            attack: getBossAttack(boss, bossTemplate, 2),
            defence: getBossDefence(boss, bossTemplate, 2),
            minDamage: getBossMinDamage(boss, bossTemplate),
            maxDamage: getBossMaxDamage(boss, bossTemplate),
            criticalChance: getBossCriticalChance(boss, bossTemplate),
            criticalDamage: getBossCriticalDamage(boss, bossTemplate)
        }
    }

    return {
        attack: getBossAttack(boss, bossTemplate),
        defence: getBossDefence(boss, bossTemplate),
        minDamage: getBossMinDamage(boss, bossTemplate),
        maxDamage: getBossMaxDamage(boss, bossTemplate),
        criticalChance: getBossCriticalChance(boss, bossTemplate),
        criticalDamage: getBossCriticalDamage(boss, bossTemplate)
    }
};