import bossesTemplate from '../../../../template/bossTemplate.js';

// Weighted by each boss's `weight` (default 1): harder bosses and pairs turn up less often.
// Epic raid bosses are never picked here - a chat has to challenge them on purpose.
export default function (random = Math.random) {
    const pool = bossesTemplate.filter(boss => !boss.epic);
    const total = pool.reduce((sum, boss) => sum + (Number(boss.weight) || 1), 0);
    let roll = random() * total;
    for (const boss of pool) {
        roll -= Number(boss.weight) || 1;
        if (roll < 0) return boss;
    }
    return pool[pool.length - 1];
}
