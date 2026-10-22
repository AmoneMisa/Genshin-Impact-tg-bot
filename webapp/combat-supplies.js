import {escapeHtml,formatNumber} from './boss-hud.js';
import {shotIcon} from './art/painted-icon-art.js';
import {l2IconHtml} from './art/l2-icon-art.js';
import {flaskHtml} from './inventory.js';

/** Shared hunting/Atlas supplies. Item identity, availability and auto flags come from the server. */
export function combatSuppliesHtml(state,{pending=false,collapsed=false,idPrefix='hunt'}={}){
 const supplies=state.supplies||{enabled:false,rows:[]},shots=state.shots;
 const shotRows=shots?.kinds?.length?shots.kinds.filter(k=>['soulshot','blessed'].includes(k.id)):[{id:'soulshot',label:'Soulshot',count:0},{id:'blessed',label:'Blessed Spiritshot',count:0}];
 const shotButtons=shotRows.map(kind=>`<button type="button" class="ui-button ui-combat-supply" data-shots="${kind.id}" aria-label="${escapeHtml(kind.label)} · автозаряды" title="${escapeHtml(kind.label)} · автозаряды" aria-pressed="${Boolean(shots?.enabled&&shots.selected===kind.id)}" ${pending||!shots?.grade?'disabled':''}>${shotIcon(kind.id,shots?.grade||'noGrade',kind.icon)}<em>${formatNumber(kind.count)}</em></button>`).join('');
 const potions=supplies.rows.map(p=>`<button type="button" class="ui-button ui-combat-supply" data-supply="${p.slot}" ${supplies.enabled?`aria-pressed="${p.auto}"`:''} aria-label="${escapeHtml(p.name)}${supplies.enabled?' · авто':''}" title="${escapeHtml(p.name)} · ${formatNumber(p.count)}${supplies.enabled?' · авто':''}" ${pending||state.player.hp<=0||(!supplies.enabled&&!p.count)?'disabled':''}>${p.icon?l2IconHtml(p.icon):flaskHtml(p)}<em>${formatNumber(p.count)}</em></button>`).join('');
 return `<div class="hunt-supplies" id="${escapeHtml(idPrefix)}-supply-items" ${collapsed?'hidden':''}><div class="hunt-shot-shortcuts" aria-label="Соски"><div class="hunt-shot-items" id="${escapeHtml(idPrefix)}-shot-items">${shotButtons}</div></div><div class="hunt-potion-shortcuts" aria-label="Банки">${potions}</div></div>`;
}
