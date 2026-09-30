// 21 as a shared felt table. Registration: seats (taken / free), countdown
// ring, join / leave and a bet stepper. Play: the dealer on top, the other
// players as compact seat tiles, your seat pinned at the bottom with the
// actions. Results: every seat with its hand and payout. A stuck table can be
// reset from here (anyone when it stalls, chat admins any time).

import {
  betControls, bindBetControls, clampBet as clampTableBet, emptySeat, escapeHtml, formatNumber,
  resetBanner, seatGrid, seatTile, tickTimers, timerRing,
} from './table-seats.js';

const REASONS = {
  already_started: 'Партия уже идёт.',
  not_lobby: 'Запись за стол уже закрыта.',
  not_playing: 'Раунд ещё не начался.',
  not_joined: 'Сначала сядь за стол.',
  full: 'За столом уже максимум игроков.',
  invalid_bet: 'Ставка должна быть целым неотрицательным числом.',
  not_enough_gold: 'Для такой ставки недостаточно золота.',
  passed: 'Ты уже спасовал и больше не можешь брать карты.',
  finished: 'Раунд уже завершён.',
  deck_empty: 'В колоде закончились карты.',
  no_game: 'Стол уже пуст.',
  not_stuck: 'Стол работает — сбросить можно, только если он завис.',
};

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

export const clampBet = clampTableBet;

/** Seat status for 21: bust over 21, exact 21, passed, or still drawing. */
export function seatStatus21(player, phase) {
  if (phase === 'lobby') return player.bet > 0 ? { text: 'ставка сделана', tone: 'ok' } : { text: 'без ставки', tone: 'wait' };
  if (player.points > 21) return { text: 'перебор', tone: 'out' };
  if (player.points === 21) return { text: 'ровно 21!', tone: 'win' };
  if (player.passed) return { text: 'пас', tone: 'wait' };
  return { text: 'берёт карты', tone: 'ok' };
}

