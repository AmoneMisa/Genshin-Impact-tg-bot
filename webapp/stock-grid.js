import {itemGridHtml} from './item-grid.js';
import {auctionArt} from './auction.js';
import {materialIcon} from './material-icons.js';
import {escapeHtml} from './escape-html.js';
import {icon} from './icons.js';
export function stockArt(row){return row.kind==='currency'?(row.ref==='gold'?materialIcon('gold'):(row.ref==='moonDew'?materialIcon('moonDew'):icon('pickaxe'))):auctionArt(row);}
const expiryLabel=row=>row.expiresAt?' · До '+new Date(row.expiresAt).toLocaleString('ru-RU'):'';
export function stockGrid(rows,{select=false,selected=-1,min=30}={}){
 return itemGridHtml(rows.map((row,index)=>`<${select?'button':'div'} ${select?'type="button"':''} class="item-grid-cell stock-slot ${selected===index?'selected':''}" ${select?`data-stock-index="${index}"`:''} title="${escapeHtml(row.title+expiryLabel(row))}${row.stats?.length?' — '+escapeHtml(row.stats.join(' · ')):''}" aria-label="${escapeHtml(row.title+expiryLabel(row))} ×${row.count}">${stockArt(row)}<small>${row.count>1?new Intl.NumberFormat('ru-RU').format(row.count):row.expiresAt?'⌛':''}</small></${select?'button':'div'}>`), {className: 'stock-grid', min, label: 'Предметы'});
}
// Gold committed to a table game cannot be moved by either trade participant.
const GOLD_LOCK_TEXT='Адена занята в игре со ставкой. Заверши партию перед передачей.';
export const TRANSFER_REASONS={not_enough_adena:'Не хватает адены на плату за внесение.',in_table_game:GOLD_LOCK_TEXT,augmented_item:'Аугментированные вещи нельзя хранить в клановом хранилище.',warehouse_forbidden:'Забрать предметы могут только глава и два со-лидера.',warehouse_full:'Хранилище заполнено.',item_unavailable:'Предмет недоступен. Сними снаряжение; временные и привязанные предметы нельзя передать.',not_enough:'Предметов больше не хватает.',invalid_count:'Введи целое количество, которое у тебя есть.',duplicate_item:'Этот предмет уже выбран.',trade_busy:'Один из игроков уже участвует в обмене.',trade_closed:'Обмен завершён, отменён или истёк.',trade_changed:'Предложение изменилось. Проверь оба списка и подтверди заново.',trade_items_changed:'Предметы или их улучшения изменились. Обнови предложение.',trade_empty:'Добавь предметы или адену в обмен.',trade_too_many:'В обмене максимум 12 позиций.',unknown_player:'Игрок не найден в этом чате.'};
