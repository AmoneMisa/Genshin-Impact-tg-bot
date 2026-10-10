import {materialIcon} from './material-icons.js';
import { escapeHtml } from './escape-html.js';
import { luckCoinHtml } from './currency-icons.js';
import {icon,emojiIconName} from './icons.js';
import {auctionArt} from './auction.js';

// "Донат-магазин": where Coins of Luck (bought with Telegram Stars) are spent. Goods are split into
// categories (tabs): rented epic gear, scrolls, elixirs, craft sets, buffs, crystals and tries.

const REASONS = {
  unknown_item: 'Такого товара больше нет.',
  not_enough_coins: 'Не хватает монет удачи.',
  already_full: 'Тут уже максимум попыток на сегодня.',
  delivery_failed: 'Не удалось выдать товар. Монеты не списаны.',
  inventory_missing: 'Инвентарь персонажа недоступен.',
  level_too_low: 'Твой уровень слишком низкий для этого предмета.',
};

const formatNumber = value => new Intl.NumberFormat('ru-RU').format(Number(value) || 0);

export async function openLuckShopGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/luck');
  let feedback = { kind: '', text: '' };
  let pending = false;
  let group = state.groups[0]?.id || 'scrolls';
  let selected = null;
  let page = 0;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay luck-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass feedback-panel luck-shop-panel">
      <header class="ds-head">
        <button class="overlay-close ds-round" type="button" aria-label="Закрыть">←</button>
        <h2>Донат-магазин</h2>
        <span class="ds-round" aria-hidden="true">${luckCoinHtml(26)}</span>
      </header>
      <div data-luck-body></div>
    </div>`;
  const body = overlay.querySelector('[data-luck-body]');
  const close = () => { overlay.classList.add('closing'); window.setTimeout(() => overlay.remove(), 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function buttonLabel(item) {
    if (item.full) return 'Максимум';
    if (item.locked) return `Нужен ${item.needLvl} уровень`;
    if (!item.affordable) return 'Не хватает монет';
    return 'Купить';
  }

  function itemHtml(item) {
    const disabled = pending || !item.affordable || item.full || item.locked;
    return `
      <article class="luck-selection">
        <span class="luck-selection-art">${itemArt(item)}</span><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.subtitle||'')}</p><strong>${formatNumber(item.cost)} ${luckCoinHtml(14)}</strong></div>
        <button type="button" class="shop-price" data-luck-buy="${escapeHtml(item.id)}" ${disabled ? 'disabled' : ''}>${buttonLabel(item)}</button>
      </article>`;
  }

  function itemArt(item){
    if(!item)return icon('gift');
    if(item.artMaterial)return materialIcon(item.artMaterial);
    if(item.artPotion)return auctionArt({kind:'potion',artPotion:item.artPotion});
    if(item.artItem)return auctionArt({kind:'equipment',artItem:item.artItem});
    return item.id?.startsWith('soul-')?materialIcon(item.id.replaceAll('-','_')):icon(emojiIconName(item.icon)||'gift');
  }

  function render() {
    if (!state.groups.some(entry => entry.id === group)) group = state.groups[0]?.id || group;
    const items=state.items.filter(item=>item.group===group);
    const pages=Math.max(1,Math.ceil(items.length/24));page=Math.min(page,pages-1);
    const visible=items.slice(page*24,page*24+24);
    if(!items.some(item=>item.id===selected))selected=items[0]?.id||null;
    body.innerHTML = `
      <div class="luck-wallet">
        <div class="feedback-intro"><span>${luckCoinHtml(32)}</span><div><strong>Монеты удачи: ${formatNumber(state.coins)}</strong>
          <p>За Telegram Stars, эпических боссов и топ арены.${state.shield ? ` Защищено ${formatNumber(state.shield.amount)} кристаллов.` : ''}</p></div></div>
        <button type="button" class="clan-play" data-luck-exchange>Купить COL за Звёзды</button>
      </div>
      <nav class="luck-inventory-tabs" aria-label="Категории">${state.groups.map(entry => `<button type="button" data-luck-group="${escapeHtml(entry.id)}" aria-pressed="${entry.id===group}">${escapeHtml(entry.title)}</button>`).join('')}</nav>
      <div class="luck-stock" aria-label="Товары">${visible.map(item=>`<button type="button" class="luck-slot ${selected===item.id?'selected':''}" data-luck-select="${escapeHtml(item.id)}" aria-pressed="${selected===item.id}" title="${escapeHtml(item.title)} · ${formatNumber(item.cost)} COL" aria-label="${escapeHtml(item.title)} · ${formatNumber(item.cost)} COL">${itemArt(item)}</button>`).join('')}${'<span class="luck-slot empty" aria-hidden="true"></span>'.repeat(Math.max(0,24-visible.length))}</div>
      ${pages>1?`<div class="luck-pagination"><button type="button" data-luck-page="-1" ${page===0?'disabled':''} aria-label="Предыдущая страница">←</button><span>${page+1} / ${pages}</span><button type="button" data-luck-page="1" ${page===pages-1?'disabled':''} aria-label="Следующая страница">→</button></div>`:''}
      ${selected?itemHtml(items.find(item=>item.id===selected)):'<p class="shop-empty">Товаров пока нет.</p>'}
      ${feedback.text ? `<div class="feedback-result ${feedback.kind}">${escapeHtml(feedback.text)}</div>` : ''}`;
    body.querySelectorAll('[data-luck-buy]').forEach(button => button.addEventListener('click', () => buy(button.dataset.luckBuy)));
    body.querySelectorAll('[data-luck-group]').forEach(button => button.addEventListener('click', () => { group = button.dataset.luckGroup;page=0;selected=null; haptic?.('light'); render(); }));
    body.querySelectorAll('[data-luck-page]').forEach(button=>button.onclick=()=>{page+=Number(button.dataset.luckPage);selected=items[page*24]?.id||null;render();});
    body.querySelectorAll('[data-luck-select]').forEach(button=>button.onclick=()=>{selected=button.dataset.luckSelect;haptic?.('light');render();});
    body.querySelector('[data-luck-exchange]')?.addEventListener('click', async () => {
      haptic?.('light');
      close();
      const { openExchangeGame } = await import('./exchange.js');
      openExchangeGame({ api, renderState, haptic, statusElement });
    });
  }

  async function buy(itemId) {
    if (pending) return;
    pending = true;
    render();
    haptic?.('medium');
    try {
      const payload = await api('/api/luck/buy', { method: 'POST', body: JSON.stringify({ itemId }) });
      state = payload.luck;
      feedback = { kind: 'success', text: payload.extended ? `Срок продлён: ${payload.item.title}.` : `Куплено: ${payload.item.title}.` };
      renderState?.(payload.state);
      if (statusElement) statusElement.textContent = `Донат-магазин: ${payload.item.title}.`;
    } catch (error) {
      if (error.payload?.luck) state = error.payload.luck;
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
