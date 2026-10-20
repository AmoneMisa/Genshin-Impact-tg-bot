import {escapeHtml as esc} from './escape-html.js';
import {formatNumber as fmt} from './boss-hud.js';
import {l2MaterialIcon} from './art/l2-icon-art.js';

const sailing=state=>state.player.walkHome?.kind==='ferry';
function disabled(state,port,action,stop){
 const trip=state.player.walkHome,blocked=Boolean(state.quickTravel?.blocked);
 if(action==='leave')return !sailing(state)||state.now>=trip.departureAt;
 if(blocked||sailing(state))return true;
 if(action==='ticket')return !port.nearVendor||state.gold<port.ticketPrice;
 if(action==='board')return !port.nearBoarding||!port.docked;
 if(action==='walk'&&(stop==='vendor'?port.nearVendor:port.nearBoarding))return true;
 return !port.canWalk;
}
export function ferryPanelHtml(state,id){
 const ports=state.ferries||[],port=ports.find(p=>p.id===id);
 if(!port)return '<div class="atlas-movement-content ui-choice-list">'+ports.map(p=>`<button type="button" class="ui-button ui-choice-row" data-ferry-select="${esc(p.id)}"><span>${esc(p.name)}<small>${esc(state.cities.find(c=>c.id===p.destination)?.name||state.locations?.find(l=>l.id===p.destination)?.name||'')}</small></span></button>`).join('')+'</div>';
 return `<div class="atlas-movement-content" data-ferry-panel="${esc(id)}"><p>${esc(port.vendor.name)}</p><p class="ui-inset-row">${l2MaterialIcon('l2_'+port.ticket)}<span>Билетов:</span><span data-ferry-stock>${fmt(port.tickets)}</span></p>${!port.tickets&&!state.player.walkHome?.paid?'<p>Без билета корабль высадит вас при отправлении.</p>':''}<p data-ferry-eta></p><div class="atlas-travel-confirm">${sailing(state)?'<button type="button" class="ui-button" data-ferry-action="leave">Сойти на берег</button>':`<button type="button" class="ui-button" data-ferry-action="walk" data-stop="vendor">К продавцу билетов</button><button type="button" class="ui-button" data-ferry-action="ticket">Купить билет · ${fmt(port.ticketPrice)} аден</button><button type="button" class="ui-button" data-ferry-action="walk" data-stop="boarding">К трапу</button><button type="button" class="ui-button primary" data-ferry-action="board">Подняться на корабль</button>`}</div></div>`;
}
export function refreshFerryPanel(root,state){
 const panel=root.querySelector('[data-ferry-panel]');if(!panel)return;
 const port=state.ferries?.find(p=>p.id===panel.dataset.ferryPanel);if(!port)return;
 const eta=panel.querySelector('[data-ferry-eta]'),trip=state.player.walkHome;
 eta.textContent=sailing(state)?state.now<trip.departureAt?'Отправление через '+Math.ceil((trip.departureAt-state.now)/60000)+' мин.':'Морской переход':port.docked?'Корабль у причала · отправление через '+Math.ceil((port.departureAt-state.now)/60000)+' мин.':'Прибытие корабля через '+Math.ceil((port.dockAt-state.now)/60000)+' мин.';
 panel.querySelector('[data-ferry-stock]').textContent=fmt(port.tickets);
 panel.querySelectorAll('[data-ferry-action]').forEach(b=>b.disabled=disabled(state,port,b.dataset.ferryAction,b.dataset.stop));
}
