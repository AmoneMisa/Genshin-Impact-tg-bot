module.exports = function (boss, bossTemplate, modifier = 1) {
    let lvl = boss.stats.lvl;
    return Math.ceil(bossTemplate.stats.defence * Math.pow(1.55, lvl - 1) * modifier);
};