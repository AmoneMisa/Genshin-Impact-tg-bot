/**
 * Clan investigations catalog.
 *
 * A cooperative, multi-day research track: the clan funds ONE project at a time
 * from the shared warehouse (clan.investigations.active.progress), paid off
 * incrementally as the warehouse fills up via regular contributions. A project
 * completes once its full cost is funded AND at least `durationMs` has passed
 * since it was started — whichever finishes later — then unlocks a permanent,
 * clan-wide bonus. Effects are read via functions/game/clans/getInvestigationBonus.js
 * so this file stays the single source of truth.
 *
 *   swiftStrikes → -30% clan boss attack cooldown (read in clan.boss.attack)
 *   warTactics   → -30% guild war attack cooldown (read in clan.war.attack)
 *   tradeRoutes  → halves the clan-shop purchase cooldown (read in clan.shop)
 *
 * Costs/durations are intentionally well above a maxed building (top building
 * tier costs ~20-30k gold) — investigations are a long-term guild goal, not a
 * weekly purchase.
 */
const clanInvestigations = [
    {
        key: "swiftStrikes",
        label: "Стремительные удары",
        description: "Тренирует бойцов быстрее восстанавливаться между ударами по клановому боссу.",
        effectLabel: "-30% перезарядки атаки босса",
        cost: { gold: 40000, crystals: 60, ironOre: 150 },
        durationMs: 2 * 24 * 60 * 60 * 1000 // 2 days
    },
    {
        key: "warTactics",
        label: "Военная тактика",
        description: "Отрабатывает слаженные атаки — сокращает время между ударами в войнах кланов.",
        effectLabel: "-30% перезарядки атаки в войне",
        cost: { gold: 50000, crystals: 80, ironOre: 200 },
        durationMs: 3 * 24 * 60 * 60 * 1000 // 3 days
    },
    {
        key: "tradeRoutes",
        label: "Торговые пути",
        description: "Налаживает поставки для клановой лавки — вдвое сокращает время между покупками.",
        effectLabel: "-50% времени ожидания в клановом магазине",
        cost: { gold: 60000, crystals: 100, ironOre: 250 },
        durationMs: 3 * 24 * 60 * 60 * 1000 // 3 days
    }
];

export default clanInvestigations;
