/**
 * Builds a fresh clan boss scaled to the clan's level.
 *
 * The clan boss is global (lives on clan.boss, a Mixed sub-document) and is
 * ground down by members from any chat. Loot goes to the shared warehouse, so
 * the boss object only needs to track HP and per-user damage for reward split.
 */
const CLAN_BOSSES = [
    { name: "Дворецкий Бездны", defence: 30 },
    { name: "Крио Предвестник", defence: 35 },
    { name: "Гео Гипостазис", defence: 40 },
    { name: "Электро Регисвин", defence: 32 }
];

const BASE_HP = 5000;

export default function (clan) {
    const level = clan.level || 1;
    const pick = CLAN_BOSSES[Math.floor(Math.random() * CLAN_BOSSES.length)];
    const maxHp = BASE_HP * level;

    return {
        name: pick.name,
        level,
        maxHp,
        currentHp: maxHp,
        defence: pick.defence + level * 2,
        spawnedAt: Date.now(),
        damageByUser: {}, // { userId: totalDamage }
        cooldowns: {}      // { userId: nextAllowedAttackTimestamp }
    };
}
