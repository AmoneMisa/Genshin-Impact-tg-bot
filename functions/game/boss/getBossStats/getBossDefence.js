export default function (boss, bossTemplate, modifier = 1, damageType = 'physical') {
    let lvl = boss.stats.lvl;
    const base = bossTemplate.stats[damageType === 'magic' ? 'mDef' : 'pDef'] ?? bossTemplate.stats.defence;
    return Math.ceil(base * Math.pow(1.55, lvl - 1) * modifier);
};
