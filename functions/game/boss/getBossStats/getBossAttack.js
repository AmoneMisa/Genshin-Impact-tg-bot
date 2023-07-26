module.exports = function (boss, bossTemplate, modifier = 1) {
    let lvl = boss.stats.lvl;
    return Math.ceil(bossTemplate.stats.attack * Math.pow(2, lvl - 1) * modifier);
};