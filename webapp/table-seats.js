// Shared UI for the multiplayer table games (21, elements): seat tiles with
// class portraits, empty seats for registration, a countdown ring, a bet
// stepper and the stuck-table reset banner. Each game supplies its own hand
// markup and actions; this module only renders and binds the common parts.

import { menuArtFor } from './menu-art.js';

export const BET_CHIPS = Object.freeze([100, 500, 1000]);
export const BET_STEP = 100;

export function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

export function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}

export function formatSeconds(ms) {
  const seconds = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Whole coins within [0, gold]. */
export function clampBet(value, gold) {
  return Math.max(0, Math.min(Math.floor(Number(gold) || 0), Math.floor(Number(value) || 0)));
}

function portrait(player) {
  if (player.isBot) return '<span class="seat-portrait bot" aria-hidden="true">✦</span>';
  return `<span class="seat-portrait" style="--art:url('${menuArtFor('profile', player)}')" aria-hidden="true"></span>`;
}

/**
 * One seat. `hand` is the game's own markup (mini cards / element chips);
 * `status` is { text, tone } with tone in ok | wait | out | win | lose.
 */
export function seatTile(player, { hand = '', status = null, score = null, you = false, delta = null } = {}) {
  const classes = ['seat', player.isBot ? 'is-bot' : '', you ? 'is-you' : '', status?.tone ? `tone-${status.tone}` : ''].filter(Boolean).join(' ');
  return `
    <article class="${classes}" ${player.isBot || you ? '' : `data-player-card="${escapeHtml(player.id)}"`}>
      <header>
        ${portrait(player)}
        <div class="seat-id">
          <strong>${escapeHtml(you ? `${player.name} (ты)` : player.name)}</strong>
          <small>${player.isBot ? 'дилер' : player.bet > 0 ? `ставка ${formatNumber(player.bet)}` : 'без ставки'}</small>
        </div>
        ${score === null ? '' : `<b class="seat-score">${escapeHtml(score)}</b>`}
      </header>
      ${hand ? `<div class="seat-hand">${hand}</div>` : ''}
      ${status || delta !== null ? `<footer>${status ? `<span class="seat-status">${escapeHtml(status.text)}</span>` : ''}${delta !== null && !player.isBot ? `<em class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '+' : ''}${formatNumber(delta)} 🪙</em>` : ''}</footer>` : ''}
    </article>`;
}

export function emptySeat() {
  return '<article class="seat is-empty" aria-label="Свободное место"><span class="seat-portrait empty" aria-hidden="true">+</span><small>Свободно</small></article>';
}

export function seatGrid(tiles, { className = '' } = {}) {
  return `<div class="seat-grid ${className}">${tiles.join('')}</div>`;
}

/** Circular countdown; `data-table-timer` lets the game tick it locally. */
export function timerRing(remainingMs, phaseMs, label) {
  const left = Math.max(0, Number(remainingMs) || 0);
  const total = Math.max(1, Number(phaseMs) || left || 1);
  const fraction = Math.min(1, left / total);
  return `
    <section class="table-timer ${left < 5000 ? 'urgent' : ''}" data-table-timer data-remaining="${left}" data-total="${total}" data-started="${Date.now()}">
      <span class="table-ring" style="--f:${fraction}"><b data-table-timer-text>${formatSeconds(left)}</b></span>
      <small>${escapeHtml(label)}</small>
    </section>`;
}

/** Updates every countdown ring on the page from its own start time. */
export function tickTimers(root = document) {
  for (const node of root.querySelectorAll('[data-table-timer]')) {
    const left = Math.max(0, Number(node.dataset.remaining) - (Date.now() - Number(node.dataset.started)));
    const ring = node.querySelector('.table-ring');
    ring?.style.setProperty('--f', String(Math.min(1, left / Math.max(1, Number(node.dataset.total)))));
    const text = node.querySelector('[data-table-timer-text]');
    if (text) text.textContent = formatSeconds(left);
    node.classList.toggle('urgent', left < 5000);
  }
}

export function betControls(gold, current, { saveLabel = 'Сохранить ставку' } = {}) {
  return `
    <section class="table-bet">
      <div class="table-stepper">
        <button type="button" data-table-step="-1" aria-label="Меньше">−</button>
        <input type="number" inputmode="numeric" min="0" step="1" max="${Math.floor(gold)}" value="${Math.floor(current) || 0}" data-table-bet aria-label="Ставка" />
        <button type="button" data-table-step="1" aria-label="Больше">+</button>
      </div>
      <div class="table-chips">${BET_CHIPS.map(value => `<button type="button" data-table-quick="${value}" ${value > gold ? 'disabled' : ''}>${formatNumber(value)}</button>`).join('')}<button type="button" data-table-quick="${Math.floor(gold)}">Всё</button></div>
      <small class="table-wallet">Баланс 🪙 ${formatNumber(gold)}</small>
      <button type="button" class="table-btn gold" data-table-action="bet">${escapeHtml(saveLabel)}</button>
    </section>`;
}

/** Wires the stepper and chips inside `root`; reads the live gold via `getGold`. */
export function bindBetControls(root, getGold, haptic = () => {}) {
  const input = root.querySelector('[data-table-bet]');
  if (!input) return;
  root.querySelectorAll('[data-table-step]').forEach(button => button.addEventListener('click', () => {
    input.value = clampBet(Number(input.value) + Number(button.dataset.tableStep) * BET_STEP, getGold());
    haptic('light');
  }));
  root.querySelectorAll('[data-table-quick]').forEach(button => button.addEventListener('click', () => {
    input.value = clampBet(button.dataset.tableQuick, getGold());
    haptic('light');
  }));
}

/** Banner offering to clear a stuck table (or any table, for chat admins). */
export function resetBanner(state, armed = false) {
  if (!state?.canReset) return '';
  const text = state.stuck ? 'Стол не отвечает — его можно сбросить. Ставки не списаны.' : 'Ты админ чата: можно сбросить стол. Ставки не списаны.';
  return `
    <section class="table-reset ${state.stuck ? 'stuck' : ''}">
      <span>${escapeHtml(text)}</span>
      <button type="button" class="table-btn ${armed ? 'red' : 'ghost'}" data-table-action="reset">${armed ? 'Точно сбросить' : 'Сбросить стол'}</button>
    </section>`;
}
