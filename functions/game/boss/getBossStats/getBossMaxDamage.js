export default function (boss, bossTemplate) {
    let maxDamage = bossTemplate.stats.maxDamage;
    let lvl = boss.stats.lvl;

    maxDamage += Math.ceil((lvl - 1) * 1.2);
    return maxDamage;
};