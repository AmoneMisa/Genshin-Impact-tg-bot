const REASONS = {
  invalid_bet: 'Ставка должна быть целым неотрицательным числом.',
  not_enough_gold: 'Ставка не может быть больше текущего баланса.',
  already_started: 'Эта игра уже запущена.',
  not_started: 'Сначала запусти игру.',
  finished: 'Раунд уже завершён.',
};

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function openArcadeGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/arcade');
  let selected = state.games.find(game => game.active)?.id || 'dice';
  let pending = false;
  let lastResult = null;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay arcade-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass arcade-panel">
      <header class="overlay-head">
        <div><div class="eyebrow">ARCADE · SERVER RNG</div><h2>Мини-игры</h2></div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>
      <div data-arcade-content></div>
      <div class="arcade-feedback" data-arcade-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-arcade-content]');
  const feedback = overlay.querySelector('[data-arcade-feedback]');

  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function currentGame() {
    return state.games.find(game => game.id === selected) || state.games[0];
  }

  function resultBanner(result) {
    if (!result) return '';
    return `
      <section class="arcade-result ${result.won ? 'win' : 'lose'}">
        <span>${result.won ? '🏆' : '🫥'}</span>
        <div>
          <strong>${result.won ? `Победа · +${formatNumber(result.reward)} золота` : 'Раунд проигран'}</strong>
          <small>Итог: ${formatNumber(result.score)} · диапазон победы ${result.winRange.min}–${result.winRange.max}${result.won ? ` · ×${result.multiplier}` : ''}</small>
        </div>
      </section>`;
  }

  function gameTabs() {
    return state.games.map(game => `
      <button type="button" class="arcade-tab ${game.id === selected ? 'active' : ''}" data-game="${game.id}">
        <span>${game.icon}</span><strong>${escapeHtml(game.title)}</strong>${game.active ? '<i>LIVE</i>' : ''}
      </button>`).join('');
  }

  function betControls(game) {
    const suggested = [100, 1000, 5000].filter(value => value <= state.gold);
    return `
      <div class="arcade-bet-box">
        <label><span>База выигрыша</span><input type="number" min="0" step="1" max="${Math.floor(state.gold)}" value="${Math.min(100, Math.floor(state.gold))}" data-arcade-bet /></label>
        <div class="arcade-bet-chips">
          ${suggested.map(value => `<button type="button" data-bet-value="${value}">${formatNumber(value)}</button>`).join('')}
          <button type="button" data-bet-value="${Math.floor(state.gold)}">Всё</button>
        </div>
        <small>Сохраняем экономику старого бота: сумма ограничена балансом, но не списывается; при победе начисляется награда от этой суммы.</small>
      </div>
      <button type="button" class="arcade-primary" data-arcade-start><span>${game.icon}</span><div><strong>Начать раунд</strong><small>${game.maxRolls} ${game.maxRolls === 2 ? 'броска' : 'броска'} · победа при ${game.winRange.min}–${game.winRange.max}</small></div></button>`;
  }

  function activeControls(game) {
    return `
      <section class="arcade-score-card">
        <div><small>СЧЁТ</small><strong>${formatNumber(game.score)}</strong></div>
        <div><small>БРОСКИ</small><strong>${game.rolls} / ${game.maxRolls}</strong></div>
        <div><small>БАЗА</small><strong>${formatNumber(game.bet)}</strong></div>
      </section>
      <div class="arcade-progress"><span style="width:${Math.min(100, game.rolls / game.maxRolls * 100)}%"></span></div>
      <button type="button" class="arcade-primary roll" data-arcade-roll>
        <span class="arcade-roll-icon">${game.icon}</span>
        <div><strong>Бросить</strong><small>Осталось: ${game.rollsLeft} · RNG выполняется на сервере</small></div>
      </button>`;
  }

  function bind() {
    content.querySelectorAll('[data-game]').forEach(button => {
      button.addEventListener('click', () => {
        selected = button.dataset.game;
        lastResult = null;
        haptic('light');
        renderAll();
      });
    });

    content.querySelectorAll('[data-bet-value]').forEach(button => {
      button.addEventListener('click', () => {
        const input = content.querySelector('[data-arcade-bet]');
        if (input) input.value = button.dataset.betValue;
        haptic('light');
      });
    });

    content.querySelector('[data-arcade-start]')?.addEventListener('click', start);
    content.querySelector('[data-arcade-roll]')?.addEventListener('click', roll);
    content.querySelector('[data-arcade-refresh]')?.addEventListener('click', refresh);
  }

  async function refresh() {
    if (pending) return;
    haptic('light');
    state = await api('/api/arcade');
    renderAll();
  }

  async function start() {
    if (pending) return;
    const input = content.querySelector('[data-arcade-bet]');
    const bet = Number(input?.value ?? 0);
    pending = true;
    overlay.classList.add('busy');
    feedback.textContent = 'Запускаем раунд…';
    haptic('medium');
    try {
      const payload = await api('/api/arcade/start', {
        method: 'POST',
        body: JSON.stringify({ gameId: selected, bet }),
      });
      state = payload.arcade;
      if (payload.state) renderState(payload.state);
      lastResult = null;
      feedback.textContent = 'Раунд начат.';
      renderAll();
    } catch (error) {
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
      if (error.payload?.arcade) state = error.payload.arcade;
      renderAll();
    } finally {
      pending = false;
      overlay.classList.remove('busy');
    }
  }

  async function roll() {
    if (pending) return;
    pending = true;
    overlay.classList.add('busy', 'rolling');
    feedback.textContent = 'Генерируем результат на сервере…';
    haptic('heavy');
    try {
      const payload = await api('/api/arcade/roll', {
        method: 'POST',
        body: JSON.stringify({ gameId: selected }),
      });
      state = payload.arcade;
      if (payload.state) renderState(payload.state);
      lastResult = payload.result || null;
      feedback.textContent = payload.finished
        ? (payload.result.won ? `Победа: +${formatNumber(payload.result.reward)} золота.` : 'Раунд завершён без выигрыша.')
        : `Выпало ${payload.value}.`;
      statusElement.textContent = payload.finished ? `Аркада: ${feedback.textContent}` : `Аркада: выпало ${payload.value}.`;
      renderAll();
    } catch (error) {
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
      if (error.payload?.arcade) state = error.payload.arcade;
      renderAll();
      haptic('light');
    } finally {
      pending = false;
      overlay.classList.remove('busy', 'rolling');
    }
  }

  function renderAll() {
    const game = currentGame();
    content.innerHTML = `
      <div class="arcade-tabs">${gameTabs()}</div>
      ${resultBanner(lastResult)}
      <section class="arcade-hero">
        <div class="arcade-big-icon">${game.icon}</div>
        <div><small>${escapeHtml(game.title).toUpperCase()}</small><strong>${game.active ? 'Раунд идёт' : 'Готов к игре'}</strong><p>Победный итог: ${game.winRange.min}–${game.winRange.max}. За один бросок выпадает 1–${game.maxValue}.</p></div>
        <button type="button" data-arcade-refresh aria-label="Обновить">↻</button>
      </section>
      <div class="arcade-balance"><span>Доступный баланс</span><strong>🪙 ${formatNumber(state.gold)}</strong></div>
      ${game.active ? activeControls(game) : betControls(game)}`;
    bind();
  }

  renderAll();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
