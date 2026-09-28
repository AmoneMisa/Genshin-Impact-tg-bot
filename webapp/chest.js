// Chest game, prototype flow: pick one of nine 3D chests -> the chosen chest
// bursts open in a close-up with its reward -> "Получить" -> after the third
// pick every chest goes dark and the session's rewards are summarised.

import { createChest, RATTLE_SECONDS, SWING_SECONDS } from './chest-3d.js';

export const PRIZE_ICONS = Object.freeze({
  experience: '✦',
  gold: '🪙',
  crystals: '💎',
  nothing: '🌫️',
  sword: '⚔️',
  brokenSword: '🗡️',
  immuneToUpSword: '🛡️',
});

/** Shown under the grid; mirrors the server's prize table (miniapp/chest.js). */
export const POSSIBLE_REWARDS = Object.freeze([
  { type: 'gold', label: 'Золото' },
  { type: 'crystals', label: 'Кристаллы' },
  { type: 'experience', label: 'Опыт' },
  { type: 'sword', label: 'Рост меча' },
  { type: 'immuneToUpSword', label: 'Иммунитет меча' },
  { type: 'brokenSword', label: 'Поломка меча' },
]);

const PRIZE_TITLES = {
  experience: 'Опыт', gold: 'Золото', crystals: 'Кристаллы', nothing: 'Пусто',
  sword: 'Меч', brokenSword: 'Меч', immuneToUpSword: 'Иммунитет',
};

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function rewardText(prize) {
  if (prize.type === 'nothing') return 'Пусто';
  if (prize.type === 'immuneToUpSword') return 'Иммунитет';
  const amount = Number(prize.amount) || 0;
  const sign = amount > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('ru-RU').format(amount)}`;
}

export function counterText(chestState) {
  if (!chestState.available && !chestState.selectionsLeft) return 'Попытка восстановится после дневного сброса';
  return `Выбери сундук, чтобы открыть · осталось ${chestState.selectionsLeft}`;
}

export function possibleRewardsHtml() {
  return `
  <section class="chest-possible">
    <small>Возможные награды:</small>
    <div>${POSSIBLE_REWARDS.map(item => `<span class="chest-possible-item ${item.type}" title="${item.label}" aria-label="${item.label}">${PRIZE_ICONS[item.type]}</span>`).join('')}</div>
  </section>`;
}

/** Reward tiles in the "Сундук открыт" close-up. */
export function rewardTilesHtml(prizes) {
  return prizes.map(prize => `
    <div class="chest-prize-tile ${prize.type === 'nothing' ? 'empty' : ''} ${prize.type}">
      <span>${PRIZE_ICONS[prize.type] || '✦'}</span>
      <strong>${escapeHtml(rewardText(prize))}</strong>
      <small>${escapeHtml(prize.label || '')}</small>
    </div>`).join('');
}

/** "Награды": everything won this round, same-type prizes added together. */
export function summaryRows(prizes) {
  const rows = new Map();
  for (const prize of prizes) {
    const row = rows.get(prize.type) || { type: prize.type, label: prize.label, amount: 0, count: 0 };
    row.amount += Number(prize.amount) || 0;
    row.count += 1;
    rows.set(prize.type, row);
  }
  return [...rows.values()];
}

export function summaryHtml(prizes) {
  const rows = summaryRows(prizes);
  return `
  <div class="chest-summary">
    <div class="chest-done"><span aria-hidden="true">✓</span><div><strong>Все сундуки открыты</strong><small>Возвращайся после дневного сброса за новыми наградами.</small></div></div>
    <h3>Награды</h3>
    <div class="chest-summary-list">${rows.length ? rows.map(row => `
      <div class="chest-summary-row ${row.type}">
        <span>${PRIZE_ICONS[row.type] || '✦'}</span>
        <div><small>${PRIZE_TITLES[row.type] || escapeHtml(row.label)}</small><strong>${escapeHtml(row.type === 'immuneToUpSword' || row.type === 'nothing' ? rewardText(row) : `${rewardText(row)} ${row.label}`)}</strong></div>
        ${row.count > 1 ? `<em>×${row.count}</em>` : ''}
      </div>`).join('') : '<p class="chest-summary-empty">Сегодня награды уже получены.</p>'}</div>
    <button type="button" class="chest-btn" data-chest-close>Закрыть</button>
  </div>`;
}

export async function openChestGame({ api, renderState, haptic, statusElement }) {
  const chestState = await api('/api/chest');
  const overlay = document.createElement('section');
  overlay.className = 'game-overlay chest-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel chest-panel">
      <header class="chest-head">
        <button class="chest-back" type="button" data-chest-close aria-label="Назад">←</button>
        <h2>Открытие сундуков</h2>
        <button class="chest-help" type="button" data-chest-help aria-label="Правила">?</button>
      </header>
      <p class="chest-rules" hidden>Выбери три сундука из девяти. Награда определяется на сервере в момент открытия; одна попытка в день.</p>
      <div class="chest-grid" role="grid" aria-label="Сундуки"></div>
      <div class="chest-counter"></div>
      ${possibleRewardsHtml()}
      <div class="chest-result" aria-live="polite"></div>
      <div class="chest-reveal" hidden></div>
      <div class="chest-summary-host" hidden></div>
    </div>`;

  const panel = overlay.querySelector('.chest-panel');
  const grid = overlay.querySelector('.chest-grid');
  const counter = overlay.querySelector('.chest-counter');
  const result = overlay.querySelector('.chest-result');
  const reveal = overlay.querySelector('.chest-reveal');
  const summaryHost = overlay.querySelector('.chest-summary-host');
  let localState = chestState;
  let pending = false;
  let revealChest = null;
  const won = [];

  const chests = new Map(); // chestId -> 3D controller (null: CSS tile fallback)
  const close = () => {
    for (const chest of chests.values()) chest?.destroy?.();
    revealChest?.destroy?.();
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target.closest('[data-chest-close]')) close();
    if (event.target.closest('[data-chest-help]')) {
      const rules = overlay.querySelector('.chest-rules');
      rules.hidden = !rules.hidden;
    }
  });

  function showSummary() {
    overlay.classList.add('completed');
    summaryHost.innerHTML = summaryHtml(won);
    summaryHost.hidden = false;
    counter.textContent = '';
    result.textContent = '';
    requestAnimationFrame(() => summaryHost.classList.add('visible'));
  }

  // Close-up of the opened chest with its reward; resolves on "Получить".
  function showReveal(prize) {
    return new Promise((resolve) => {
      const empty = prize.type === 'nothing';
      reveal.innerHTML = `
        <h3>${empty ? 'Сундук пуст' : 'Сундук открыт'}</h3>
        <div class="chest-reveal-stage ${empty ? 'empty' : ''}"><span class="chest-reveal-rays" aria-hidden="true"></span></div>
        <div class="chest-prize-row">${rewardTilesHtml([prize])}</div>
        <button type="button" class="chest-btn" data-chest-claim>${empty ? 'Дальше' : 'Получить'}</button>`;
      reveal.hidden = false;
      requestAnimationFrame(() => reveal.classList.add('visible'));
      const stage = reveal.querySelector('.chest-reveal-stage');
      createChest(stage, { index: 0 }).then((chest) => {
        revealChest = chest;
        chest?.open(empty ? 'empty' : 'treasure');
        if (!chest) stage.classList.add('fallback');
      }).catch(() => stage.classList.add('fallback'));
      reveal.querySelector('[data-chest-claim]').addEventListener('click', () => {
        haptic(empty ? 'light' : 'medium');
        revealChest?.destroy?.();
        revealChest = null;
        reveal.classList.remove('visible');
        window.setTimeout(() => { reveal.hidden = true; reveal.innerHTML = ''; resolve(); }, 220);
      }, { once: true });
    });
  }

  const buttons = [];
  const opened = new Set(chestState.opened || []);
  for (let chestId = 1; chestId <= 9; chestId += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chest-tile';
    button.dataset.chestId = String(chestId);
    button.style.setProperty('--i', String(chestId - 1));
    button.innerHTML = '<span class="chest-glow"></span><span class="chest-lid">✦</span><span class="chest-body">▰</span>';
    if (opened.has(chestId)) {
      button.classList.add('opened', 'historical');
      button.disabled = true;
    }
    createChest(button, { opened: opened.has(chestId) ? 'treasure' : null, index: chestId })
      .then(chest => chests.set(chestId, chest))
      .catch(() => chests.set(chestId, null));

    button.addEventListener('click', async () => {
      if (pending || button.disabled || !localState.available) return;
      pending = true;
      haptic('medium');
      button.classList.add('opening');
      buttons.forEach((item) => { item.disabled = true; });

      try {
        const payload = await api('/api/chest/open', { method: 'POST', body: JSON.stringify({ chestId }) });
        localState = { available: payload.tries > 0, tries: payload.tries, opened: payload.opened, selectionsLeft: payload.selectionsLeft };
        won.push(payload.prize);
        const empty = payload.prize.type === 'nothing';

        // The grid chest rattles and swings open, then the close-up takes over.
        chests.get(chestId)?.open(empty ? 'empty' : 'treasure');
        button.classList.remove('opening');
        button.classList.add('opened', 'just-opened');
        await new Promise(resolve => window.setTimeout(resolve, (RATTLE_SECONDS + SWING_SECONDS * 0.7) * 1000));
        haptic(empty ? 'light' : 'heavy');
        if (payload.state) renderState(payload.state);
        await showReveal(payload.prize);

        const badge = document.createElement('div');
        badge.className = `chest-reward ${empty ? 'empty' : ''}`;
        badge.innerHTML = `<span class="reward-icon">${PRIZE_ICONS[payload.prize.type] || '✦'}</span><strong>${escapeHtml(rewardText(payload.prize))}</strong>`;
        button.appendChild(badge);
        if (!chests.get(chestId)) button.querySelectorAll('.chest-lid, .chest-body').forEach(node => node.remove());

        if (payload.completed) showSummary();
        else counter.textContent = counterText(localState);
      } catch (error) {
        button.classList.remove('opening');
        result.textContent = error.message;
        statusElement.textContent = `Сундуки: ${error.message}`;
        haptic('light');
      } finally {
        pending = false;
        buttons.forEach((item) => {
          const id = Number(item.dataset.chestId);
          item.disabled = item.classList.contains('opened') || !localState.available || (localState.opened || []).includes(id);
        });
      }
    });

    buttons.push(button);
    grid.appendChild(button);
  }

  counter.textContent = counterText(chestState);
  if (!chestState.available) {
    buttons.forEach((button) => { button.disabled = true; });
    showSummary();
  }

  panel.dataset.ready = 'true';
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
