import {l2IconUrl} from './l2-ui-art.js';
const textures={inventory:'Icon_DF_MenuWnd_Inventory',character:'Icon_DF_MenuWnd_Character',skills:'Icon_DF_MenuWnd_Skill',clan:'Icon_DF_MenuWnd_Clan'};
/** Original cropped client navigation artwork; provenance is in l2ui/navigation/source.json. */
export function l2NavigationIcon(id){
 // High Five has no auction menu shortcut: use its original Adena artwork for this commerce action.
 const src=id==='auction'?l2IconUrl('icon-etc_adena_i00'):textures[id]?`/art/l2ui/navigation/${textures[id]}-icon.webp`:null;
 return src?`<img src="${src}" alt="" aria-hidden="true" width="24" height="24" decoding="async">`:'';
}
