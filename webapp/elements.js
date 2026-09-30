// Elements as a shared table: registration (join, then bets) with seats and a
// countdown ring, play with every opponent as a compact seat tile and your
// own seat pinned at the bottom, results as seats with payouts.
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
  no_game: 'Стол уже пуст.',
  not_stuck: 'Стол работает — сбросить можно, только если он завис.',
  in_table_game: 'Ты уже сидишь за другим столом — ставка здесь недоступна, пока та партия не закончится.',
};

/** Seat status for elements: drew this round or still thinking. */
export function seatStatusElements(player, phase) {
  if (phase === 'join') return { text: 'за столом', tone: 'ok' };
  if (phase === 'betting') return player.bet > 0 ? { text: 'ставка сделана', tone: 'ok' } : { text: 'без ставки', tone: 'wait' };
  if (player.isBot) return { text: 'дилер', tone: 'wait' };
  return player.drewThisRound ? { text: 'ход сделан', tone: 'ok' } : { text: 'выбирает', tone: 'wait' };
}

function chips(elements = []) {
  return elements.length ? elements.map(element => elementChip(element)).join('') : '<em class="seat-none">—</em>';
}

import {
  betControls, bindBetControls, emptySeat, escapeHtml, formatNumber,
  resetBanner, seatGrid, seatTile, tickTimers, timerRing,
} from './table-seats.js';

function elementIcon(element) {
  return String(element || '').split(' ')[0] || '✦';
}

const ELEMENT_TONES = { 'Пиро': 'pyro', 'Крио': 'cryo', 'Анемо': 'anemo', 'Электро': 'electro', 'Гидро': 'hydro', 'Гео': 'geo', 'Дендро': 'dendro' };
export const ELEMENT_RING = ['🔥 Пиро', '❄️ Крио', '💨 Анемо', '⚡️ Электро', '💧 Гидро', '🗿 Гео', '🌿 Дендро'];

/** Colour family of an element string like "🔥 Пиро". */
export function elementTone(element) {
  const name = String(element || '').replace(/^\S+\s*/, '').trim();
  return ELEMENT_TONES[name] || 'neutral';
}

export function elementChip(element, extra = '') {
  return `<span class="el-chip tone-${elementTone(element)} ${extra}" title="${escapeHtml(element)}">${escapeHtml(elementIcon(element))}</span>`;
}

const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));

