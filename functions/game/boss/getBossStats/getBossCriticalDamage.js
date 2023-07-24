module.exports = function (boss, bossTemplate) {
    let criticalDamage = bossTemplate.stats.criticalDamage;
    let lvl = boss.stats.lvl;

    criticalDamage += (lvl - 1) * 1.01;
    return criticalDamage;
};