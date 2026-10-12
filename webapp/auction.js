import { createGamePopup } from './game-popup.js';
import { escapeHtml } from './escape-html.js';
import {materialIcon} from './material-icons.js';
import {flaskHtml} from './inventory.js';
import {itemArtKey,itemArtSources} from './art/items-art.js';
import {normalizeLootKind} from './loot-renderer.js';
import {l2CategoryIcon} from './art/l2-icon-art.js';
import {icon} from './icons.js';

// Аукцион чата: лоты других игроков, продажа своих вещей и список своих лотов.

const REASONS = {
  lot_gone: 'Этот лот уже продан или снят.',
  own_lot: 'Свой лот купить нельзя.',
  not_enough_gold: 'Не хватает золота.',
  invalid_price: 'Цена: целое число золота от 1 до 1 000 000 000.',
  invalid_count: 'Количество: целое число от 1.',
  invalid_kind: 'Этот предмет нельзя продать.',
  item_not_found: 'Предмет не найден: обнови список.',
  item_equipped: 'Сначала сними предмет.',
  timed_item: 'Временный предмет нельзя продать.',
  not_enough: 'Столько у тебя нет.',
  too_many_lots: 'Слишком много лотов: максимум 10.',
  not_yours: 'Это чужой лот.',
};

const KIND_LABELS = { all: 'Всё', equipment: 'Снаряжение', potion: 'Зелья', material: 'Материалы' };
const SORT_LABELS = { new: 'Новые', cheap: 'Дешевле', expensive: 'Дороже' };
const formatNumber = value => new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
const TYPES = {all:'Все',weapon:'Оружие',armor:'Доспехи',shield:'Щиты',jewelry:'Бижутерия',potion:'Припасы',material:'Ресурсы'};
/** The API stores a total lot price; registration accepts a price per item. */
export function auctionSaleQuote(rawCount, rawUnitPrice, rate = .05) {
  const count=Number(rawCount), unitPrice=Number(rawUnitPrice);
  if(!Number.isSafeInteger(count)||count<1) return {valid:false,reason:'invalid_count'};
  const price=count*unitPrice;
  if(!Number.isSafeInteger(unitPrice)||unitPrice<1||!Number.isSafeInteger(price)||price>1_000_000_000) return {valid:false,reason:'invalid_price'};
  const fee=Math.floor(price*rate);
  return {valid:true,price,fee,net:price-fee};
}
export function dropdown(name, label, value, choices) {
  return `<details class="auction-dropdown" data-dropdown="${name}"><summary aria-label="${label}">${escapeHtml(choices.find(([id])=>id===value)?.[1]||label)}</summary><div class="auction-dropdown-options">${choices.map(([id,text])=>`<button type="button" data-choice="${escapeHtml(id)}" aria-pressed="${value===id}">${escapeHtml(text)}</button>`).join('')}</div></details>`;
}
export function auctionArt(entry) {
  if(entry.kind==='material')return entry.materialKey ? materialIcon(entry.materialKey) : l2CategoryIcon('material');
  if(entry.kind==='potion')return entry.artPotion ? flaskHtml(entry.artPotion) : l2CategoryIcon('consumable');
  const item=entry.artItem || {name:entry.title,grade:entry.grade,mainType:entry.mainType};
  const art=itemArtSources(itemArtKey(normalizeLootKind(item),item));
  return `<img src="${art.src}" srcset="${art.srcset}" sizes="32px" width="32" height="32" alt="" loading="lazy" decoding="async">`;
}

