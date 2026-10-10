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

export async function openAuctionGame({ api, renderState, haptic, statusElement }) {
  let kind = 'all';
  let sort = 'new';
  let tab = 'lots';
  let selected = null; // the item being put up: {kind, ref, title, count}
  let pending = false;
  let feedback = { kind: '', text: '' };
  let type = 'all', grade = '', search = '', page = 1, selectedLot = null;
  const PAGE_SIZE = window.matchMedia('(max-width: 600px)').matches ? 6 : 12;
  const load = () => api(`/api/auction?kind=${encodeURIComponent(kind)}&sort=${encodeURIComponent(sort)}`);
  let state = await load();

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay auction-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel auction-panel">
      <header class="auction-title">
        <h2>Комиссионная торговля</h2>
        <button class="overlay-close" type="button" aria-label="Закрыть">${icon('x')}</button>
      </header>
      <div data-auction-body></div>
    </div>`;
  const body = overlay.querySelector('[data-auction-body]');
  const close = () => { overlay.classList.add('closing'); window.setTimeout(() => overlay.remove(), 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);
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
    if (selected) {
      return `
        <div class="feedback-card">
          <strong>${escapeHtml(selected.title)}</strong>
          ${selected.max > 1 ? `<label class="feedback-field"><span>Количество (до ${formatNumber(selected.max)})</span><input type="number" min="1" max="${selected.max}" step="1" value="${selected.max}" inputmode="numeric" data-sell-count /></label>` : ''}
          <label class="feedback-field"><span>Цена за весь лот, адена</span><input type="number" min="1" max="1000000000" step="1" inputmode="numeric" data-sell-price placeholder="Например, 10 000" /></label>
          <small>Комиссия ${Math.round(state.fee * 100)}% с продажи. Лот висит ${state.hours} ч., потом вещь вернётся.</small>
          <button type="button" class="feedback-submit" data-sell-confirm>Выставить</button>
          <button type="button" class="fr-btn ghost" data-sell-back>Назад</button>
        </div>`;
    }
    return `<div class="mail-list">${state.sellable.length ? state.sellable.map((entry, index) => `
      <article class="mail-letter pending">
        <div class="mail-head"><span class="auction-art">${auctionArt(entry)}</span><strong>${escapeHtml(entry.title)}${entry.count > 1 ? ` ×${formatNumber(entry.count)}` : ''}${entry.enchant ? ` +${entry.enchant}` : ''}</strong><small>${entry.grade ? escapeHtml(entry.grade) : KIND_LABELS[entry.kind === 'material' ? 'material' : entry.kind]}</small></div>
        <button type="button" class="feedback-submit" data-sell-pick="${index}">Продать</button>
      </article>`).join('') : '<p class="mail-empty">Нечего продавать: снимите снаряжение или добудьте материалы.</p>'}</div>`;
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
    body.querySelectorAll('[data-auction-tab]').forEach(button => button.addEventListener('click', () => { tab = button.dataset.auctionTab; selected = null; selectedLot=null; page=1; feedback = { kind: '', text: '' }; haptic?.('light'); render(); }));
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
      selected = { kind: entry.kind, ref: entry.ref, title: entry.title, max: entry.count };
      render();
    }));
    body.querySelector('[data-sell-back]')?.addEventListener('click', () => { selected = null; render(); });
    body.querySelector('[data-sell-confirm]')?.addEventListener('click', () => {
      const count = Number(body.querySelector('[data-sell-count]')?.value || 1);
      const price = Number(body.querySelector('[data-sell-price]').value);
      act('/api/auction/list', { kind: selected.kind, ref: selected.ref, count, price }, 'Лот выставлен.', () => { selected = null; tab = 'mine'; });
    });
  }

  async function act(path, payload, okText, after = () => {}) {
    if (pending) return;
    pending = true;
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

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  render();
}
