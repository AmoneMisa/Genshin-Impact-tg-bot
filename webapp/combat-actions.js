import {escapeHtml} from './escape-html.js';
import {originalIcon} from './art/l2-gameplay-icons.js';
import {icon} from './icons.js';
export const COMBAT_ACTIONS=Object.freeze([
 {id:'attack',label:'Автоатака',art:'icon-action003'},
 {id:'next-target',label:'Следующая цель',art:'icon-action006'},
 {id:'trade',label:'Обмен',glyph:'arrow-right-left',target:true},
 {id:'party-invite',label:'Пригласить в группу',glyph:'users',target:true},
 {id:'party-leave',label:'Выйти из группы',glyph:'log-out'},
 {id:'party-transfer',label:'Передать лидера',glyph:'crown',target:true},
]);
export function combatActionButton(action,{compact=false,disabled=false,active=false}={}){
 return `<button type="button" class="ui-button ${compact?'mmo-skill boss-skill':'ui-compact'}" data-combat-action="${action.id}" ${action.id==='attack'?'data-attack':action.id==='next-target'?'data-next-target':''} aria-label="${escapeHtml(action.label)}" title="${escapeHtml(action.label)}" ${action.id==='attack'?`aria-pressed="${active}"`:''} ${disabled?'disabled':''}><span class="mmo-skill-icon">${action.art?originalIcon(action.art):icon(action.glyph)}</span>${compact?'':`<span>${escapeHtml(action.label)}</span>`}</button>`;
}
