// What the forge building (30 levels) adds to crafting, enchanting and crystallizing. Every bonus grows evenly from
// level 1 (nothing) to level 30 (the maximum below), so the whole upgrade chain gives:
//   craft chance +15%, enchant chance +8%, masterwork chance +5%, double craft +5%, crystals from crystallizing +10%,
//   and a 15% chance (reached evenly) to spend 40% less materials, the cut growing from 5% to 40%.
import {activeLoginRune} from '../../../template/loginRewards.js';
export const FORGE_MAX_LEVEL = 30;

export const FORGE_MAX = Object.freeze({
    craft: 0.15,
    enchant: 0.08,
    masterwork: 0.05,
    doubleCraft: 0.05,
    crystals: 0.10,
    saveChance: 0.15,
    saveShareMin: 0.05,
    saveShareMax: 0.40,
});

/** Masterwork chance of a craft before the forge: a rare lucky roll. */
export const MASTERWORK_BASE = 0.02;

export function forgeLevel(session) {
    const level = Math.floor(Number(session?.game?.builds?.forge?.currentLvl) || 1);
    return Math.max(1, Math.min(FORGE_MAX_LEVEL, level));
}

/** The bonuses of a hero's forge: shares (0.05 = 5%) that add to the base chances. */
export function forgeBonuses(session) {
    const level = forgeLevel(session);
    const progress = (level - 1) / (FORGE_MAX_LEVEL - 1);
    return {
        level,
        craft: FORGE_MAX.craft * progress + (activeLoginRune(session,'craft')?0.05:0),
        enchant: FORGE_MAX.enchant * progress,
        masterwork: FORGE_MAX.masterwork * progress,
        doubleCraft: FORGE_MAX.doubleCraft * progress,
        crystals: FORGE_MAX.crystals * progress,
        saveChance: FORGE_MAX.saveChance * progress,
        saveShare: level > 1 ? FORGE_MAX.saveShareMin + (FORGE_MAX.saveShareMax - FORGE_MAX.saveShareMin) * progress : 0,
    };
}

/** `needs` ({key: amount}) with a share of every kind saved (at least 1 of each left). */
export function reduceNeeds(needs, share) {
    const result = {};
    for (const [key, amount] of Object.entries(needs || {})) {
        const need = Number(amount) || 0;
        result[key] = need <= 0 ? need : Math.max(1, Math.ceil(need * (1 - share)));
    }
    return result;
}
