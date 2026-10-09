import buffPotions from '../template/buffPotions.js';
import { LIFESTONE_SHOP, lifestoneKey } from '../template/augmentData.js';

/**
 * Clan shop catalogue.
 *
 * Items are funded by the shared clan warehouse (filled via contributions and
 * boss loot) and delivered to the buyer's personal inventory. Each `potion`
 * must match an entry in template/potionsInInventoryTemplate.js by
 * bottleType + type + power (buff potions by `id`), otherwise delivery fails.
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
    },
    // Lineage II style buff potions (20 minutes), see template/buffPotions.js.
    // High Life Stones (Lineage II sells them up to level 80, grade S80): delivered as a material.
    ...Object.entries(LIFESTONE_SHOP.high).map(([grade, cost]) => ({
        key: "lifestone-high-" + grade,
        label: `Камень жизни: высокий (${grade})`,
        material: { key: lifestoneKey(grade, 'high'), amount: 1 },
        cost: { ...cost }
    })),
    ...buffPotions.map(potion => ({
        key: "buff-" + potion.id,
        label: potion.name,
        potion: { type: "buff", bottleType: potion.bottleType, id: potion.id },
        cost: { gold: 4500, crystals: 3 }
    }))
];
