import {dropdown} from './auction.js';
import {worldArtUrl} from './art/world-art.js';
import {materialIcon} from './material-icons.js';
import {escapeHtml} from './escape-html.js';
const fmt=value=>new Intl.NumberFormat('ru-RU').format(Number(value)||0);
const time=ms=>`${Math.max(1,Math.ceil(ms/3_600_000))} ч.`;
export function hallAuctionView(auction,{grade='',filter='all',search='',sort='cheap',selected=null,pending=false,wallet=0}={}){
 if(!auction)return '';
 const matches=auction.halls.filter(h=>(!grade||h.grade===grade)&&(!search||`${h.name} ${h.town}`.toLowerCase().includes(search.toLowerCase()))&&(filter==='all'||filter==='occupied'&&h.owner||filter==='free'&&!h.owner&&!h.bid||filter==='bidding'&&!h.owner&&h.bid)).sort((a,b)=>sort==='expensive'?b.minBid-a.minBid:a.minBid-b.minBid);
 const active=matches.find(h=>h.id===selected)||matches[0];
 return `<section class="clan-section clan-hall-auction">
  <img class="clan-hall-art" src="${worldArtUrl('clan/clan-hall-auction',512)}" alt="Аукцион залов клана" width="512" height="341" loading="lazy">
  <h4>Аукцион залов клана</h4><p class="hall-note">Клан ${auction.minClanLevel} ур. · аренда ${auction.leaseDays} дней · шаг 5%. Перебитая ставка возвращается полностью.</p>
  <form class="auction-filters" data-hall-search><div class="auction-filter-field"><span>Ранг</span>${dropdown('hall-grade','Ранг зала',grade,[['','Все ранги'],['C','C'],['B','B'],['A','A']])}</div>
   <label class="auction-filter-field auction-keywords"><span>Поиск зала</span><input type="search" name="search" placeholder="Название зала или город…" value="${escapeHtml(search)}"></label><div class="auction-filter-actions"><button type="submit">Поиск</button><button type="button" data-hall-reset>Сброс</button></div></form>
  <div class="auction-market"><aside class="auction-types" aria-label="Статус зала"><strong>Тип</strong>${[['all','Все залы'],['free','Без ставок'],['bidding','Идут торги'],['occupied','Занятые']].map(([id,label])=>`<button type="button" data-hall-filter="${id}" class="${filter===id?'active':''}">${label}</button>`).join('')}</aside>
   <div class="auction-results"><div class="auction-list-title"><span>Список залов <b>${matches.length}</b></span>${dropdown('hall-sort','Сортировка',sort,[['cheap','Дешевле'],['expensive','Дороже']])}</div>
    <table class="auction-table hall-auction-table"><thead><tr><th>Зал</th><th>Ранг</th><th>Ставка</th></tr></thead><tbody>${matches.map(h=>`<tr class="${active?.id===h.id?'selected':''}"><td><button type="button" class="auction-item-pick" data-hall-select="${h.id}"><span class="auction-art"><img src="${worldArtUrl('clan/clan-hall',256)}" width="32" height="32" alt=""></span><span>${escapeHtml(h.name)}<small>${escapeHtml(h.town)} · ${h.owner?'Занят':h.bid?'Торги':'Без ставок'}</small></span></button></td><td>${h.grade}</td><td class="auction-price">${fmt(h.owner?.amount||h.bid?.amount||h.minimum)}</td></tr>`).join('')}</tbody></table>
    ${!matches.length?'<p class="auction-empty">Залов не найдено.</p>':''}
    ${active?`<div class="auction-detail"><strong>${escapeHtml(active.name)}</strong><p class="hall-note">+${active.gloryPerHour} славы в час · ${active.owner?`Арендатор: ${escapeHtml(active.owner.name)} · ещё ${time(active.remainingMs)}`:`До конца торгов ${time(active.remainingMs)}${active.bid?` · Ставка клана ${escapeHtml(active.bid.name)}`:''}`}</p>
     ${!active.owner?`<form class="clan-hall-bid" data-hall-bid="${active.id}"><label>Ставка в адене<input name="amount" type="number" inputmode="numeric" min="${active.minBid}" step="1" placeholder="От ${fmt(active.minBid)}" required ${active.canBid&&!pending?'':'disabled'}></label><button type="submit" class="clan-play" ${active.canBid&&!pending?'':'disabled'}>Сделать ставку</button></form>${!active.canBid?'<p class="hall-note">Нужны права руководства, клан 3 уровня и свободный слот зала.</p>':''}`:''}</div>`:''}
    <div class="auction-actions"><button type="button" data-hall-refresh>Обновить торги</button></div></div></div>
   <footer class="auction-wallet">${materialIcon('gold')} Хранилище: ${fmt(wallet)} адены</footer>
 </section>`;
}
