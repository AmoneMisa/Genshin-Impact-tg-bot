import { playThrow, stageHtml } from './arcade-stage.js';

const REASONS = {
  invalid_bet: 'Ставка должна быть целым неотрицательным числом.',
  not_enough_gold: 'Ставка не может быть больше текущего баланса.',
  already_started: 'Эта игра уже запущена.',
  not_started: 'Сначала запусти игру.',
  finished: 'Раунд уже завершён.',
  reset_not_supported: 'Этот тип игры нельзя сбросить после списания ставки.',
};

export const BET_CHIPS = Object.freeze([100, 500, 1000]);
const BET_STEP = 100;

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function signedNumber(value) {
  const number = Number(value) || 0;
  return `${number > 0 ? '+' : ''}${formatNumber(number)}`;
}

function clampBet(value, gold) {
  return Math.max(0, Math.min(Math.floor(Number(gold) || 0), Math.floor(Number(value) || 0)));
}

/** One-line rules under the title, like the prototype. */
export function rulesText(game) {
  if (game.mode === 'slots') return `Три одинаковых символа — выплата ×${game.payoutMultiplier}. Ставка списывается при запуске.`;
  const throws = `${game.maxRolls} ${game.maxRolls === 1 ? 'бросок' : 'броска'}`;
  return `${throws} по 1–${game.maxValue}. Набери ${game.winRange.min}–${game.winRange.max}, чтобы победить.`;
}

/** Side stat panels (Счёт / Броски / База, or Ставка / Шанс for slots). */
export function statPanels(game) {
  const panel = (label, value, extra = '') => `<div class="arcade-stat ${extra}"><small>${label}</small><strong>${value}</strong></div>`;
  if (game.mode === 'slots') {
    return panel('Ставка', formatNumber(game.bet)) + panel('Шанс', `${Math.round(game.winChance * 100)}%`) + panel('Выплата', `×${game.payoutMultiplier}`);
  }
  const inRange = game.score >= game.winRange.min && game.score <= game.winRange.max;
  const over = game.score > game.winRange.max;
  return panel('Очки', formatNumber(game.score), inRange ? 'good' : over ? 'bad' : '')
    + panel('Броски', `${game.rolls} / ${game.maxRolls}`)
    + panel('Цель', `${game.winRange.min}–${game.winRange.max}`);
}

