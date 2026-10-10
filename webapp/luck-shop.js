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
      <article class="shop-item luck-item">
        <span class="shop-icon">${itemArt(item)}</span><div class="shop-item-copy"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.subtitle||'')}</p><small>${formatNumber(item.cost)} ${luckCoinHtml(14)}</small></div>
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
    body.innerHTML = `
      <div class="luck-wallet">
        <div class="feedback-intro"><span>${luckCoinHtml(32)}</span><div><strong>Монеты удачи: ${formatNumber(state.coins)}</strong>
          <p>За Telegram Stars, эпических боссов и топ арены.${state.shield ? ` Защищено ${formatNumber(state.shield.amount)} кристаллов.` : ''}</p></div></div>
        <button type="button" class="clan-play" data-luck-exchange>Купить COL за Звёзды</button>
      </div>
      <nav class="l2-store-grid luck-categories" aria-label="Категории">${state.groups.map(entry => `<button type="button" data-luck-group="${escapeHtml(entry.id)}" aria-pressed="${entry.id===group}" class="l2-store-category ${entry.id === group ? 'active' : ''}">${itemArt(state.items.find(item=>item.group===entry.id))}<span>${escapeHtml(entry.title)}</span></button>`).join('')}</nav>
      <div class="shop-list">${state.items.filter(item => item.group === group).map(itemHtml).join('')}</div>
      ${feedback.text ? `<div class="feedback-result ${feedback.kind}">${escapeHtml(feedback.text)}</div>` : ''}`;
    body.querySelectorAll('[data-luck-buy]').forEach(button => button.addEventListener('click', () => buy(button.dataset.luckBuy)));
    body.querySelectorAll('[data-luck-group]').forEach(button => button.addEventListener('click', () => { group = button.dataset.luckGroup; haptic?.('light'); render(); }));
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
