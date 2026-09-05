const REASONS = {
  invalid_amount: 'Укажи целое положительное количество кристаллов.',
  not_enough_gold: 'Недостаточно золота для покупки.',
  inventory_missing: 'Инвентарь персонажа недоступен.',
};

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}

export async function openExchangeGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/exchange');
  let pending = false;
  let lastPurchase = null;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay exchange-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass exchange-panel">
      <header class="overlay-head">
        <div><div class="eyebrow">EXCHANGE · MONGO</div><h2>Обменник</h2></div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>
      <p class="overlay-copy">Фиксированный курс старой игры: 1 💎 = 1 500 🪙. Сумма проверяется и списывается только на сервере.</p>
      <div data-exchange-content></div>
      <div class="utility-feedback" data-exchange-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-exchange-content]');
  const feedback = overlay.querySelector('[data-exchange-feedback]');
  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function successHtml() {
    if (!lastPurchase) return '';
    return `
      <section class="exchange-success">
        <span>✓</span>
        <div><strong>Куплено ${formatNumber(lastPurchase.amount)} 💎</strong><small>Списано ${formatNumber(lastPurchase.cost)} золота</small></div>
      </section>`;
  }

  function render() {
    const quick = [1, 5, 10, 25, 50, 100].filter(amount => amount <= state.maxAffordable);
    const defaultAmount = state.maxAffordable > 0 ? Math.min(1, state.maxAffordable) : '';

    content.innerHTML = `
      <section class="exchange-balances">
        <article><span>🪙</span><div><small>ЗОЛОТО</small><strong>${formatNumber(state.gold)}</strong></div></article>
        <article><span>💎</span><div><small>КРИСТАЛЛЫ</small><strong>${formatNumber(state.crystals)}</strong></div></article>
      </section>
      ${successHtml()}
      <section class="exchange-rate">
        <span>1 💎</span><i>⇄</i><strong>${formatNumber(state.price)} 🪙</strong>
      </section>
      <section class="exchange-form">
        <label>
          <span>Купить кристаллов</span>
          <div><b>💎</b><input type="number" min="1" step="1" max="${Math.max(0, state.maxAffordable)}" value="${defaultAmount}" inputmode="numeric" data-exchange-amount /></div>
        </label>
        <div class="exchange-quick">
          ${quick.map(amount => `<button type="button" data-exchange-quick="${amount}">${formatNumber(amount)}</button>`).join('')}
          ${state.maxAffordable > 0 ? `<button type="button" data-exchange-quick="${state.maxAffordable}">Макс.</button>` : ''}
        </div>
        <div class="exchange-cost" data-exchange-cost></div>
        <button type="button" class="exchange-buy" data-exchange-buy ${state.maxAffordable <= 0 || pending ? 'disabled' : ''}>
          <span>💎</span><div><strong>Купить</strong><small>Доступно максимум ${formatNumber(state.maxAffordable)}</small></div>
        </button>
      </section>`;

    bind();
    updateCost();
  }

  function updateCost() {
    const input = content.querySelector('[data-exchange-amount]');
    const cost = content.querySelector('[data-exchange-cost]');
    if (!input || !cost) return;
    const amount = Number(input.value);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      cost.textContent = 'Введите целое количество';
      return;
    }
    cost.textContent = `Стоимость: ${formatNumber(amount * state.price)} 🪙`;
  }

  function bind() {
    const input = content.querySelector('[data-exchange-amount]');
    input?.addEventListener('input', updateCost);
    content.querySelectorAll('[data-exchange-quick]').forEach(button => {
      button.addEventListener('click', () => {
        if (input) input.value = button.dataset.exchangeQuick;
        updateCost();
        haptic('light');
      });
    });
    content.querySelector('[data-exchange-buy]')?.addEventListener('click', buy);
  }

  async function buy() {
    if (pending) return;
    const input = content.querySelector('[data-exchange-amount]');
    const amount = input?.value ?? '';
    pending = true;
    overlay.classList.add('busy');
    feedback.textContent = 'Покупаем кристаллы…';
    haptic('heavy');

    try {
      const payload = await api('/api/exchange/buy', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      state = payload.exchange;
      lastPurchase = { amount: payload.amount, cost: payload.cost };
      if (payload.state) renderState(payload.state);
      feedback.textContent = `Баланс: ${formatNumber(state.gold)} золота · ${formatNumber(state.crystals)} кристаллов.`;
      statusElement.textContent = `Обменник: куплено ${formatNumber(payload.amount)} кристаллов.`;
      haptic('medium');
      render();
    } catch (error) {
      if (error.payload?.exchange) state = error.payload.exchange;
      const base = REASONS[error.payload?.reason] || error.message;
      const missing = error.payload?.missingGold ? ` Не хватает ${formatNumber(error.payload.missingGold)} золота.` : '';
      feedback.textContent = `${base}${missing}`;
      lastPurchase = null;
      haptic('light');
      render();
    } finally {
      pending = false;
      overlay.classList.remove('busy');
    }
  }

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
