const REASONS = {
  already_started: 'Партия уже идёт.',
  not_lobby: 'Окно ставок уже закрыто.',
  not_playing: 'Раунд ещё не начался.',
  not_joined: 'Сначала присоединись к партии.',
  full: 'За столом уже максимум игроков.',
  invalid_bet: 'Ставка должна быть целым неотрицательным числом.',
  not_enough_gold: 'Для такой ставки недостаточно золота.',
  passed: 'Ты уже спасовал и больше не можешь брать карты.',
  finished: 'Раунд уже завершён.',
  deck_empty: 'В колоде закончились карты.',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}

function formatTime(ms) {
  const seconds = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  return `0:${String(seconds).padStart(2, '0')}`;
}

function cardHtml(card) {
  const red = /[♥♦]/.test(card);
  const [rank = '', suit = ''] = String(card).split(' ');
  return `<span class="point-card ${red ? 'red' : ''}"><b>${escapeHtml(rank)}</b><i>${escapeHtml(suit)}</i></span>`;
}

export async function openPoint21({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/point21');
  let pending = false;
  let pollTimer = null;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay point21-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass point21-panel">
      <header class="overlay-head">
        <div><div class="eyebrow">21 · SHARED TABLE</div><h2>Двадцать одно</h2></div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>
      <p class="overlay-copy">Общий стол чата. Колода, ставки, бот и выплаты считаются на сервере; браузер только показывает состояние.</p>
      <div data-point-content></div>
      <div class="point-feedback" data-point-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-point-content]');
  const feedback = overlay.querySelector('[data-point-feedback]');

  const close = () => {
    if (pollTimer) window.clearInterval(pollTimer);
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function playerRows(players = []) {
    return players.map(player => `
      <article class="point-player ${player.isBot ? 'bot' : ''} ${player.passed ? 'passed' : ''}">
        <div class="point-player-head">
          <div><strong>${escapeHtml(player.name)}</strong><small>${player.isBot ? 'BOT' : `ставка ${formatNumber(player.bet)}`}</small></div>
          <span>${player.passed ? 'ПАС' : `${player.points} очк.`}</span>
        </div>
        <div class="point-hand">${player.cards.length ? player.cards.map(cardHtml).join('') : '<em>Карты ещё не розданы</em>'}</div>
      </article>`).join('');
  }

  function idleView() {
    return `
      <section class="point-hero">
        <div class="point-deck">🂠</div>
        <div><small>ОБЩИЙ СТОЛ</small><strong>Новая партия</strong><p>После запуска будет 25 секунд на вход и ставки, затем сервер раздаст по две карты.</p></div>
      </section>
      <div class="point-balance"><span>Твой баланс</span><strong>🪙 ${formatNumber(state.gold)}</strong></div>
      <button type="button" class="point-primary" data-point-action="start"><span>♠</span><div><strong>Создать стол</strong><small>Ты сразу присоединишься</small></div></button>`;
  }

  function lobbyView() {
    const joined = state.me.joined;
    const quick = [100, 1000, 5000, 10000].filter(value => value <= state.gold);
    return `
      <section class="point-phase-card lobby">
        <div><small>СТАВКИ ЗАКРОЮТСЯ ЧЕРЕЗ</small><strong>${formatTime(state.remainingMs)}</strong></div>
        <span>${state.players.filter(player => !player.isBot).length} / ${state.maxPlayers}</span>
      </section>
      <div class="point-table">${playerRows(state.players)}</div>
      ${joined ? `
        <section class="point-bet-box">
          <div class="point-balance"><span>Твой баланс</span><strong>🪙 ${formatNumber(state.gold)}</strong></div>
          <label><span>Ставка</span><input type="number" min="0" step="1" max="${Math.floor(state.gold)}" value="${state.me.bet}" data-point-bet /></label>
          <div class="point-bet-chips">${quick.map(value => `<button type="button" data-point-quick="${value}">${formatNumber(value)}</button>`).join('')}${state.gold ? `<button type="button" data-point-quick="${Math.floor(state.gold)}">Всё</button>` : ''}</div>
          <div class="point-actions split"><button type="button" data-point-action="bet">Сохранить ставку</button><button type="button" class="ghost" data-point-action="leave">Выйти</button></div>
        </section>` : `
        <button type="button" class="point-primary" data-point-action="join"><span>＋</span><div><strong>Присоединиться</strong><small>До ${state.maxPlayers} игроков</small></div></button>`}`;
  }

  function playingView() {
    const canAct = state.me.joined && !state.me.passed;
    return `
      <section class="point-phase-card live">
        <div><small>ХОДЫ ЗАКРОЮТСЯ ЧЕРЕЗ</small><strong>${formatTime(state.remainingMs)}</strong></div>
        <span>LIVE</span>
      </section>
      <div class="point-table">${playerRows(state.players)}</div>
      ${state.me.joined ? `
        <section class="point-my-status">
          <span>Твоя рука</span><strong>${state.me.points} очк.</strong><small>${state.me.passed ? 'Ход завершён' : 'Можно взять карту или спасовать'}</small>
        </section>
        <div class="point-actions split">
          <button type="button" data-point-action="card" ${canAct ? '' : 'disabled'}>Взять карту</button>
          <button type="button" class="ghost" data-point-action="pass" ${canAct ? '' : 'disabled'}>Пас</button>
        </div>` : '<div class="point-watch">Ты наблюдаешь за этой партией.</div>'}`;
  }

  function resultView() {
    const results = state.result?.players || [];
    return `
      <section class="point-phase-card result">
        <div><small>ПАРТИЯ ЗАВЕРШЕНА</small><strong>Результаты</strong></div>
        <span>21</span>
      </section>
      <div class="point-results">
        ${results.map(player => `
          <article class="point-result-row ${player.won ? 'win' : 'lose'} ${player.isBot ? 'bot' : ''}">
            <div><strong>${escapeHtml(player.name)}</strong><small>${player.cards.map(escapeHtml).join(' · ')}</small></div>
            <div><b>${player.points}</b>${player.isBot ? '<small>BOT</small>' : `<small>${player.delta >= 0 ? '+' : ''}${formatNumber(player.delta)} 🪙</small>`}</div>
          </article>`).join('')}
      </div>
      <button type="button" class="point-primary" data-point-action="start"><span>↻</span><div><strong>Новая партия</strong><small>Открыть новый стол</small></div></button>`;
  }

  function bind() {
    content.querySelectorAll('[data-point-quick]').forEach(button => {
      button.addEventListener('click', () => {
        const input = content.querySelector('[data-point-bet]');
        if (input) input.value = button.dataset.pointQuick;
        haptic('light');
      });
    });

    content.querySelectorAll('[data-point-action]').forEach(button => {
      button.addEventListener('click', () => action(button.dataset.pointAction));
    });
  }

  async function refresh(silent = false) {
    if (pending || !overlay.isConnected) return;
    try {
      const next = await api('/api/point21');
      const changed = JSON.stringify(next) !== JSON.stringify(state);
      state = next;
      if (changed) renderAll();
      if (!silent) feedback.textContent = '';
    } catch (error) {
      if (!silent) feedback.textContent = error.message;
    }
  }

  async function action(name) {
    if (pending) return;
    const body = { action: name };
    if (name === 'bet') body.bet = content.querySelector('[data-point-bet]')?.value ?? '0';

    pending = true;
    overlay.classList.add('busy');
    feedback.textContent = 'Синхронизируем стол…';
    haptic(name === 'card' ? 'heavy' : 'medium');
    try {
      const payload = await api('/api/point21/action', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      state = payload.point21;
      if (payload.state) renderState(payload.state);
      feedback.textContent = name === 'card' && payload.card ? `Выпала карта ${payload.card}.` : '';
      statusElement.textContent = `21 очко: ${state.phase === 'finished' ? 'партия завершена' : 'стол обновлён'}.`;
      renderAll();
    } catch (error) {
      if (error.payload?.point21) state = error.payload.point21;
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
      renderAll();
      haptic('light');
    } finally {
      pending = false;
      overlay.classList.remove('busy');
    }
  }

  function renderAll() {
    const view = state.phase === 'lobby' ? lobbyView()
      : state.phase === 'playing' ? playingView()
        : state.phase === 'finished' ? resultView()
          : idleView();
    content.innerHTML = view;
    bind();
  }

  renderAll();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  pollTimer = window.setInterval(() => refresh(true), 1500);
}
