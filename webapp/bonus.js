function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}

export async function openBonusGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/bonus');
  let lastPrize = null;
  let pending = false;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay bonus-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass utility-panel">
      <header class="overlay-head">
        <div><div class="eyebrow">DAILY · SERVER RNG</div><h2>Ежедневный бонус</h2></div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>
      <p class="overlay-copy">Награда выбирается только на сервере. Попытки восстанавливаются ежедневным игровым сбросом.</p>
      <div data-bonus-content></div>
      <div class="utility-feedback" data-bonus-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-bonus-content]');
  const feedback = overlay.querySelector('[data-bonus-feedback]');

  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function render() {
    content.innerHTML = `
      <section class="utility-card">
        <h3>Попыток сегодня: ${state.chances}</h3>
        <p>Шансы и диапазоны сохранены из старой команды /bonus.</p>
        <div class="bonus-balance">
          <article><span>🪙</span><strong>${formatNumber(state.balances.gold)}</strong></article>
          <article><span>💎</span><strong>${formatNumber(state.balances.crystals)}</strong></article>
          <article><span>⛏️</span><strong>${formatNumber(state.balances.ironOre)}</strong></article>
        </div>
      </section>
      ${lastPrize ? `<section class="bonus-win"><span>${lastPrize.icon}</span><strong>+${formatNumber(lastPrize.amount)} ${lastPrize.label}</strong></section>` : ''}
      <section class="bonus-prizes">
        ${state.prizes.map(prize => `
          <article class="bonus-prize">
            <span>${prize.icon}</span>
            <div><strong>${prize.label}</strong><small>${formatNumber(prize.minAmount)}–${formatNumber(prize.maxAmount)}</small></div>
            <b>${prize.chance}%</b>
          </article>`).join('')}
      </section>
      <button class="utility-action" type="button" data-bonus-claim ${state.chances <= 0 || pending ? 'disabled' : ''}>Получить бонус</button>`;

    content.querySelector('[data-bonus-claim]')?.addEventListener('click', claim);
  }

  async function claim() {
    if (pending || state.chances <= 0) return;
    pending = true;
    feedback.textContent = 'Выбираем награду на сервере…';
    haptic('heavy');
    render();
    try {
      const payload = await api('/api/bonus/claim', { method: 'POST' });
      state = payload.bonus;
      lastPrize = payload.prize;
      feedback.textContent = `Получено: +${formatNumber(lastPrize.amount)} ${lastPrize.label}`;
      statusElement.textContent = `Бонус: ${lastPrize.icon} +${formatNumber(lastPrize.amount)} ${lastPrize.label}`;
      if (payload.state) renderState(payload.state);
      haptic('medium');
    } catch (error) {
      if (error.payload?.bonus) state = error.payload.bonus;
      feedback.textContent = error.payload?.reason === 'no_chances'
        ? 'Попытки на сегодня закончились.'
        : error.message;
      haptic('light');
    } finally {
      pending = false;
      render();
    }
  }

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
