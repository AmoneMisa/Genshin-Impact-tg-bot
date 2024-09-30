export default function (boss, bossTemplate) {
    let minDamage = bossTemplate.stats.minDamage;
    let lvl = boss.stats.lvl;

    minDamage += Math.ceil((lvl - 1) * 1.15);
    return minDamage;
};