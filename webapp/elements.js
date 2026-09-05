const REASONS = {
  already_started: 'Игра уже идёт.',
  not_join_phase: 'Окно входа уже закрыто.',
  not_betting: 'Сейчас нельзя менять ставку.',
  not_playing: 'Раунд ещё не начался.',
  not_joined: 'Ты не участвуешь в этой игре.',
  full: 'Стол уже заполнен.',
  invalid_bet: 'Ставка должна быть целым неотрицательным числом.',
  not_enough_gold: 'Недостаточно золота для такой ставки.',
  already_drew: 'В этом раунде ты уже получил стихию.',
  finished: 'Игра уже закончена.',
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

function elementIcon(element) {
  return String(element || '').split(' ')[0] || '✦';
}

export async function openElementsGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/elements');
  let pending = false;
  let pollTimer = null;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay elements-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass elements-panel">
      <header class="overlay-head">
        <div><div class="eyebrow">ELEMENTS · SHARED TABLE</div><h2>Стихии</h2></div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>
      <p class="overlay-copy">Собирай четыре стихии за три раунда. Повторы и реакции дают очки; RNG и выплаты считаются только на сервере.</p>
      <div data-elements-content></div>
      <div class="elements-feedback" data-elements-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-elements-content]');
  const feedback = overlay.querySelector('[data-elements-feedback]');

  const close = () => {
    if (pollTimer) window.clearInterval(pollTimer);
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function playerList() {
    return `
      <div class="elements-players">
        ${state.players.map(player => `
          <article class="elements-player ${player.isBot ? 'bot' : ''} ${player.drewThisRound ? 'done' : ''}">
            <header><div><strong>${escapeHtml(player.name)}</strong><small>${player.isBot ? 'BOT' : `ставка ${formatNumber(player.bet)}`}</small></div><b>${player.points} pt</b></header>
            <div class="elements-hand">
              ${player.elements.length ? player.elements.map(element => `<span title="${escapeHtml(element)}">${escapeHtml(elementIcon(element))}</span>`).join('') : '<em>—</em>'}
            </div>
          </article>`).join('')}
      </div>`;
  }

  function idleView() {
    return `
      <section class="elements-hero">
        <div class="elements-orbit"><span>🔥</span><span>❄️</span><span>⚡️</span><strong>✦</strong></div>
        <div><small>МУЛЬТИПЛЕЕР</small><strong>Новый стол стихий</strong><p>15 секунд на вход, затем 25 секунд на ставки. После старта у каждого будет три хода.</p></div>
      </section>
      <div class="elements-balance"><span>Твой баланс</span><strong>🪙 ${formatNumber(state.gold)}</strong></div>
      <button class="elements-primary" type="button" data-elements-action="start"><span>✦</span><div><strong>Создать игру</strong><small>Ты сразу войдёшь за стол</small></div></button>`;
  }

  function joinView() {
    return `
      <section class="elements-phase join"><div><small>ВХОД ЗАКРОЕТСЯ ЧЕРЕЗ</small><strong>${formatTime(state.remainingMs)}</strong></div><span>${state.players.filter(player => !player.isBot).length} / ${state.maxPlayers}</span></section>
      ${playerList()}
      ${state.me.joined
        ? '<button class="elements-secondary" type="button" data-elements-action="leave">Покинуть стол</button>'
        : '<button class="elements-primary" type="button" data-elements-action="join"><span>＋</span><div><strong>Присоединиться</strong><small>Успей до закрытия входа</small></div></button>'}`;
  }

  function bettingView() {
    const quick = [100, 1000, 5000, 10000].filter(value => value <= state.gold);
    return `
      <section class="elements-phase betting"><div><small>СТАВКИ ЗАКРОЮТСЯ ЧЕРЕЗ</small><strong>${formatTime(state.remainingMs)}</strong></div><span>BET</span></section>
      ${playerList()}
      ${state.me.joined ? `
        <section class="elements-bet-box">
          <div class="elements-balance"><span>Твой баланс</span><strong>🪙 ${formatNumber(state.gold)}</strong></div>
          <label><span>Ставка</span><input type="number" min="0" step="1" max="${Math.floor(state.gold)}" value="${state.me.bet}" data-elements-bet /></label>
          <div class="elements-bet-chips">${quick.map(value => `<button type="button" data-elements-quick="${value}">${formatNumber(value)}</button>`).join('')}${state.gold ? `<button type="button" data-elements-quick="${Math.floor(state.gold)}">Всё</button>` : ''}</div>
          <button class="elements-secondary accent" type="button" data-elements-action="bet">Сохранить ставку</button>
        </section>` : '<div class="elements-watch">Ты не успел войти и сейчас наблюдаешь за партией.</div>'}`;
  }

  function playingView() {
    const canDraw = state.me.joined && !state.me.drewThisRound;
    return `
      <section class="elements-phase live"><div><small>РАУНД ${state.round} / ${state.maxRounds}</small><strong>${formatTime(state.remainingMs)}</strong></div><span>LIVE</span></section>
      ${playerList()}
      ${state.me.joined ? `
        <section class="elements-me">
          <div><span>Твои очки</span><strong>${state.me.points}</strong></div>
          <div class="elements-me-hand">${state.me.elements.map(element => `<span><b>${escapeHtml(elementIcon(element))}</b><small>${escapeHtml(String(element).replace(/^\S+\s*/, ''))}</small></span>`).join('')}</div>
        </section>
        <button class="elements-primary draw" type="button" data-elements-action="draw" ${canDraw ? '' : 'disabled'}><span>✦</span><div><strong>${canDraw ? 'Получить стихию' : 'Ход сделан'}</strong><small>${canDraw ? 'Результат определит сервер' : 'Ждём остальных игроков'}</small></div></button>` : '<div class="elements-watch">Ты наблюдаешь за партией.</div>'}`;
  }

  function resultView() {
    const players = state.result?.players || [];
    return `
      <section class="elements-phase result"><div><small>ИГРА ЗАВЕРШЕНА</small><strong>Результаты</strong></div><span>✦</span></section>
      <div class="elements-results">
        ${players.sort((a, b) => b.points - a.points).map(player => `
          <article class="elements-result ${player.won ? 'win' : ''}">
            <div><strong>${escapeHtml(player.name)}</strong><span>${player.elements.map(element => escapeHtml(elementIcon(element))).join(' ')}</span></div>
            <div><b>${player.points}</b>${player.isBot ? '<small>BOT</small>' : `<small>${player.delta >= 0 ? '+' : ''}${formatNumber(player.delta)} 🪙</small>`}</div>
          </article>`).join('')}
      </div>
      <button class="elements-primary" type="button" data-elements-action="start"><span>↻</span><div><strong>Новая игра</strong><small>Открыть новый стол</small></div></button>`;
  }

  function bind() {
    content.querySelectorAll('[data-elements-quick]').forEach(button => {
      button.addEventListener('click', () => {
        const input = content.querySelector('[data-elements-bet]');
        if (input) input.value = button.dataset.elementsQuick;
        haptic('light');
      });
    });
    content.querySelectorAll('[data-elements-action]').forEach(button => {
      button.addEventListener('click', () => action(button.dataset.elementsAction));
    });
  }

  async function action(name) {
    if (pending) return;
    const body = { action: name };
    if (name === 'bet') body.bet = content.querySelector('[data-elements-bet]')?.value ?? '0';

    pending = true;
    overlay.classList.add('busy');
    feedback.textContent = 'Синхронизируем игру…';
    haptic(name === 'draw' ? 'heavy' : 'medium');
    try {
      const payload = await api('/api/elements/action', { method: 'POST', body: JSON.stringify(body) });
      state = payload.elements;
      if (payload.state) renderState(payload.state);
      feedback.textContent = name === 'draw' && payload.element ? `Твоя стихия: ${payload.element}` : '';
      statusElement.textContent = state.phase === 'finished' ? 'Стихии: партия завершена.' : 'Стихии: стол обновлён.';
      renderAll();
    } catch (error) {
      if (error.payload?.elements) state = error.payload.elements;
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
      haptic('light');
      renderAll();
    } finally {
      pending = false;
      overlay.classList.remove('busy');
    }
  }

  async function refresh() {
    if (pending || !overlay.isConnected) return;
    try {
      const next = await api('/api/elements');
      if (JSON.stringify(next) !== JSON.stringify(state)) {
        state = next;
        renderAll();
      }
    } catch {}
  }

  function renderAll() {
    content.innerHTML = state.phase === 'join' ? joinView()
      : state.phase === 'betting' ? bettingView()
        : state.phase === 'playing' ? playingView()
          : state.phase === 'finished' ? resultView()
            : idleView();
    bind();
  }

  renderAll();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  pollTimer = window.setInterval(refresh, 1500);
}
