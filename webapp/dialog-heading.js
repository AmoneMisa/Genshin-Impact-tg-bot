import {escapeHtml} from './escape-html.js';

/** Shared popup heading. Plain text and the existing close glyph; no decorative assets. */
export function dialogHeading(title,{id=null,dismissible=true}={}){
 return `<header class="game-dialog-heading"><h2${id?` id="${escapeHtml(id)}"`:''}>${escapeHtml(title)}</h2>${dismissible?'<button type="button" data-dismiss aria-label="Закрыть">×</button>':''}</header>`;
}
