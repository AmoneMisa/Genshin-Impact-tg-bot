/**
 * Computes a clan's reputation score (a derived prestige rating, not a
 * spendable currency) from data that already lives on the clan document, so
 * it's cheap to recompute on every mutation that could move the number.
 *
 * Deliberately clan-local: an earlier average-player-level / average-gear-score
 * factor was dropped because that data lives on each member's per-chat Chat
 * document, not on the clan, and would need an expensive cross-collection
 * lookup per member on every recompute.
 *
 * Factors:
 *   - mainHall building level (clan investment)
 *   - member count (clan size)
 *   - clan level (accumulated XP)
 *   - average character-improvement level across members (member.upgrades)
 */
const pointsMap = {
    mainBuildLvl: 40,
    countPeople: 3,
    clanLvl: 45,
    middleLvlOfBonuses: 12
};

export default function (clan) {
    const members = clan.members || [];
    const memberCount = members.length;
    const mainHallLevel = clan.buildings?.mainHall?.level || 1;
    const clanLevel = clan.level || 1;

    let totalUpgradeLevels = 0;
    for (const member of members) {
        const upgrades = member.upgrades || {};
        totalUpgradeLevels += Object.values(upgrades).reduce((sum, level) => sum + (level || 0), 0);
    }
    const avgUpgradeLevel = memberCount ? totalUpgradeLevels / memberCount : 0;

    const points = pointsMap.mainBuildLvl * mainHallLevel
        + pointsMap.countPeople * memberCount
        + pointsMap.clanLvl * clanLevel
        + pointsMap.middleLvlOfBonuses * avgUpgradeLevel;

    return Math.round(points);
};
