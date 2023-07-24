module.exports = function (boss, bossTemplate, modifier = 1) {
    let attack = bossTemplate.stats.attack;
    let lvl = boss.stats.lvl;
    attack += (lvl - 1) * 2 * modifier;

    return attack;
};