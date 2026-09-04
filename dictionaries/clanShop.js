/**
 * Clan shop catalogue.
 *
 * Items are funded by the shared clan warehouse (filled via contributions and
 * boss loot) and delivered to the buyer's personal inventory. Each `potion`
 * must match an entry in template/potionsInInventoryTemplate.js by
 * bottleType + type + power, otherwise delivery fails.
 *
 * Each member may claim one clan-shop item per week (see clanCallback.js).
 */
export default [
    {
        key: "hpMedium",
        label: "Среднее зелье ХП",
        potion: { type: "hp", bottleType: "potion", power: 8000 },
        cost: { gold: 4000 }
    },
    {
        key: "hpElixir",
        label: "Эликсир ХП (45%)",
        potion: { type: "hp", bottleType: "elixir", power: 45 },
        cost: { gold: 3000, crystals: 2 }
    },
    {
        key: "mpSmall",
        label: "Зелье МП (300)",
        potion: { type: "mp", bottleType: "potion", power: 300 },
        cost: { gold: 3500 }
    }
];