export async function openArcadeGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/arcade');
  let selected = state.games.find(game => game.active)?.id || 'basketball';
  let pending = false;
  let lastResult = null;
  const lastValues = {}; // gameId -> last roll, so the die keeps showing it

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay arcade-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel arcade-panel">
      <header class="arcade-head">
        <button class="overlay-close arcade-round" type="button" aria-label="Закрыть">←</button>
        <h2 data-arcade-title>Мини-игры</h2>
        <button class="arcade-round" type="button" data-arcade-refresh aria-label="Обновить">↻</button>
      </header>
      <div data-arcade-content></div>
      <div class="arcade-feedback" data-arcade-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-arcade-content]');
  const feedback = overlay.querySelector('[data-arcade-feedback]');
  const title = overlay.querySelector('[data-arcade-title]');

  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);
  overlay.querySelector('[data-arcade-refresh]').addEventListener('click', refresh);

  function currentGame() {
    return state.games.find(game => game.id === selected) || state.games[0];
  }

  function verdict(result) {
    if (!result) return '';
    if (result.mode === 'slots') {
      return `<div class="arcade-verdict ${result.won ? 'win' : 'lose'}"><strong>${result.won ? 'Джекпот!' : 'Мимо'}</strong><small>${result.won ? `+${formatNumber(result.reward)} 🪙` : `${signedNumber(result.net)} 🪙`}</small></div>`;
    }
    return `<div class="arcade-verdict ${result.won ? 'win' : 'lose'}"><strong>${result.won ? 'Победа!' : 'Раунд проигран'}</strong><small>${result.won ? `+${formatNumber(result.reward)} 🪙 · ×${result.multiplier}` : `итог ${formatNumber(result.score)}, нужно ${result.winRange.min}–${result.winRange.max}`}</small></div>`;
  }

  function gameTabs() {
    return state.games.map(game => `
      <button type="button" class="arcade-tab ${game.id === selected ? 'active' : ''}" data-game="${game.id}" aria-label="${escapeHtml(game.title)}">
        <span>${game.icon}</span>${game.active ? '<i></i>' : ''}
      </button>`).join('');
  }

  function controls(game) {
    const slots = game.mode === 'slots';
    if (game.active) {
      return `
        <button type="button" class="arcade-btn gold" data-arcade-roll>${slots ? 'Крутить' : `Бросить · осталось ${game.rollsLeft}`}</button>
        ${slots ? '' : '<button type="button" class="arcade-btn ghost small" data-arcade-reset>Сбросить раунд</button>'}`;
    }
    const start = Math.min(slots ? 100 : 500, Math.floor(state.gold));
    return `
      <section class="arcade-bet">
        <div class="arcade-stepper">
          <button type="button" data-arcade-step="-1" aria-label="Меньше">−</button>
          <input type="number" inputmode="numeric" min="0" step="1" max="${Math.floor(state.gold)}" value="${start}" data-arcade-bet aria-label="${slots ? 'Ставка' : 'База выигрыша'}" />
          <button type="button" data-arcade-step="1" aria-label="Больше">+</button>
        </div>
        <div class="arcade-chips">${BET_CHIPS.map(value => `<button type="button" data-bet-value="${value}" ${value > state.gold ? 'disabled' : ''}>${formatNumber(value)}</button>`).join('')}<button type="button" data-bet-value="${Math.floor(state.gold)}">Всё</button></div>
        <small class="arcade-note">${slots ? 'Ставка списывается при запуске.' : 'База не списывается: при победе начисляется награда от неё.'} Баланс: 🪙 ${formatNumber(state.gold)}</small>
      </section>
      <button type="button" class="arcade-btn gold" data-arcade-start>Начать</button>`;
  }

  function bind() {
    content.querySelectorAll('[data-game]').forEach(button => {
      button.addEventListener('click', () => {
        if (pending) return;
        selected = button.dataset.game;
        lastResult = null;
        haptic('light');
        renderAll();
      });
    });
    content.querySelectorAll('[data-bet-value]').forEach(button => {
      button.addEventListener('click', () => {
        const input = content.querySelector('[data-arcade-bet]');
        if (input) input.value = clampBet(button.dataset.betValue, state.gold);
        haptic('light');
      });
    });
    content.querySelectorAll('[data-arcade-step]').forEach(button => {
      button.addEventListener('click', () => {
        const input = content.querySelector('[data-arcade-bet]');
        if (input) input.value = clampBet(Number(input.value) + Number(button.dataset.arcadeStep) * BET_STEP, state.gold);
        haptic('light');
      });
    });
    content.querySelector('[data-arcade-start]')?.addEventListener('click', start);
    content.querySelector('[data-arcade-roll]')?.addEventListener('click', roll);
    content.querySelector('[data-arcade-reset]')?.addEventListener('click', reset);
  }

  async function refresh() {
    if (pending) return;
    haptic('light');
    state = await api('/api/arcade');
    renderAll();
  }

  async function start() {
    if (pending) return;
    const bet = Number(content.querySelector('[data-arcade-bet]')?.value ?? 0);
    pending = true;
    overlay.classList.add('busy');
    feedback.textContent = '';
    haptic('medium');
    try {
      const payload = await api('/api/arcade/start', { method: 'POST', body: JSON.stringify({ gameId: selected, bet }) });
      state = payload.arcade;
      if (payload.state) renderState(payload.state);
      lastResult = null;
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

  async function reset() {
    if (pending || currentGame().mode === 'slots') return;
    pending = true;
    overlay.classList.add('busy');
    haptic('medium');
    try {
      const payload = await api('/api/arcade/reset', { method: 'POST', body: JSON.stringify({ gameId: selected }) });
      state = payload.arcade;
      if (payload.state) renderState(payload.state);
      lastResult = null;
      feedback.textContent = 'Раунд сброшен.';
      statusElement.textContent = `${currentGame().title}: сессия сброшена.`;
      renderAll();
    } catch (error) {
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
      if (error.payload?.arcade) state = error.payload.arcade;
      renderAll();
      haptic('light');
    } finally {
      pending = false;
      overlay.classList.remove('busy');
    }
  }

  async function roll() {
    if (pending) return;
    const game = currentGame();
    pending = true;
    overlay.classList.add('busy', 'rolling');
    feedback.textContent = '';
    haptic('heavy');
    try {
      const payload = await api('/api/arcade/roll', { method: 'POST', body: JSON.stringify({ gameId: selected }) });
      // The throw plays on the current stage before the numbers update.
      const stage = content.querySelector('[data-stage]');
      const shown = payload.result?.mode === 'slots' ? payload.result.reels : payload.value;
      await playThrow(stage, selected, shown, { maxValue: game.maxValue });
      if (payload.result?.mode !== 'slots') lastValues[selected] = payload.value;
      state = payload.arcade;
      if (payload.state) renderState(payload.state);
      lastResult = payload.result || null;
      haptic(payload.result?.won ? 'heavy' : 'light');
      feedback.textContent = payload.finished ? '' : `Выпало ${payload.value}.`;
      statusElement.textContent = `Аркада: ${payload.finished ? (payload.result?.won ? 'победа' : 'раунд завершён') : `выпало ${payload.value}`}.`;
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
    title.textContent = game.title;
    content.innerHTML = `
      <div class="arcade-tabs">${gameTabs()}</div>
      <p class="arcade-rules">${escapeHtml(rulesText(game))}</p>
      <div class="arcade-arena">
        ${stageHtml(game.id, { ...game, lastValue: lastValues[game.id] })}
        <div class="arcade-stats">${statPanels(game)}</div>
      </div>
      ${verdict(lastResult)}
      ${controls(game)}`;
    bind();
  }

  renderAll();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
