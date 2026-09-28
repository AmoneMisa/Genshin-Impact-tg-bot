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

/** A playing card; `fresh` cards are dealt in with a flip from the deck. */
export function cardHtml(card, { fresh = false, delay = 0 } = {}) {
  const red = /[♥♦]/.test(card);
  const [rank = '', suit = ''] = String(card).split(' ');
  const corner = `<b>${escapeHtml(rank)}<i>${escapeHtml(suit)}</i></b>`;
  return `<span class="point-card ${red ? 'red' : ''} ${fresh ? 'fresh' : ''}" style="--d:${delay}ms">${corner}<em>${escapeHtml(suit)}</em>${corner}</span>`;
}

export function cardBackHtml(delay = 0) {
  return `<span class="point-card back fresh" style="--d:${delay}ms" aria-label="Закрытая карта"><em>🌳</em></span>`;
}

export const BET_CHIPS = Object.freeze([100, 500, 1000]);
export const BET_STEP = 100;

/** Clamp a bet to [0, gold] in whole coins. */
export function clampBet(value, gold) {
  const bet = Math.floor(Number(value) || 0);
  return Math.max(0, Math.min(Math.floor(Number(gold) || 0), bet));
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
      <header class="point-head">
        <button class="overlay-close point-round" type="button" aria-label="Закрыть">←</button>
        <h2>21 очко</h2>
        <button class="point-round" type="button" data-point-help aria-label="Правила">?</button>
      </header>
      <p class="point-rules">Набери больше очков, чем бот, но не больше 21. Ровно 21 — ×3 к ставке.</p>
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
  overlay.querySelector('[data-point-help]').addEventListener('click', () => overlay.querySelector('.point-rules').classList.toggle('open'));

  // Cards already on screen per player, so only newly dealt ones animate.
  const seen = new Map();
  function hand(id, cards = [], { hidden = 0 } = {}) {
    const known = seen.get(id) || 0;
    const html = cards.map((card, index) => cardHtml(card, { fresh: index >= known, delay: Math.max(0, index - known) * 140 })).join('')
      + Array.from({ length: hidden }, (_, index) => cardBackHtml((cards.length - known + index) * 140)).join('');
    seen.set(id, cards.length);
    return `<div class="point-hand">${html || '<em class="point-hand-empty">Карты ещё не розданы</em>'}</div>`;
  }

  function seat(title, points, cards, id, options = {}) {
    return `
      <section class="point-seat ${options.mine ? 'mine' : 'bot'} ${options.passed ? 'passed' : ''}">
        <header><strong>${escapeHtml(title)}</strong><span class="point-score ${points > 21 ? 'bust' : points === 21 ? 'exact' : ''}">${points}</span></header>
        ${hand(id, cards, options)}
      </section>`;
  }

  function others(players) {
    const list = players.filter(player => !player.isBot && player.id !== state.me.id);
    if (!list.length) return '';
    return `<div class="point-others">${list.map(player => `
      <span class="point-other ${player.passed ? 'passed' : ''}"><strong>${escapeHtml(player.name)}</strong><small>${player.cards.length ? `${player.points} очк.` : `ставка ${formatNumber(player.bet)}`}${player.passed ? ' · пас' : ''}</small></span>`).join('')}</div>`;
  }

  function timerBar(label) {
    return `<div class="point-timer"><small>${label}</small><strong data-point-timer>${formatTime(state.remainingMs)}</strong></div>`;
  }

  function idleView() {
    return `
      <div class="point-felt idle">
        <div class="point-deck-stack" aria-hidden="true"><span></span><span></span><span></span></div>
        <strong>Новая партия</strong>
        <p>25 секунд на вход и ставки, затем сервер раздаст по две карты.</p>
      </div>
      <div class="point-wallet">Баланс <strong>🪙 ${formatNumber(state.gold)}</strong></div>
      <button type="button" class="point-btn gold" data-point-action="start">Создать стол</button>`;
  }

  function lobbyView() {
    const joined = state.me.joined;
    const humans = state.players.filter(player => !player.isBot);
    return `
      ${timerBar(`Ставки · ${humans.length} / ${state.maxPlayers} игроков`)}
      <div class="point-felt">
        <div class="point-lobby-seats">${humans.map(player => `<span class="point-other ${player.id === state.me.id ? 'me' : ''}"><strong>${escapeHtml(player.name)}</strong><small>ставка ${formatNumber(player.bet)}</small></span>`).join('')}</div>
      </div>
      ${joined ? `
        <section class="point-bet">
          <div class="point-stepper">
            <button type="button" data-point-step="-1" aria-label="Уменьшить ставку">−</button>
            <input type="number" inputmode="numeric" min="0" step="1" max="${Math.floor(state.gold)}" value="${state.me.bet}" data-point-bet aria-label="Ставка" />
            <button type="button" data-point-step="1" aria-label="Увеличить ставку">+</button>
          </div>
          <div class="point-chips">${BET_CHIPS.map(value => `<button type="button" data-point-quick="${value}" ${value > state.gold ? 'disabled' : ''}>${formatNumber(value)}</button>`).join('')}<button type="button" data-point-quick="${Math.floor(state.gold)}">Всё</button></div>
          <div class="point-wallet">Баланс <strong>🪙 ${formatNumber(state.gold)}</strong></div>
          <div class="point-actions"><button type="button" class="point-btn gold" data-point-action="bet">Сохранить ставку</button><button type="button" class="point-btn ghost" data-point-action="leave">Выйти</button></div>
        </section>` : `
        <button type="button" class="point-btn gold" data-point-action="join">Присоединиться</button>`}`;
  }

  function playingView() {
    const bot = state.players.find(player => player.isBot);
    const canAct = state.me.joined && !state.me.passed;
    return `
      ${timerBar('Ходы закроются через')}
      <div class="point-felt">
        ${bot ? seat(bot.name || 'Бот', bot.points, bot.cards, 'bot', { hidden: bot.cards.length ? 0 : 2 }) : ''}
        ${others(state.players)}
        ${state.me.joined
          ? seat(state.me.passed ? 'Ход завершён' : 'Ваш ход', state.me.points, state.me.cards, state.me.id, { mine: true, passed: state.me.passed })
          : '<div class="point-watch">Ты наблюдаешь за этой партией.</div>'}
      </div>
      ${state.me.joined ? `
        <div class="point-actions">
          <button type="button" class="point-btn blue" data-point-action="card" ${canAct ? '' : 'disabled'}>Взять карту</button>
          <button type="button" class="point-btn red" data-point-action="pass" ${canAct ? '' : 'disabled'}>Пас</button>
        </div>` : ''}`;
  }

  function resultView() {
    const results = state.result?.players || [];
    const mine = results.find(player => player.id === state.me.id);
    return `
      ${mine ? `<div class="point-verdict ${mine.won ? 'win' : 'lose'}"><strong>${mine.won ? (mine.exact21 ? 'Ровно 21!' : 'Победа!') : 'Поражение'}</strong><small>${mine.delta >= 0 ? '+' : ''}${formatNumber(mine.delta)} 🪙</small></div>` : ''}
      <div class="point-felt results">
        ${results.map(player => `
          <article class="point-result ${player.won ? 'win' : 'lose'} ${player.isBot ? 'bot' : ''} ${player.id === state.me.id ? 'me' : ''}">
            <header><strong>${escapeHtml(player.name)}</strong><span class="point-score ${player.points > 21 ? 'bust' : player.points === 21 ? 'exact' : ''}">${player.points}</span></header>
            <div class="point-hand mini">${player.cards.map(card => cardHtml(card)).join('')}</div>
            ${player.isBot ? '' : `<small>${player.delta >= 0 ? '+' : ''}${formatNumber(player.delta)} 🪙</small>`}
          </article>`).join('')}
      </div>
      <button type="button" class="point-btn gold" data-point-action="start">Новая партия</button>`;
  }

  function bind() {
    content.querySelectorAll('[data-point-quick]').forEach(button => {
      button.addEventListener('click', () => {
        const input = content.querySelector('[data-point-bet]');
        if (input) input.value = clampBet(button.dataset.pointQuick, state.gold);
        haptic('light');
      });
    });
    content.querySelectorAll('[data-point-step]').forEach(button => {
      button.addEventListener('click', () => {
        const input = content.querySelector('[data-point-bet]');
        if (input) input.value = clampBet(Number(input.value) + Number(button.dataset.pointStep) * BET_STEP, state.gold);
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
    const typing = content.querySelector('[data-point-bet]');
    const draft = typing && document.activeElement === typing ? typing.value : null;
    const view = state.phase === 'lobby' ? lobbyView()
      : state.phase === 'playing' ? playingView()
        : state.phase === 'finished' ? resultView()
          : idleView();
    content.innerHTML = view;
    if (draft !== null) {
      const input = content.querySelector('[data-point-bet]');
      if (input) { input.value = draft; input.focus(); }
    }
    bind();
  }

  renderAll();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  pollTimer = window.setInterval(() => refresh(true), 1500);
  const tick = window.setInterval(() => {
    if (!overlay.isConnected) { window.clearInterval(tick); return; }
    state.remainingMs = Math.max(0, (Number(state.remainingMs) || 0) - 250);
    const node = content.querySelector('[data-point-timer]');
    if (node) node.textContent = formatTime(state.remainingMs);
  }, 250);
}
