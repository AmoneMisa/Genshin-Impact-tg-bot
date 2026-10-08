import { escapeHtml } from './escape-html.js';
import { luckCoinHtml } from './currency-icons.js';

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
    <div class="overlay-panel glass feedback-panel">
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
      <article class="mail-letter pending luck-item">
        <div class="mail-head"><strong>${item.icon} ${escapeHtml(item.title)}</strong><small>${formatNumber(item.cost)} ${luckCoinHtml(14)}</small></div>
        ${item.subtitle ? `<p>${escapeHtml(item.subtitle)}</p>` : ''}
        <button type="button" class="feedback-submit" data-luck-buy="${escapeHtml(item.id)}" ${disabled ? 'disabled' : ''}>${buttonLabel(item)}</button>
      </article>`;
  }

  function render() {
    if (!state.groups.some(entry => entry.id === group)) group = state.groups[0]?.id || group;
    body.innerHTML = `
      <div class="feedback-card">
        <div class="feedback-intro"><span>${luckCoinHtml(32)}</span><div><strong>Монеты удачи: ${formatNumber(state.coins)}</strong>
          <p>Донатная валюта: покупается за Telegram Stars в «Обменнике», не воруется. Немного монет дают за эпических боссов и топ-10 арены.${state.shield ? ` Кристаллы отсюда защищены от ограбления: ${formatNumber(state.shield.amount)} 💎.` : ''}</p></div></div>
        <button type="button" class="feedback-submit" data-luck-exchange>Купить монеты за Звёзды</button>
      </div>
      <nav class="fr-tabs luck-tabs" aria-label="Категории">${state.groups.map(entry => `<button type="button" data-luck-group="${escapeHtml(entry.id)}" class="${entry.id === group ? 'active' : ''}">${escapeHtml(entry.title)}</button>`).join('')}</nav>
      <div class="mail-list">${state.items.filter(item => item.group === group).map(itemHtml).join('')}</div>
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
