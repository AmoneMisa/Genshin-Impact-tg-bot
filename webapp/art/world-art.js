import { avatarArtUrl } from './avatar-art.js';
import { worldArtUrl } from './world-art-url.js';
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

export { worldArtUrl, worldIconHtml } from './world-art-url.js';
