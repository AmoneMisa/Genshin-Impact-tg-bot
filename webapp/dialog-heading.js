import {escapeHtml} from './escape-html.js';

export const closeIconHtml = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

/** Shared popup heading and actions, independent of glyph/font metrics. */
export function dialogHeading(title,{id=null,dismissible=true,back=false,rules=null}={}){
 return `<header class="game-dialog-heading">${back?'<button type="button" data-back aria-label="Назад" title="Назад"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7M7 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>':''}<h2${id?` id="${escapeHtml(id)}"`:''}>${escapeHtml(title)}</h2>${rules!==null?`<button type="button" data-game-rules="${escapeHtml(rules)}" aria-label="Правила" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>`:''}${dismissible?`<button type="button" data-dismiss aria-label="Закрыть">${closeIconHtml}</button>`:''}</header>`;
}
