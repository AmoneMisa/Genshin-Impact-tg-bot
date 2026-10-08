import { BUFF_POTION_IDS, addBuffPotion } from '../player/potionBuffs.js';
import buffPotions from '../../../template/buffPotions.js';

// Lineage II style buff potions as boss loot. Every fighter has a small chance,
// the top three a better one; harder bosses drop them more often and epic raid
// bosses always give one to each of the top three.

export const BUFF_POTION_DROP_CHANCE = Object.freeze({1: 0.06, 2: 0.1, 3: 0.16});
export const TOP_PLACE_MULTIPLIER = 1.5;
const EPIC_GUARANTEED_PLACES = 3;

/** The id of the dropped buff potion, or null. */
export function rollBuffPotionDrop({tier = 1, place = 1, epic = false} = {}, random = Math.random) {
    if (epic && place <= EPIC_GUARANTEED_PLACES) return pick(random);
    const base = BUFF_POTION_DROP_CHANCE[tier] ?? BUFF_POTION_DROP_CHANCE[1];
    const chance = Math.min(1, base * (place <= 3 ? TOP_PLACE_MULTIPLIER : 1));
    return random() < chance ? pick(random) : null;
}

function pick(random) {
    return BUFF_POTION_IDS[Math.min(BUFF_POTION_IDS.length - 1, Math.floor(random() * BUFF_POTION_IDS.length))];
}

/** Rolls and delivers the drop; returns the loot line shown to the player. */
export function giveBuffPotionDrop(member, context, random = Math.random) {
    const id = rollBuffPotionDrop(context, random);
    if (!id || !addBuffPotion(member, id)) return null;
    const definition = buffPotions.find(potion => potion.id === id);
    return {item: `potion-${id}`, name: definition.name, icon: '🧪', amount: 1};
}
