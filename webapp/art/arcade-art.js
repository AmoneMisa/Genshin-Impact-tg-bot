// Only reviewed artwork is exposed to game screens.
import {icon} from '../icons.js';
export const ARCADE_ART = Object.freeze(["football","darts","slots","dice","basketball-ball","football-ball","bowling-ball","dart","pin","die","bowling","basketball"]);
export function arcadeArtUrl(key,size=480){return ARCADE_ART.includes(key)?`/art/arcade/v1/${key}-${size===960?960:480}.webp`:null;}
export function arcadeSpriteHtml(key){if(!ARCADE_ART.includes(key))return '';return `<img class="arcade-sprite" src="/art/arcade/v1/${key}-128.webp" srcset="/art/arcade/v1/${key}-128.webp 1x, /art/arcade/v1/${key}-256.webp 2x" width="64" height="64" alt="" decoding="async">`;}
const SYMBOLS=Object.freeze({'😈':'/art/hunt/mobs/demon-128.webp','❤️':'/art/items/v1/potion-hp-small-128.webp','💋':'/art/items/v1/potion-focus-128.webp','🤏':'/art/icons/lifestone-128.webp','🛫':'/art/world/v1/chests/reward-armor-128.webp','🚗':'/art/world/v1/chests/reward-gold-128.webp','💩':'/art/icons/attr-stone-128.webp','👻':'/art/hunt/mobs/spirit-128.webp','👽':'/art/hunt/mobs/orc-128.webp','☠️':'/art/hunt/mobs/undead-128.webp','🍒':'/art/items/v1/potion-hp-small-128.webp','⭐':'/art/world/v1/chests/reward-gold-128.webp','💎':'/art/world/v1/chests/reward-crystal-128.webp'});
export function slotPaintingHtml(symbol){const src=SYMBOLS[symbol]||SYMBOLS['💎'];return `<img class="slot-painting" src="${src}" width="48" height="48" alt="" decoding="async">`;}

export function arcadeTabIconHtml(id){if(id==='dice')return icon('dices');const key={basketball:'basketball-ball',football:'football-ball',bowling:'pin',darts:'dart'}[id];return key?arcadeSpriteHtml(key):slotPaintingHtml('💎');}
