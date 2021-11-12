module.exports = function (boss) {
    let attack = boss.stats.attack;
    let lvl = boss.stats.lvl;

    attack += (lvl - 1) * 2;
    return attack;
};