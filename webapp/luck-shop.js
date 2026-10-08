import { escapeHtml } from './escape-html.js';

// "Лавка удачи": where Coins of Luck (bought with Telegram Stars) are spent.

const REASONS = {
  unknown_item: 'Такого товара больше нет.',
  not_enough_coins: 'Не хватает монет удачи.',
  already_full: 'Тут уже максимум попыток на сегодня.',
  delivery_failed: 'Не удалось выдать товар. Монеты не списаны.',
  inventory_missing: 'Инвентарь персонажа недоступен.',
};

const formatNumber = value => new Intl.NumberFormat('ru-RU').format(Number(value) || 0);

export async function openLuckShopGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/luck');
  let feedback = { kind: '', text: '' };
  let pending = false;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay luck-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass feedback-panel">
      <header class="ds-head">
        <button class="overlay-close ds-round" type="button" aria-label="Закрыть">←</button>
        <h2>Лавка удачи</h2>
        <span class="ds-round" aria-hidden="true">🍀</span>
      </header>
      <div data-luck-body></div>
    </div>`;
  const body = overlay.querySelector('[data-luck-body]');
  const close = () => { overlay.classList.add('closing'); window.setTimeout(() => overlay.remove(), 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function itemHtml(item) {
    const disabled = pending || !item.affordable || item.full;
    return `
      <article class="mail-letter pending luck-item">
        <div class="mail-head"><strong>${item.icon} ${escapeHtml(item.title)}</strong><small>${formatNumber(item.cost)} 🍀</small></div>
        <button type="button" class="feedback-submit" data-luck-buy="${escapeHtml(item.id)}" ${disabled ? 'disabled' : ''}>${item.full ? 'Максимум' : item.affordable ? 'Купить' : 'Не хватает монет'}</button>
      </article>`;
  }

  function render() {
    body.innerHTML = `
      <div class="feedback-card">
        <div class="feedback-intro"><span>🍀</span><div><strong>Монеты удачи: ${formatNumber(state.coins)}</strong>
          <p>Донатная валюта: покупается за Telegram Stars в «Обменнике», в игре не выпадает и не воруется.${state.shield ? ` Кристаллы отсюда защищены от ограбления: ${formatNumber(state.shield.amount)} 💎.` : ''}</p></div></div>
        <button type="button" class="feedback-submit" data-luck-exchange>Купить монеты за Звёзды</button>
      </div>
      ${state.groups.map(group => `
        <h4 class="luck-group">${escapeHtml(group.title)}</h4>
        <div class="mail-list">${state.items.filter(item => item.group === group.id).map(itemHtml).join('')}</div>`).join('')}
      ${feedback.text ? `<div class="feedback-result ${feedback.kind}">${escapeHtml(feedback.text)}</div>` : ''}`;
    body.querySelectorAll('[data-luck-buy]').forEach(button => button.addEventListener('click', () => buy(button.dataset.luckBuy)));
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
      feedback = { kind: 'success', text: `Куплено: ${payload.item.title}.` };
      renderState?.(payload.state);
      if (statusElement) statusElement.textContent = `Лавка удачи: ${payload.item.title}.`;
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
