import {escapeHtml} from './escape-html.js';

/** Shared popup heading. Plain text and the existing close glyph; no decorative assets. */
export function dialogHeading(title,{id=null,dismissible=true,back=false}={}){
 return `<header class="game-dialog-heading">${back?'<button type="button" data-back aria-label="Назад" title="Назад"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7M7 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>':''}<h2${id?` id="${escapeHtml(id)}"`:''}>${escapeHtml(title)}</h2>${dismissible?'<button type="button" data-dismiss aria-label="Закрыть">×</button>':''}</header>`;
}
