const REASONS = {
  invalid_amount: 'Укажи целое положительное количество кристаллов.',
  not_enough_gold: 'Недостаточно золота для покупки.',
  inventory_missing: 'Инвентарь персонажа недоступен.',
};

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}

/** Whole crystals within [1, max]; empty when nothing is affordable. */
export function clampAmount(value, max) {
  const limit = Math.max(0, Math.floor(Number(max) || 0));
  if (!limit) return 0;
  return Math.max(1, Math.min(limit, Math.floor(Number(value) || 0)));
}

const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));

export async function openExchangeGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/exchange');
  let pending = false;
  let lastPurchase = null;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay exchange-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass exchange-panel">
      <header class="ex-head">
        <button class="overlay-close ex-round" type="button" aria-label="Закрыть">←</button>
        <h2>Обменник</h2>
        <span class="ex-round" aria-hidden="true">⚗</span>
      </header>
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
    const defaultAmount = clampAmount(lastPurchase?.amount || 1, state.maxAffordable);
    content.innerHTML = `
      <section class="ex-altar" data-exchange-altar>
        <div class="ex-side gold"><span class="ex-pile" aria-hidden="true">🪙</span><small>Золото</small><strong>${formatNumber(state.gold)}</strong></div>
        <div class="ex-circle" aria-hidden="true"><i></i><i></i><b>⇄</b></div>
        <div class="ex-side crystal"><span class="ex-pile" aria-hidden="true">💎</span><small>Кристаллы</small><strong>${formatNumber(state.crystals)}</strong></div>
        <div class="ex-fly" data-exchange-fly aria-hidden="true"></div>
      </section>
      <p class="ex-rate">Курс: <b>1 💎 = ${formatNumber(state.price)} 🪙</b></p>
      ${successHtml()}
      <section class="exchange-form">
        <div class="ex-stepper">
          <button type="button" data-exchange-step="-1" aria-label="Меньше">−</button>
          <label><b>💎</b><input type="number" min="1" step="1" max="${Math.max(0, state.maxAffordable)}" value="${defaultAmount || ''}" inputmode="numeric" data-exchange-amount aria-label="Купить кристаллов" /></label>
          <button type="button" data-exchange-step="1" aria-label="Больше">+</button>
        </div>
        <div class="exchange-quick">
          ${[1, 10, 50].map(amount => `<button type="button" data-exchange-quick="${amount}" ${amount > state.maxAffordable ? 'disabled' : ''}>${formatNumber(amount)}</button>`).join('')}
          <button type="button" data-exchange-quick="${state.maxAffordable}" ${state.maxAffordable > 0 ? '' : 'disabled'}>Макс. ${formatNumber(state.maxAffordable)}</button>
        </div>
        <div class="exchange-cost" data-exchange-cost></div>
        <button type="button" class="exchange-buy" data-exchange-buy ${state.maxAffordable <= 0 ? 'disabled' : ''}>${state.maxAffordable > 0 ? 'Обменять' : 'Не хватает золота'}</button>
      </section>`;

    bind();
    updateCost();
  }

  // Coins stream into the circle, it flares, crystals spill out on the right.
  async function playTransmute(amount) {
    const altar = content.querySelector('[data-exchange-altar]');
    const fly = content.querySelector('[data-exchange-fly]');
    if (!altar || !fly || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    fly.innerHTML = `${Array.from({ length: 6 }, (_, i) => `<i class="coin" style="--d:${i * 70}ms">🪙</i>`).join('')}${Array.from({ length: Math.min(6, Math.max(2, Math.ceil(Math.log2(amount + 1)))) }, (_, i) => `<i class="gem" style="--d:${550 + i * 80}ms;--y:${(i % 3 - 1) * 16}px">💎</i>`).join('')}<strong>+${formatNumber(amount)} 💎</strong>`;
    altar.classList.add('transmuting');
    await wait(1250);
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
    content.querySelectorAll('[data-exchange-step]').forEach(button => {
      button.addEventListener('click', () => {
        if (input) input.value = clampAmount(Number(input.value) + Number(button.dataset.exchangeStep), state.maxAffordable) || '';
        updateCost();
        haptic('light');
      });
    });
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
    feedback.textContent = '';
    haptic('heavy');

    try {
      const payload = await api('/api/exchange/buy', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      await playTransmute(Number(payload.amount) || 0);
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
