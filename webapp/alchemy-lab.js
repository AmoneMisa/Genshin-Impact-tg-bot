import {dialogHeading} from './dialog-heading.js';
import {escapeHtml} from './escape-html.js';
import {installOverlayA11y} from './overlay-a11y.js';

const REASONS = {
  lab_locked: 'Варка открывается с 8 уровня дворца.',
  lab_upgrading: 'Во время улучшения лаборатории варить нельзя.',
  no_attempts: 'Попытки на сегодня закончились. Они обновятся в полночь по UTC.',
  not_enough_moon_dew: 'Не хватает лунной росы.',
  not_enough_gold: 'Не хватает золота.',
  inventory_missing: 'Персонаж не найден.',
};

const number = value => new Intl.NumberFormat('ru-RU').format(Math.round(Number(value) || 0));
const percent = share => `${Math.round(share * 100)}%`;

/** What a rune does at a given strength, as a short phrase. */
function effectText(kind, value, effect) {
  if (kind === 'defense') return `−${percent(value)} ${effect}`;
  if (kind === 'teleport') return `−${percent(value)} к цене телепорта`;
  return `+${percent(value)} ${effect}`;
}

function remaining(until, now) {
  const minutes = Math.max(0, Math.ceil((until - now) / 60000));
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h ? `${h} ч ${m} мин` : `${m} мин`;
}

export async function openAlchemyLab({api, haptic = () => {}, renderState = () => {}} = {}) {
  let lab = await api('/api/alchemy');
  let pending = false, closed = false, message = '';
  installOverlayA11y();

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay alchemy-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel game-dialog-panel l2-status-window alchemy-panel">
      ${dialogHeading('Алхимическая лаборатория').replace('data-dismiss', 'class="overlay-close" data-dismiss')}
      <div data-lab-content></div>
    </div>`;
  const content = overlay.querySelector('[data-lab-content]');
  const close = () => {
    if (closed) return;
    closed = true;
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function activeHtml(now) {
    if (!lab.active.length) return '<p class="alchemy-note">Сейчас ни одна руна не действует.</p>';
    return `<ul class="alchemy-runes">${lab.active.map(rune => `
      <li class="${rune.working ? 'working' : 'covered'}">
        <span><strong>${escapeHtml(rune.kindLabel)} · ${escapeHtml(rune.tierLabel)}</strong><small>${escapeHtml(effectText(rune.kind, rune.value, rune.effect))}</small></span>
        <span><small>${rune.working ? 'Действует' : 'Перекрыта сильнейшей'}</small><small>${escapeHtml(remaining(rune.until, now))}</small></span>
      </li>`).join('')}</ul>`;
  }

  function oddsHtml() {
    const odds = lab.odds;
    return `<details class="ui-disclosure"><summary>Шансы</summary>
      <p class="alchemy-note">Без результата: ${odds.fizzle}%. Остальные ${100 - odds.fizzle}% делятся поровну между видами; сила: малая 50%, средняя 35%, великая 15%.</p>
      <ul class="alchemy-odds">${odds.kinds.map(kind => `
        <li><strong>${escapeHtml(kind.label)}</strong><small>${escapeHtml(kind.effect)}</small>
          <span>${kind.tiers.map(tier => `${escapeHtml(tier.label)} ${escapeHtml(effectText(kind.kind, tier.value, ''))} · ${tier.hours} ч`).join('<br>')}</span></li>`).join('')}
      </ul></details>`;
  }

  function render() {
    const now = Date.now();
    const price = lab.next;
    const canBrew = lab.unlocked && !pending && price && lab.balance.moonDew >= price.moonDew && lab.balance.gold >= price.gold;
    content.innerHTML = `
      <section class="alchemy-summary">
        <div class="ui-stat-row"><span>Попытки сегодня</span><strong>${lab.used} / ${lab.cap}</strong></div>
        <div class="ui-stat-row"><span>Лунная роса</span><strong>${number(lab.balance.moonDew)}</strong></div>
        <div class="ui-stat-row"><span>Золото</span><strong>${number(lab.balance.gold)}</strong></div>
      </section>
      ${lab.unlocked ? '' : `<p class="alchemy-note">${escapeHtml(REASONS.lab_locked)} Сейчас дворец ${lab.palaceLevel} ур.</p>`}
      <button type="button" class="ui-button primary" data-lab-brew ${canBrew ? '' : 'disabled'}>${price ? `Варить · ${number(price.moonDew)} росы · ${number(price.gold)} золота` : 'Попытки закончились'}</button>
      <p class="alchemy-feedback" aria-live="polite">${escapeHtml(message)}</p>
      <h3>Действующие руны</h3>
      ${activeHtml(now)}
      ${oddsHtml()}`;
    content.querySelector('[data-lab-brew]')?.addEventListener('click', brew);
  }

  async function brew() {
    if (pending || closed) return;
    pending = true; render();
    try {
      const result = await api('/api/alchemy/brew', {method: 'POST', body: JSON.stringify({})});
      message = result.fizzled ? 'Варево не удалось: руна не получилась.' : `Получена руна: ${result.rune.kindLabel} · ${result.rune.tierLabel}.`;
      if (result.state) renderState(result.state);
      haptic('medium');
    } catch (error) {
      message = REASONS[error.payload?.reason] || error.message;
      haptic('light');
    } finally {
      pending = false;
      try { lab = await api('/api/alchemy'); } catch { /* the old numbers stay on screen */ }
      if (!closed) render();
    }
  }

  document.body.appendChild(overlay);
  render();
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
