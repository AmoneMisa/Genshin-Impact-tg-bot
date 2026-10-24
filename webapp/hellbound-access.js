import {escapeHtml as esc} from './escape-html.js';
export const HELLBOUND_REASONS={
 hellbound_locked:'Хеллбаунд пока закрыт. Для открытия нужно завершить исходную цепочку Кэниса.',
 hellbound_quest_required:'Нужно завершить «Путь на Хеллбаунд» или «Это жутко горячо!».',
 hellbound_level_required:'Задание доступно с 78 уровня.',
 hellbound_ground_required:'Сначала выйдите в город или на открытую местность материка.',
 hellbound_portal_required:'На Хеллбаунд ведут врата в Хейне и на западном побережье.',
 quest_completed:'Задание уже завершено.',quest_step_required:'Сначала выполните текущий этап задания.',quest_item_required:'В задании отсутствует нужный предмет.',
};
const gateName=n=>n.npcId===32314?(n.region==='heine'?'Врата · Хейн':'Врата · западное побережье'):n.name;
export function hellboundNpcListHtml(state){
 if(!state.hellbound)return '';
 return '<details class="ui-disclosure"><summary>Путь на Хеллбаунд</summary><p>'+esc(state.hellbound.quest.text)+'</p>'+state.hellbound.npcs.map(n=>'<button type="button" class="ui-button" data-hellbound-show="'+esc(n.id)+'">'+esc(gateName(n))+'</button>').join('')+'</details>';
}
export function hellboundNpcHtml(n,state){
 const reasons=[...new Set(n.actions.map(a=>a.reason).filter(Boolean))];
 const route=state?.hellbound?.approach,extra=n.npcId===30612&&!n.near?'<details class="ui-disclosure"><summary>Путь через Пустоши</summary><p>К Касиану: хранитель портала Глудина → Пустоши.</p>'+(route?.inCity?route.near?`<button type="button" class="ui-button" data-hellbound-action="route" data-hellbound-npc="${esc(n.id)}" ${state.gold>=route.gold&&!state.quickTravel?.blocked?'':'disabled'}>Телепорт в Пустоши · ${esc(route.gold)} аден</button>`:`<button type="button" class="ui-button" data-hellbound-action="keeper" data-hellbound-npc="${esc(n.id)}">Подойти к хранителю Глудина</button>`:'')+'</details>':'';
 return '<p>'+esc(gateName(n))+'</p><p>'+esc(n.text)+'</p>'+reasons.map(r=>'<p role="status">'+esc(HELLBOUND_REASONS[r]||r)+'</p>').join('')+(!n.near?`<button type="button" class="ui-button" data-hellbound-action="walk" data-hellbound-npc="${esc(n.id)}" ${n.canWalk?'':'disabled'}>Подойти к NPC</button>`:'')+n.actions.map(a=>'<button type="button" class="ui-button primary" data-hellbound-action="'+esc(a.event)+'" data-hellbound-npc="'+esc(n.id)+'" '+(a.enabled?'':'disabled')+'>'+esc(a.label)+'</button>').join('')+extra;
}
