// Painted art for main-menu cards (webapp/art, built by `npm run art:build`).
// Features without a painting keep their icon-only card.
import { portraitFamily } from './class-family.js';
import { avatarPortraitUrl } from './art/avatar-portrait-art.js';

export const MENU_ART = Object.freeze(['boss', 'chest', 'arena', 'shop', 'builds', 'steal', 'inventory', 'gacha', 'hunt', 'passives', 'luckShop', 'auction']);
const CLASS_ART = new Set(['noClass', 'warrior', 'archer', 'mage', 'priest']);

/** Reviewed race/gender portrait, with legacy class art for unknown race data. */
export function menuArtFor(featureId, player = {}, portraitWidth = 256) {
  if(featureId==='catacombs')return '/art/hunt/zones/catacombs-480.webp';
  if (featureId === 'profile') {
    const portrait = avatarPortraitUrl(player, portraitWidth);
    if (portrait) return portrait;
    const family = portraitFamily(player.className);
    const cls = CLASS_ART.has(family) ? family : 'noClass';
    return `/art/classes/${cls}-${player.gender === 'female' ? 'female' : 'male'}.webp`;
  }
  return MENU_ART.includes(featureId) ? `/art/menu/${featureId}.webp` : null;
}
