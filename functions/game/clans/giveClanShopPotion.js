import potionsInInventoryTemplate from "../../../template/potionsInInventoryTemplate.js";

/**
 * Adds a potion (bought from the clan shop) to a player's inventory.
 * Mirrors the stacking logic of the regular shop: increments an existing stack
 * or pushes a fresh one from the inventory template. Caller saves the chat.
 *
 * @param {Object} session - buyer member subdoc (current chat)
 * @param {{type:string, bottleType:string, power:number}} potion
 * @returns {boolean} true if delivered, false if no matching template exists
 */
export default function (session, potion) {
    const items = session.game?.inventory?.potions?.items;
    if (!Array.isArray(items)) {
        return false;
    }

    const existing = items.find(p =>
        p.bottleType === potion.bottleType &&
        p.type === potion.type &&
        p.power === potion.power
    );

    if (existing) {
        existing.count++;
        return true;
    }

    const template = potionsInInventoryTemplate.find(p =>
        p.bottleType === potion.bottleType &&
        p.type === potion.type &&
        p.power === potion.power
    );

    if (!template) {
        return false;
    }

    items.push({ ...template, count: 1 });
    return true;
}
