module.exports = function (boss) {
    let defence = boss.stats.defence;
    let lvl = boss.stats.lvl;

    defence += (lvl - 1) * 2;
    return defence;
};