export async function openAuctionGame({ api, renderState, haptic, statusElement, initialItem=null, onClose }) {
  let kind = 'all';
  let sort = 'new';
  let tab = 'lots';
  let selected = null; // the item being put up: {kind, ref, title, count}
  let pending = false;
  let sellCount = '1', unitPrice = '', sellPage = 1;
  let feedback = { kind: '', text: '' };
  let type = 'all', grade = '', search = '', page = 1, selectedLot = null;
  const PAGE_SIZE = window.matchMedia('(max-width: 600px)').matches ? 6 : 12;
  const load = () => api(`/api/auction?kind=${encodeURIComponent(kind)}&sort=${encodeURIComponent(sort)}`);
  let state = await load();
  if(initialItem){
    tab='sell';
    const entry=state.sellable.find(row=>row.kind===initialItem.kind&&row.ref===initialItem.ref);
    if(entry)selected={...entry,max:entry.count};
  }

  const popup=createGamePopup({title:'Комиссионная торговля',className:'auction-overlay',panelClass:'auction-panel',body:'<div data-auction-body></div>',canClose:()=>!pending,onClose:()=>onClose?.()});
  const {overlay}=popup;
  overlay.querySelector('[data-dismiss]').classList.add('overlay-close');
  const body=overlay.querySelector('[data-auction-body]');
  overlay.addEventListener('click',event=>{
    if(!event.target.closest('.auction-dropdown'))body.querySelectorAll('[data-dropdown]').forEach(menu=>{menu.open=false;});
  });

  const detailsHtml = lot => `
    ${lot.description ? `<p>${escapeHtml(lot.description)}</p>` : ''}
    ${lot.stats?.length ? `<p class="auction-stats">${lot.stats.map(escapeHtml).join(' · ')}</p>` : ''}`;

  function lotHtml(lot) {
    return `<tr class="${selectedLot===lot.id?'selected':''}"><td><button type="button" class="auction-item-pick" data-lot-select="${escapeHtml(lot.id)}" aria-pressed="${selectedLot===lot.id}"><span class="auction-art">${auctionArt(lot)}</span><span>${lot.enchant ? `+${lot.enchant} ` : ''}${escapeHtml(lot.title)}<small>${lot.mine?'Твой лот':escapeHtml(lot.sellerName)}</small></span></button></td><td class="auction-grade">${escapeHtml(lot.grade==='noGrade'?'—':lot.grade||'—')}</td><td class="auction-count">${formatNumber(lot.count)}</td><td class="auction-price">${formatNumber(lot.price)}</td></tr>`;
  }

  function lotsTab(source = state.lots) {
    const matches=source.filter(lot=>(type==='all'||(lot.mainType||lot.kind)===type)&&(!grade||lot.grade===grade)&&(!search||lot.title.toLowerCase().includes(search.toLowerCase())));
    const pages=Math.max(1,Math.ceil(matches.length/PAGE_SIZE)); page=Math.min(page,pages);
    const active=matches.find(lot=>lot.id===selectedLot);
    const grades=[...new Set(source.map(lot=>lot.grade).filter(Boolean))];
    return `<form class="auction-filters" data-auction-search-form>
      <div class="auction-filter-field"><span>Вид</span>${dropdown('type','Вид предмета',type,Object.entries(TYPES))}</div>
      <div class="auction-filter-field"><span>Ранг</span>${dropdown('grade','Ранг предмета',grade,[['','Все ранги'],...grades.map(id=>[id,id==='noGrade'?'Без ранга':id])])}</div>
      <label class="auction-filter-field auction-keywords"><span>Поиск предмета</span><input type="search" placeholder="Название предмета…" maxlength="40" data-auction-search value="${escapeHtml(search)}"></label>
      <div class="auction-filter-actions"><button type="submit">${icon('search')} Поиск</button><button type="button" data-auction-reset>${icon('rotate-ccw')} Сброс</button></div>
    </form>
    <div class="auction-market"><aside class="auction-types" aria-label="Тип предмета"><strong>Тип</strong>${Object.entries(TYPES).map(([id,label])=>`<button type="button" data-auction-type-button="${id}" class="${id===type?'active':''}">${label}</button>`).join('')}</aside>
      <div class="auction-results"><div class="auction-list-title"><span>Список предметов <b>${matches.length}</b></span>${dropdown('sort','Сортировка',sort,Object.entries(SORT_LABELS))}</div>
      <table class="auction-table"><thead><tr><th>Предмет</th><th class="auction-grade">Ранг</th><th class="auction-count">Кол-во</th><th>Цена</th></tr></thead><tbody>${matches.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE).map(lotHtml).join('')}</tbody></table>
      ${!matches.length?'<p class="auction-empty">Лотов не найдено.</p>':''}
      <div class="auction-pagination"><button type="button" aria-label="Предыдущая страница" data-auction-page="${page-1}" ${page===1?'disabled':''}>${icon('chevron-left')}</button><span>${page} / ${pages}</span><button type="button" aria-label="Следующая страница" data-auction-page="${page+1}" ${page===pages?'disabled':''}>${icon('chevron-right')}</button></div>
      ${active?`<div class="auction-detail"><strong>${escapeHtml(active.title)}</strong>${detailsHtml(active)}<small>Ещё ${active.hoursLeft} ч.</small></div>`:''}
      <div class="auction-actions"><button type="button" data-auction-refresh>${icon('rotate-ccw')} Обновить</button>${active?active.mine?`<button type="button" data-auction-cancel="${escapeHtml(active.id)}">Снять с продажи</button>`:`<button type="button" data-auction-buy="${escapeHtml(active.id)}" ${state.gold<active.price||pending?'disabled':''}>${materialIcon('gold')} Купить · ${formatNumber(active.price)}</button>`:'<button type="button" disabled>Выбери предмет</button>'}</div></div></div>`;
  }

  function sellTab() {
    const active=selected && state.sellable.find(item=>item.kind===selected.kind&&item.ref===selected.ref);
    if(selected&&!active)selected=null;
    if(active)selected={...active,max:active.count};
    const quote=auctionSaleQuote(sellCount,unitPrice,state.fee);
    const pages=Math.max(1,Math.ceil(state.mine.length/6));sellPage=Math.min(sellPage,pages);
    return `<div class="auction-registration">
      <form class="auction-register-form" data-sell-form>
        <h3>Зарегистрировать предмет на продажу</h3>
        <section class="auction-register-section"><h4>Разрешённые предметы</h4>
          <div class="auction-inventory" aria-label="Предметы для продажи">${state.sellable.map((entry,index)=>`<button type="button" class="auction-inventory-slot ${selected?.kind===entry.kind&&selected?.ref===entry.ref?'selected':''}" data-sell-pick="${index}" aria-pressed="${selected?.kind===entry.kind&&selected?.ref===entry.ref}" aria-label="${escapeHtml(entry.title)} · ${formatNumber(entry.count)}" title="${escapeHtml(entry.title)}">${auctionArt(entry)}${entry.count>1?`<small>${formatNumber(entry.count)}</small>`:''}</button>`).join('')||'<p class="auction-empty">Нечего продавать: снимите снаряжение или добудьте материалы.</p>'}</div>
        </section>
        <section class="auction-register-section"><h4>Предмет для регистрации</h4>
          <div class="auction-register-item">${selected?`<span class="auction-art">${auctionArt(selected)}</span><span><strong>${selected.enchant?`+${selected.enchant} `:''}${escapeHtml(selected.title)}</strong><small>${selected.grade?escapeHtml(selected.grade==='noGrade'?'Без ранга':selected.grade):KIND_LABELS[selected.kind]}</small></span>`:'<span>Выбери предмет в сетке.</span>'}</div>
          <label class="auction-register-field"><span>Общее кол-во</span><input type="number" min="1" max="${selected?.max||1}" step="1" inputmode="numeric" value="${escapeHtml(sellCount)}" data-sell-count ${!selected?'disabled':''}></label>
          <label class="auction-register-field"><span>Цена за 1 шт.</span><input type="number" min="1" max="1000000000" step="1" inputmode="numeric" value="${escapeHtml(unitPrice)}" data-sell-price ${!selected?'disabled':''}></label>
          <div class="auction-register-field"><span>Период продажи</span><span class="auction-register-value">${state.hours} ч.</span></div>
          <div class="auction-register-field"><span>Общая цена</span><strong data-sell-total>${quote.valid?formatNumber(quote.price):'—'}</strong></div>
        </section>
        <section class="auction-register-section auction-register-summary">
          <div class="auction-register-field"><span>Комиссия (${Math.round(state.fee*100)}%)</span><strong data-sell-fee>${quote.valid?formatNumber(quote.fee):'—'}</strong></div>
          <div class="auction-register-field"><span>К получению</span><strong data-sell-net>${quote.valid?formatNumber(quote.net):'—'}</strong></div>
          <small>Комиссия удерживается после продажи.</small>
        </section>
        <div class="auction-register-buttons"><button type="submit" data-sell-confirm ${!selected||!quote.valid||Number(sellCount)>selected.max||state.mine.length>=state.maxLots||pending?'disabled':''}>Регистрация</button><button type="button" data-sell-back ${!selected?'disabled':''}>Сброс</button></div>
      </form>
      <section class="auction-registered"><h3>Предметы торговли</h3><div class="auction-list-title">Список предметов (${state.mine.length}/${state.maxLots})</div>
        <table class="auction-table auction-registered-table"><thead><tr><th>Предмет</th><th class="auction-grade">Ранг</th><th class="auction-count">Кол-во</th><th>Цена</th><th>До конца</th></tr></thead><tbody>${state.mine.slice((sellPage-1)*6,sellPage*6).map(lot=>`<tr><td><span class="auction-registered-item"><span class="auction-art">${auctionArt(lot)}</span><span>${escapeHtml(lot.title)}</span></span></td><td class="auction-grade">${escapeHtml(lot.grade==='noGrade'?'—':lot.grade||'—')}</td><td class="auction-count">${formatNumber(lot.count)}</td><td class="auction-price">${formatNumber(lot.price)}</td><td>${lot.hoursLeft} ч.</td></tr>`).join('')||'<tr><td colspan="5" class="auction-empty">Активных лотов нет.</td></tr>'}</tbody></table>
        <div class="auction-pagination"><button type="button" data-sell-page="${sellPage-1}" aria-label="Предыдущая страница" ${sellPage===1?'disabled':''}>${icon('chevron-left')}</button><span>${sellPage} / ${pages}</span><button type="button" data-sell-page="${sellPage+1}" aria-label="Следующая страница" ${sellPage===pages?'disabled':''}>${icon('chevron-right')}</button></div>
        <div class="auction-actions"><button type="button" data-auction-tab="lots">Отмена</button></div>
      </section>
    </div>`;
  }

  function mineTab() {
    return `${lotsTab(state.mine)}
      <small>Активных лотов: ${state.mine.length} из ${state.maxLots}.</small>`;
  }

  function render() {
    body.innerHTML = `
      <nav class="auction-tabs" aria-label="Раздел">${[['lots', 'Список продаж'], ['sell', 'Регистрация'], ['mine', `Мои (${state.mine.length})`]].map(([id, label]) => `<button type="button" data-auction-tab="${id}" class="${id === tab ? 'active' : ''}">${label}</button>`).join('')}</nav>
      ${tab === 'lots' ? lotsTab() : tab === 'sell' ? sellTab() : mineTab()}
      <footer class="auction-wallet">${materialIcon('gold')} Адена: ${formatNumber(state.gold)}<small>Комиссия ${Math.round(state.fee*100)}%</small></footer>
      ${feedback.text ? `<div class="feedback-result ${feedback.kind}">${escapeHtml(feedback.text)}</div>` : ''}`;
    body.querySelectorAll('[data-auction-tab]').forEach(button => button.addEventListener('click', () => { if(pending)return; tab = button.dataset.auctionTab; selected = null; sellCount='1'; unitPrice=''; selectedLot=null; page=1; feedback = { kind: '', text: '' }; haptic?.('light'); render(); }));
    const resetPage = () => { page=1; selectedLot=null; render(); };
    body.querySelector('[data-auction-search-form]')?.addEventListener('submit',event=>{event.preventDefault();search=body.querySelector('[data-auction-search]').value.trim();resetPage();});
    body.querySelector('[data-auction-reset]')?.addEventListener('click',()=>{type='all';grade='';search='';resetPage();});
    body.querySelectorAll('[data-auction-type-button]').forEach(button=>button.addEventListener('click',()=>{type=button.dataset.auctionTypeButton;resetPage();}));
    body.querySelectorAll('[data-auction-page]').forEach(button=>button.addEventListener('click',()=>{page=Number(button.dataset.auctionPage);selectedLot=null;render();}));
    body.querySelectorAll('[data-lot-select]').forEach(button=>button.addEventListener('click',()=>{selectedLot=button.dataset.lotSelect;render();}));
    async function reload() {
      if(pending)return;
      pending=true;
      try { state=await load(); }
      catch(error) { feedback={kind:'error',text:error.message}; }
      finally {pending=false;render();}
    }
    body.querySelector('[data-auction-refresh]')?.addEventListener('click',reload);
    body.querySelectorAll('[data-dropdown]').forEach(menu=>{
      menu.addEventListener('toggle',()=>{if(menu.open)body.querySelectorAll('[data-dropdown]').forEach(other=>{if(other!==menu)other.open=false;});});
      menu.querySelectorAll('[data-choice]').forEach(button=>button.addEventListener('click',()=>{
        const value=button.dataset.choice;
        if(menu.dataset.dropdown==='sort'){sort=value;reload();}
        else {if(menu.dataset.dropdown==='type')type=value;else grade=value;resetPage();}
        body.querySelector(`[data-dropdown="${menu.dataset.dropdown}"] summary`)?.focus();
      }));
      menu.addEventListener('keydown',event=>{
        if(event.key==='Escape'){menu.open=false;menu.querySelector('summary').focus();event.preventDefault();}
        if(event.key==='ArrowDown'||event.key==='ArrowUp'){
          event.preventDefault();menu.open=true;
          const choices=[...menu.querySelectorAll('[data-choice]')],index=choices.indexOf(document.activeElement);
          choices[(index+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length]?.focus();
        }
      });
    });
    body.querySelectorAll('[data-auction-buy]').forEach(button => button.addEventListener('click', () => act('/api/auction/buy', { lotId: button.dataset.auctionBuy }, 'Куплено!')));
    body.querySelectorAll('[data-auction-cancel]').forEach(button => button.addEventListener('click', () => act('/api/auction/cancel', { lotId: button.dataset.auctionCancel }, 'Лот снят, вещь вернулась к тебе.')));
    body.querySelectorAll('[data-sell-pick]').forEach(button => button.addEventListener('click', () => {
      const entry = state.sellable[Number(button.dataset.sellPick)];
      if(pending||!entry)return;
      selected = {...entry,max:entry.count};sellCount='1';unitPrice='';
      render();
    }));
    body.querySelectorAll('[data-sell-page]').forEach(button=>button.addEventListener('click',()=>{sellPage=Number(button.dataset.sellPage);render();}));
    body.querySelector('[data-sell-back]')?.addEventListener('click', () => { selected=null;sellCount='1';unitPrice='';render(); });
    const updateQuote=()=>{
      sellCount=body.querySelector('[data-sell-count]').value;unitPrice=body.querySelector('[data-sell-price]').value;
      const quote=auctionSaleQuote(sellCount,unitPrice,state.fee);
      for(const [name,value] of [['total',quote.price],['fee',quote.fee],['net',quote.net]])body.querySelector('[data-sell-'+name+']').textContent=quote.valid?formatNumber(value):'—';
      body.querySelector('[data-sell-confirm]').disabled=!selected||!quote.valid||Number(sellCount)>selected.max||state.mine.length>=state.maxLots||pending;
    };
    body.querySelector('[data-sell-count]')?.addEventListener('input',updateQuote);
    body.querySelector('[data-sell-price]')?.addEventListener('input',updateQuote);
    body.querySelector('[data-sell-form]')?.addEventListener('submit',event=>{
      event.preventDefault();
      const quote=auctionSaleQuote(sellCount,unitPrice,state.fee);
      if(pending||!selected||!quote.valid||Number(sellCount)>selected.max||state.mine.length>=state.maxLots)return;
      act('/api/auction/list', {kind:selected.kind,ref:selected.ref,count:Number(sellCount),price:quote.price}, 'Лот выставлен.',()=>{selected=null;sellCount='1';unitPrice='';});
    });
    if(pending)body.querySelectorAll('button,input').forEach(control=>{control.disabled=true;});
  }

  async function act(path, payload, okText, after = () => {}) {
    if (pending) return;
    pending = true;
    render();
    haptic?.('medium');
    try {
      const result = await api(path, { method: 'POST', body: JSON.stringify(payload) });
      state = result.auction;
      feedback = { kind: 'success', text: result.fee ? `${okText} Комиссия продавца: ${formatNumber(result.fee)} адены.` : okText };
      after();
      renderState?.(result.state);
      if (statusElement) statusElement.textContent = `Аукцион: ${okText}`;
    } catch (error) {
      if (error.payload?.auction) state = error.payload.auction;
      feedback = { kind: 'error', text: REASONS[error.payload?.reason] || error.message };
    } finally {
      pending = false;
      render();
    }
  }

  render();
  popup.show();
}
