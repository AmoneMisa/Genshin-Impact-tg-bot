// Crystals bought with Telegram Stars cannot be raided for a week. The shield is one
// pool {amount, until} on the player's game; a new purchase adds to it and restarts the week.
export const STAR_SHIELD_MS = 7 * 24 * 60 * 60 * 1000;

export function starShieldAmount(game, now = Date.now()) {
    const shield = game?.starShield;
    if (!shield || !(Number(shield.until) > now)) return 0;
    return Math.max(0, Number(shield.amount) || 0);
}

export function addStarShield(game, crystals, now = Date.now()) {
    game.starShield = {amount: starShieldAmount(game, now) + Math.max(0, Number(crystals) || 0), until: now + STAR_SHIELD_MS};
    return game.starShield;
}

export function removeFromStarShield(game, crystals, now = Date.now()) {
    const left = Math.max(0, starShieldAmount(game, now) - Math.max(0, Number(crystals) || 0));
    game.starShield = left > 0 ? {amount: left, until: Number(game.starShield.until)} : null;
}