export async function openPoint21({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/point21');
  let pending = false;
  let pollTimer = null;
  let tickTimer = null;
  let resetArmed = false;

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
      <p class="point-rules">Набери больше очков, чем дилер, но не больше 21. Ровно 21 — ×3 к ставке.</p>
      <div data-point-content></div>
      <div class="point-feedback" data-point-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-point-content]');
  const feedback = overlay.querySelector('[data-point-feedback]');

  const close = () => {
    window.clearInterval(pollTimer);
    window.clearInterval(tickTimer);
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);
  overlay.querySelector('[data-point-help]').addEventListener('click', () => overlay.querySelector('.point-rules').classList.toggle('open'));

  // Cards already on screen per player, so only newly dealt ones animate.
  const seen = new Map();
  function hand(id, cards = [], { hidden = 0, mini = false } = {}) {
    const known = seen.get(id) || 0;
    const html = cards.map((card, index) => cardHtml(card, { fresh: index >= known, delay: Math.max(0, index - known) * 140 })).join('')
      + Array.from({ length: hidden }, (_, index) => cardBackHtml((cards.length - known + index) * 140)).join('');
    seen.set(id, cards.length);
    return `<div class="point-hand ${mini ? 'mini' : ''}">${html || '<em class="point-hand-empty">Карты ещё не розданы</em>'}</div>`;
  }

  function humans() {
    return state.players.filter(player => !player.isBot);
  }

  function others() {
    return humans().filter(player => player.id !== state.me.id);
  }

  function myPlayer() {
    return state.players.find(player => player.id === state.me.id) || { id: state.me.id, name: 'Ты', bet: state.me.bet, className: null };
  }

  function idleView() {
    return `
      <div class="point-felt idle">
        <div class="point-deck-stack" aria-hidden="true"><span></span><span></span><span></span></div>
        <strong>Стол свободен</strong>
        <p>Открой стол: 25 секунд на запись и ставки, затем дилер раздаст по две карты. До ${state.maxPlayers || 4} игроков.</p>
      </div>
      <div class="table-wallet">Баланс 🪙 ${formatNumber(state.gold)}</div>
      <button type="button" class="table-btn gold" data-point-action="start">Открыть стол</button>`;
  }

  function lobbyView() {
    const seated = humans();
    const free = Math.max(0, (state.maxPlayers || 4) - seated.length);
    return `
      ${timerRing(state.remainingMs, state.phaseMs, `Запись и ставки · ${seated.length} / ${state.maxPlayers} за столом`)}
      ${seatGrid([
        ...seated.map(player => seatTile(player, { you: player.id === state.me.id, status: seatStatus21(player, 'lobby') })),
        ...Array.from({ length: free }, emptySeat),
      ], { className: 'registration' })}
      ${state.me.joined ? `
        ${betControls(state.gold, state.me.bet)}
        <button type="button" class="table-btn ghost" data-point-action="leave">Встать из-за стола</button>`
        : free > 0
          ? '<button type="button" class="table-btn gold" data-point-action="join">Сесть за стол</button>'
          : '<div class="point-watch">Все места заняты — ты наблюдаешь за партией.</div>'}`;
  }

  function playingView() {
    const bot = state.players.find(player => player.isBot);
    const canAct = state.me.joined && !state.me.passed;
    const me = myPlayer();
    return `
      ${timerRing(state.remainingMs, state.phaseMs, 'Ход закончится через')}
      <div class="point-felt">
        ${bot ? `
          <section class="point-dealer">
            <header><strong>Дилер</strong><span class="point-score ${bot.points > 21 ? 'bust' : ''}">${bot.cards.length ? bot.points : '?'}</span></header>
            ${hand('bot', bot.cards, { hidden: bot.cards.length ? 0 : 2 })}
          </section>` : ''}
        ${others().length ? seatGrid(others().map(player => seatTile(player, {
          score: player.points,
          status: seatStatus21(player, 'playing'),
          hand: hand(player.id, player.cards, { mini: true }),
        }))) : ''}
      </div>
      ${state.me.joined ? `
        <section class="table-me">
          <header>
            <strong>${state.me.passed ? 'Ход завершён' : 'Твой ход'}</strong>
            <span class="point-score ${state.me.points > 21 ? 'bust' : state.me.points === 21 ? 'exact' : ''}">${state.me.points}</span>
          </header>
          ${hand(state.me.id, state.me.cards)}
          <div class="point-actions">
            <button type="button" class="table-btn blue" data-point-action="card" ${canAct ? '' : 'disabled'}>Взять карту</button>
            <button type="button" class="table-btn red" data-point-action="pass" ${canAct ? '' : 'disabled'}>Пас</button>
          </div>
          <small class="table-note">Ставка ${formatNumber(me.bet)} 🪙</small>
        </section>` : '<div class="point-watch">Ты наблюдаешь за этой партией.</div>'}`;
  }

  function resultView() {
    const results = state.result?.players || [];
    const mine = results.find(player => player.id === state.me.id);
    const look = new Map(state.players.map(player => [player.id, player]));
    return `
      ${mine ? `<div class="point-verdict ${mine.won ? 'win' : 'lose'}"><strong>${mine.won ? (mine.exact21 ? 'Ровно 21!' : 'Победа!') : 'Поражение'}</strong><small>${mine.delta >= 0 ? '+' : ''}${formatNumber(mine.delta)} 🪙</small></div>` : ''}
      <div class="point-felt results">
        ${seatGrid(results.map(player => seatTile({ ...look.get(player.id), ...player }, {
          you: player.id === state.me.id,
          score: player.points,
          status: player.isBot ? { text: player.points > 21 ? 'перебор' : 'дилер', tone: player.points > 21 ? 'out' : 'wait' }
            : { text: player.won ? (player.exact21 ? 'ровно 21' : 'победа') : 'проигрыш', tone: player.won ? 'win' : 'lose' },
          delta: player.isBot ? null : player.delta,
          hand: `<div class="point-hand mini">${player.cards.map(card => cardHtml(card)).join('')}</div>`,
        })), { className: 'results' })}
      </div>
      <button type="button" class="table-btn gold" data-point-action="start">Новая партия</button>`;
  }

  function renderAll() {
    const typing = content.querySelector('[data-table-bet]');
    const draft = typing && document.activeElement === typing ? typing.value : null;
    const view = state.phase === 'lobby' ? lobbyView()
      : state.phase === 'playing' ? playingView()
        : state.phase === 'finished' ? resultView()
          : idleView();
    content.innerHTML = `${resetBanner(state, resetArmed)}${view}`;
    if (draft !== null) {
      const input = content.querySelector('[data-table-bet]');
      if (input) { input.value = draft; input.focus(); }
    }
    bindBetControls(content, () => state.gold, haptic);
    content.querySelectorAll('[data-point-action], [data-table-action]').forEach(button => {
      button.addEventListener('click', () => action(button.dataset.pointAction || button.dataset.tableAction));
    });
  }

  async function refresh() {
    if (pending || !overlay.isConnected) return;
    try {
      const next = await api('/api/point21');
      if (JSON.stringify({ ...next, remainingMs: 0 }) !== JSON.stringify({ ...state, remainingMs: 0 })) {
        state = next;
        renderAll();
      }
    } catch {
      // Keep the last good table on screen; the next poll retries.
    }
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
    if (name === 'bet') body.bet = content.querySelector('[data-table-bet]')?.value ?? '0';

    pending = true;
    overlay.classList.add('busy');
    feedback.textContent = '';
    haptic(name === 'card' ? 'heavy' : 'medium');
    try {
      const payload = await api('/api/point21/action', { method: 'POST', body: JSON.stringify(body) });
      state = payload.point21;
      if (payload.state) renderState(payload.state);
      feedback.textContent = name === 'card' && payload.card ? `Выпала карта ${payload.card}.`
        : name === 'reset' ? 'Стол сброшен.' : name === 'bet' ? 'Ставка сохранена.' : '';
      statusElement.textContent = `21 очко: ${state.phase === 'finished' ? 'партия завершена' : 'стол обновлён'}.`;
    } catch (error) {
      if (error.payload?.point21) state = error.payload.point21;
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
      haptic('light');
    } finally {
      resetArmed = false;
      pending = false;
      overlay.classList.remove('busy');
      renderAll();
    }
  }

  renderAll();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  pollTimer = window.setInterval(refresh, 1500);
  tickTimer = window.setInterval(() => tickTimers(content), 250);
}
