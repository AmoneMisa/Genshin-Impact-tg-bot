import { avatarArtUrl } from './avatar-art.js';
import { REVIEWED_WORLD_ART } from './world-art-manifest.js';
import { portraitFamily } from '../class-family.js';
import {avatarCostumeArtUrl} from './avatar-costume-art.js';

export function fullBodyHeroUrl(player = {}) {
  const costume=player.costume;
  if(costume&&(!costume.expiresAt||costume.expiresAt>Date.now())&&costume.gender===player.gender){
    const src=avatarCostumeArtUrl(costume.id,player);
    if(src)return src;
  }
  const avatar = avatarArtUrl(player);
  if (avatar) return avatar;
  const family = portraitFamily(player.className);
  const cls = ['noClass', 'warrior', 'archer', 'mage', 'priest'].includes(family) ? family : 'noClass';
  return worldArtUrl(`heroes/${cls}-${player.gender === 'female' ? 'female' : 'male'}`, 512);
}

/** Only return reviewed, converted assets. Screens retain their existing fallback. */
export function worldArtUrl(key, width = 256) {
  if (!Object.hasOwn(REVIEWED_WORLD_ART, key)) return null;
  const sizes = REVIEWED_WORLD_ART[key];
  if (!sizes?.includes(width)) return null;
  return `/art/world/v1/${key}-${width}.webp`;
}

export function worldIconHtml(key, size = 64) {
  const src = worldArtUrl(key, 128) || worldArtUrl(key, 256);
  return src ? `<img class="world-painted-icon" src="${src}" width="${size}" height="${size}" alt="" loading="lazy" decoding="async">` : '';
}
