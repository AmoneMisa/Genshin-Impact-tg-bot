/**
 * Clan character-improvement tracks.
 *
 * Each track is a per-member upgrade purchased with the player's personal gold
 * and applied ONLY inside clan-boss combat (see clanBossAttack.js). The numeric
 * effect constants live in clanBossAttack.js — the `perLevel` field here is for
 * display text only, keep the two in sync if you retune balance.
 *
 * cost(level) = baseCost * (currentLevel + 1)
 */
export default [
    { key: "power", label: "Сила", desc: "урона по клановому боссу", perLevel: "+5%", baseCost: 500, maxLevel: 20 },
    { key: "critical", label: "Меткость", desc: "шанса крита по боссу", perLevel: "+2%", baseCost: 500, maxLevel: 20 },
    { key: "ferocity", label: "Ярость", desc: "крит. урона по боссу", perLevel: "+5%", baseCost: 500, maxLevel: 20 }
];
