import { REVIEWED_WORLD_ART } from './world-art-manifest.js';

// Kept apart from world-art.js: that module pulls in the 66 KB costume catalogue, which the city screen at
// startup does not need.

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
