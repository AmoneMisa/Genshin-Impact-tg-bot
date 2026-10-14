import {avatarOutfit} from './avatar-art.js';

// Only reviewed portrait paintings are published. Unknown races retain the existing fallback.
export const AVATAR_PORTRAIT_KEYS = Object.freeze([
  'human-male', 'human-female', 'elf-male', 'elf-female',
  'darkElf-male', 'darkElf-female', 'orc-male', 'orc-female',
  'dwarf-male', 'dwarf-female', 'kamael-male', 'kamael-female',
]);

export function avatarPortraitUrl(player = {}, width = 256) {
  const outfit = avatarOutfit(player);
  if (!outfit || !AVATAR_PORTRAIT_KEYS.includes(outfit.key) || ![128, 256, 512].includes(width)) return null;
  const path = outfit.portraitPath || '/art/avatars/portraits/v1/' + outfit.key;
  return path + '-' + width + '.webp';
}
