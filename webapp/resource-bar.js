import {escapeHtml} from './escape-html.js';
const format=value=>new Intl.NumberFormat('ru-RU').format(Math.round(Number(value)||0));
/** Shared HP/MP/CP bar, also used outside combat windows. */
export function bar(kind,current,max,{label=kind.toUpperCase(),text=null,percent=null}={}){
 const pct=Math.max(0,Math.min(100,Number(percent??(max>0?current/max*100:0))||0));
 return `<div class="mmo-bar ${escapeHtml(kind)}"><span class="mmo-bar-label">${escapeHtml(label)}</span><div class="mmo-bar-track"><i style="width:${pct}%"></i><b>${escapeHtml(text??`${format(current)} / ${format(max)}`)}</b></div></div>`;
}
