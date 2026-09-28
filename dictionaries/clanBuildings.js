/**
 * Clan buildings catalog (Phase 8).
 *
 * Each building is a clan-wide, warehouse-funded structure that grants a
 * passive bonus scaling with its level. Levels live on clan.buildings[key].level
 * (Mixed sub-doc), bonuses are read via functions/game/clans/getBuildingBonus.js
 * so the per-level values below stay the single source of truth.
 *
 *   mainHall → +clan XP from every source (read in addClanXp)
 *   barracks → +damage vs clan boss and in guild wars (read in clanBossAttack)
 *   treasury → +gold from boss / war rewards (read in the reward helpers)
 *
 * cost(currentLevel) returns the warehouse resources needed for the NEXT level;
 * it grows linearly with the current level so early levels stay affordable.
 */
const clanBuildings = [
    {
        key: "mainHall",
        label: "Ратуша",
        description: "Сердце клана. Увеличивает весь получаемый кланом опыт.",
        effectPerLevel: 0.05, // +5% clan xp per level
        effectLabel: "+5% опыта клана за уровень",
        maxLevel: 10,
        cost: (level) => ({ gold: 2000 * (level + 1), crystals: 5 * (level + 1) })
    },
    {
        key: "barracks",
        label: "Казарма",
        description: "Тренирует бойцов клана. Усиливает урон по клановому боссу и в войнах кланов.",
        effectPerLevel: 0.04, // +4% boss/war damage per level
        effectLabel: "+4% урона (босс и войны) за уровень",
        maxLevel: 10,
        cost: (level) => ({ gold: 2500 * (level + 1), ironOre: 20 * (level + 1) })
    },
    {
        key: "treasury",
        label: "Сокровищница",
        description: "Хранилище богатств клана. Увеличивает золото из наград за босса и войны.",
        effectPerLevel: 0.05, // +5% reward gold per level
        effectLabel: "+5% золота из наград за уровень",
        maxLevel: 10,
        cost: (level) => ({ gold: 3000 * (level + 1), crystals: 8 * (level + 1) })
    }
];

export default clanBuildings;
