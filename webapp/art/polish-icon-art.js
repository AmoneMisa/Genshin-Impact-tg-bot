// Reviewed characteristic and clan UI paintings; unknown keys never become paths.
export const POLISH_ICON_KEYS=Object.freeze(['stat-str','stat-dex','stat-con','stat-int','stat-wit','stat-men','vitality','clan-rta']);
export function polishIconUrl(key,size=128){return POLISH_ICON_KEYS.includes(key)?`/art/polish/v1/${key}-${size===256?256:128}.webp`:null;}
export function polishIcon(key){const src=polishIconUrl(key);return src?`<img class="polish-icon" src="${src}" srcset="${src} 1x, ${polishIconUrl(key,256)} 2x" width="24" height="24" alt="" aria-hidden="true" decoding="async" draggable="false">`:'';}
export function characteristicIcon(id){return polishIcon('stat-'+String(id).toLowerCase());}
