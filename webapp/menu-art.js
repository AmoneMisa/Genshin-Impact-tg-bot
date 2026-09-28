// Painted art for main-menu cards (webapp/art, built by `npm run art:build`).
// Features without a painting keep their icon-only card.

export const MENU_ART = Object.freeze(['boss', 'chest', 'arena', 'shop', 'builds', 'steal', 'inventory', 'gacha']);
const CLASS_ART = new Set(['noClass', 'warrior', 'archer', 'mage', 'priest']);

/** The character card shows the player's own class and gender. */
export function menuArtFor(featureId, player = {}) {
  if (featureId === 'profile') {
    const cls = CLASS_ART.has(player.className) ? player.className : 'noClass';
    return `/art/classes/${cls}-${player.gender === 'female' ? 'female' : 'male'}.webp`;
  }
  return MENU_ART.includes(featureId) ? `/art/menu/${featureId}.webp` : null;
}
