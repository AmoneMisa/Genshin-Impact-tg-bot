module.exports = function (boss, bossTemplate, modifier = 1) {
    let defence = bossTemplate.stats.defence;
    let lvl = boss.stats.lvl;

    defence += (lvl - 1) * 2 * modifier;
    return defence;
};