export async function openElementsGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/elements');
  let pending = false;
  let pollTimer = null;
  let tickTimer = null;
  let resetArmed = false;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay elements-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass elements-panel">
      <header class="elements-head">
        <button class="overlay-close elements-round" type="button" aria-label="Закрыть">←</button>
        <h2>Стихии</h2>
        <span class="elements-round" aria-hidden="true">✦</span>
      </header>
      <p class="elements-rules">Собери стихии за три раунда: повторы и реакции дают очки.</p>
      <section class="elements-altar" hidden aria-hidden="true"></section>
      <div data-elements-content></div>
      <div class="elements-feedback" data-elements-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-elements-content]');
  const altar = overlay.querySelector('.elements-altar');

  // The seven runes race around the altar, the drawn one lands in the centre.
  async function playDraw(element) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    altar.className = `elements-altar tone-${elementTone(element)}`;
    altar.innerHTML = `
      <div class="el-ring">${ELEMENT_RING.map((rune, i) => `<span class="tone-${elementTone(rune)}" style="--i:${i}">${elementIcon(rune)}</span>`).join('')}</div>
      <div class="el-core">${elementChip(element, 'huge')}</div>
      <div class="el-burst"></div>
      <strong class="el-name">${escapeHtml(String(element).replace(/^\S+\s*/, ''))}</strong>`;
    altar.hidden = false;
    requestAnimationFrame(() => altar.classList.add('spinning'));
    await wait(1100);
    altar.classList.add('landed');
    haptic('heavy');
    await wait(1000);
    altar.classList.add('leaving');
    await wait(250);
    altar.hidden = true;
    altar.innerHTML = '';
  }
  const feedback = overlay.querySelector('[data-elements-feedback]');

  const close = () => {
    window.clearInterval(pollTimer);
    window.clearInterval(tickTimer);
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function humans() {
    return state.players.filter(player => !player.isBot);
  }

  function registration(label) {
    const seated = humans();
    const free = Math.max(0, (state.maxPlayers || 6) - seated.length);
    const joining = state.phase === 'join';
    return `
      ${timerRing(state.remainingMs, state.phaseMs, `${label} · ${seated.length} / ${state.maxPlayers} за столом`)}
      ${seatGrid([
        ...seated.map(player => seatTile(player, { you: player.id === state.me.id, status: seatStatusElements(player, state.phase) })),
        ...(joining ? Array.from({ length: free }, emptySeat) : []),
      ], { className: 'registration' })}
      ${state.me.joined
        ? joining
          ? `<p class="table-note">Ставки откроются, когда закроется запись.</p>
             <button type="button" class="table-btn ghost" data-elements-action="leave">Встать из-за стола</button>`
          : betControls(state.gold, state.me.bet)
        : joining && free > 0
          ? '<button type="button" class="table-btn gold" data-elements-action="join">Сесть за стол</button>'
          : '<div class="elements-watch">Запись закрыта — ты наблюдаешь за партией.</div>'}`;
  }

  function idleView() {
    return `
      <section class="elements-hero">
        <div class="elements-orbit">${ELEMENT_RING.map((element, i) => `<span class="tone-${elementTone(element)}" style="--i:${i}">${elementIcon(element)}</span>`).join('')}<strong>✦</strong></div>
        <div><small>Общий стол</small><strong>Стол свободен</strong><p>15 секунд на запись, затем 25 секунд на ставки и три раунда. До ${state.maxPlayers || 6} игроков.</p></div>
      </section>
      <div class="table-wallet">Баланс 🪙 ${formatNumber(state.gold)}</div>
      <button class="table-btn gold" type="button" data-elements-action="start">Открыть стол</button>`;
  }

  function playingView() {
    const canDraw = state.me.joined && !state.me.drewThisRound;
    const others = state.players.filter(player => player.id !== state.me.id);
    return `
      ${timerRing(state.remainingMs, state.phaseMs, `Раунд ${state.round} / ${state.maxRounds}`)}
      ${seatGrid(others.map(player => seatTile(player, {
        score: player.points,
        status: seatStatusElements(player, 'playing'),
        hand: chips(player.elements),
      })))}
      ${state.me.joined ? `
        <section class="table-me">
          <header><strong>${canDraw ? 'Твой ход' : 'Ход сделан'}</strong><b class="seat-score">${state.me.points}</b></header>
          <div class="elements-me-hand">${state.me.elements.map(element => `<span class="tone-${elementTone(element)}">${elementChip(element, 'large')}<small>${escapeHtml(String(element).replace(/^\S+\s*/, ''))}</small></span>`).join('')}</div>
          <button class="table-btn violet" type="button" data-elements-action="draw" ${canDraw ? '' : 'disabled'}>${canDraw ? 'Получить стихию' : 'Ждём остальных игроков'}</button>
          <small class="table-note">Ставка ${formatNumber(state.me.bet)} 🪙</small>
        </section>` : '<div class="elements-watch">Ты наблюдаешь за партией.</div>'}`;
  }

  function resultView() {
    const players = [...(state.result?.players || [])].sort((a, b) => b.points - a.points);
    const look = new Map(state.players.map(player => [player.id, player]));
    const mine = players.find(player => player.id === state.me.id);
    return `
      ${mine ? `<div class="point-verdict ${mine.won ? 'win' : 'lose'}"><strong>${mine.won ? 'Победа!' : 'Поражение'}</strong><small>${mine.bet > 0 ? `${mine.delta >= 0 ? '+' : ''}${formatNumber(mine.delta)} 🪙` : 'Игра без ставки'}</small></div>` : ''}
      ${seatGrid(players.map(player => seatTile({ ...look.get(player.id), ...player }, {
        you: player.id === state.me.id,
        score: player.points,
        status: player.isBot ? { text: 'дилер', tone: 'wait' } : { text: player.won ? 'победа' : 'проигрыш', tone: player.won ? 'win' : 'lose' },
        delta: player.isBot ? null : player.delta,
        hand: chips(player.elements),
      })), { className: 'results' })}
      <button class="table-btn gold" type="button" data-elements-action="start">Новая игра</button>`;
  }

  async function action(name) {
    if (pending) return;
    if (name === 'reset' && !resetArmed) {
      resetArmed = true;
      haptic('medium');
      renderAll();
      return;
    }
    const body = { action: name };
    if (name === 'bet') body.bet = content.querySelector('[data-table-bet]')?.value || '0';

    pending = true;
    overlay.classList.add('busy');
    feedback.textContent = '';
    haptic(name === 'draw' ? 'heavy' : 'medium');
    try {
      const payload = await api('/api/elements/action', { method: 'POST', body: JSON.stringify(body) });
      if (name === 'draw' && payload.element) await playDraw(payload.element);
      state = payload.elements;
      if (payload.state) renderState(payload.state);
      feedback.textContent = name === 'draw' && payload.element ? `Твоя стихия: ${payload.element}`
        : name === 'reset' ? 'Стол сброшен.' : name === 'bet' ? (Number(body.bet) > 0 ? `Ставка ${formatNumber(body.bet)} 🪙 принята.` : 'Играешь без ставки.') : '';
      statusElement.textContent = state.phase === 'finished' ? 'Стихии: партия завершена.' : 'Стихии: стол обновлён.';
      renderAll();
    } catch (error) {
      if (error.payload?.elements) state = error.payload.elements;
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
      haptic('light');
      renderAll();
    } finally {
      resetArmed = false;
      pending = false;
      overlay.classList.remove('busy');
    }
  }

  async function refresh() {
    if (pending || !overlay.isConnected) return;
    try {
      const next = await api('/api/elements');
      // The countdown ticks locally; only real table changes re-render.
      if (JSON.stringify({ ...next, remainingMs: 0 }) !== JSON.stringify({ ...state, remainingMs: 0 })) {
        state = next;
        renderAll();
      }
    } catch {}
  }

  function renderAll() {
    const typing = content.querySelector('[data-table-bet]');
    const draft = typing && document.activeElement === typing ? typing.value : null;
    const view = state.phase === 'join' ? registration('Запись за стол')
      : state.phase === 'betting' ? registration('Ставки')
        : state.phase === 'playing' ? playingView()
          : state.phase === 'finished' ? resultView()
            : idleView();
    content.innerHTML = `${resetBanner(state, resetArmed)}${view}`;
    if (draft !== null) {
      const input = content.querySelector('[data-table-bet]');
      if (input) { input.value = draft; input.focus(); }
    }
    bindBetControls(content, () => state.gold, haptic, () => action('bet'));
    content.querySelectorAll('[data-elements-action], [data-table-action]').forEach(button => {
      button.addEventListener('click', () => action(button.dataset.elementsAction || button.dataset.tableAction));
    });
  }

  renderAll();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  pollTimer = window.setInterval(refresh, 1500);
  tickTimer = window.setInterval(() => tickTimers(content), 250);
}
