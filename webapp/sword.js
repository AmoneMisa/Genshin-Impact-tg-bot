import { escapeHtml } from './escape-html.js';
// Daily sword, forge style: the blade on an anvil beside a millimetre ruler;
// a roll hammers it with sparks, then it grows or shrinks by the server delta.
import { renderDailySwordArt } from './loot-renderer.js';

const REASONS = { cooldown: 'Сегодня попытка уже использована.' };

function formatNumber(value) { return new Intl.NumberFormat('ru-RU').format(Number(value) || 0); }
function duration(ms) {
  const total = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  const hours = Math.floor(total / 3600), minutes = Math.floor((total % 3600) / 60), seconds = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
function modifierText(state) {
  if (state.decreaseImmune) return '🛡️ Следующий бросок не сможет уменьшить меч.';
  if (state.forceDecrease) return '⤵️ Следующий бросок гарантированно уменьшит меч.';
  return '🎲 Обычный диапазон: от −10 до +15 мм.';
}

/** Ruler ticks around the current length: every 10 mm, a label every 50. */
export function rulerTicks(length, span = 100) {
  const top = Math.ceil((Math.max(0, Number(length) || 0) + span / 2) / 10) * 10;
  const ticks = [];
  for (let mm = top; mm >= Math.max(0, top - span); mm -= 10) ticks.push({ mm, label: mm % 50 === 0 });
  return ticks;
}

function rankingHtml(ranking) {
  if (!Array.isArray(ranking) || ranking.length === 0) return '<div class="sword-ranking-empty">Ещё никто не отрастил свой меч.</div>';
  return ranking.map(entry => {
    const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;
    return `<div class="sword-ranking-row ${entry.isCurrent ? 'current' : ''}" ${entry.isCurrent ? '' : `data-player-card="${escapeHtml(entry.userId)}"`}><span class="sword-ranking-rank">${medal}</span><span class="sword-ranking-name">${escapeHtml(entry.name)}</span><strong>${formatNumber(entry.length)} <small>мм</small></strong></div>`;
  }).join('');
}

const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));

export async function openSwordGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/sword');
  let pending = false;
  let timer = null;
  const overlay = document.createElement('section');
  overlay.className = 'game-overlay sword-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel sword-panel">
      <header class="sword-head">
        <button class="overlay-close sword-round" type="button" aria-label="Закрыть">←</button>
        <h2>Кузница меча</h2>
        <button class="sword-round" type="button" data-sword-refresh aria-label="Обновить">↻</button>
      </header>
      <div data-sword-content></div>
      <div class="sword-feedback" data-sword-feedback aria-live="polite"></div>
    </div>`;
  const content = overlay.querySelector('[data-sword-content]');
  const feedback = overlay.querySelector('[data-sword-feedback]');
  const close = () => { if (timer) window.clearInterval(timer); overlay.classList.add('closing'); window.setTimeout(() => overlay.remove(), 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);
  overlay.querySelector('[data-sword-refresh]').addEventListener('click', async () => { if (pending) return; haptic('light'); await refresh(); });

  async function refresh() { state = await api('/api/sword'); renderAll(); }

  function floatDelta(delta) {
    const forge = content.querySelector('.sword-forge');
    if (!forge) return;
    const node = document.createElement('span');
    node.className = `sword-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}`;
    node.textContent = delta === 0 ? '± 0 мм' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)} мм`;
    forge.appendChild(node);
    window.setTimeout(() => node.remove(), 1800);
  }

  async function roll() {
    if (pending || !state.canRoll) return;
    pending = true;
    overlay.classList.add('busy');
    feedback.textContent = '';
    haptic('heavy');
    const forge = content.querySelector('.sword-forge');
    forge?.classList.add('forging');
    try {
      const [payload] = await Promise.all([api('/api/sword/roll', { method: 'POST' }), wait(1100)]);
      const delta = Number(payload.delta) || 0;
      state = payload.sword;
      if (payload.state) renderState(payload.state);
      renderAll({ resized: delta > 0 ? 'grow' : delta < 0 ? 'shrink' : '' });
      floatDelta(delta);
      haptic(delta > 0 ? 'heavy' : 'light');
      feedback.textContent = delta > 0 ? `Меч вырос на ${delta} мм.` : delta < 0 ? `Меч уменьшился на ${Math.abs(delta)} мм.` : 'Длина меча не изменилась.';
      statusElement.textContent = `Меч: ${formatNumber(state.length)} мм.`;
    } catch (error) {
      forge?.classList.remove('forging');
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
      if (error.payload?.sword) { state = error.payload.sword; renderAll(); } else { try { await refresh(); } catch {} }
      haptic('light');
    } finally {
      pending = false;
      overlay.classList.remove('busy');
    }
  }

  function renderAll({ resized = '' } = {}) {
    const canRoll = Boolean(state.canRoll);
    content.innerHTML = `
      <section class="sword-forge ${resized}">
        <div class="sword-ruler" aria-hidden="true">${rulerTicks(state.length).map(tick => `<span class="${tick.label ? 'major' : ''}">${tick.label ? tick.mm : ''}</span>`).join('')}</div>
        <div class="sword-blade">${renderDailySwordArt(state.length, { animated: true })}</div>
        <div class="sword-anvil" aria-hidden="true"></div>
        <div class="sword-hammer" aria-hidden="true"></div>
        <div class="sword-sparks" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<i style="--a:${-80 + i * 14}deg;--d:${(i % 4) * 40}ms"></i>`).join('')}</div>
        <div class="sword-length"><small>Длина</small><strong>${formatNumber(state.length)} <em>мм</em></strong></div>
      </section>
      <p class="sword-modifier">${modifierText(state)}</p>
      <button class="sword-roll" type="button" data-sword-roll ${canRoll ? '' : 'disabled'}>
        <strong>${canRoll ? 'Ковать' : 'Горн остывает'}</strong>
        <small data-sword-countdown>${canRoll ? '−10…+15 мм' : `Новая попытка через ${duration(state.remainMs)}`}</small>
      </button>
      <section class="sword-ranking">
        <div class="sword-ranking-head"><strong>Мечи группы</strong><span>${Array.isArray(state.ranking) ? state.ranking.length : 0}</span></div>
        <div class="sword-ranking-list">${rankingHtml(state.ranking)}</div>
      </section>`;
    content.querySelector('[data-sword-roll]')?.addEventListener('click', roll);
  }

  function tick() {
    if (state.canRoll) return;
    const remain = Math.max(0, Number(state.resetAt || 0) - Date.now());
    const node = content.querySelector('[data-sword-countdown]');
    if (node) node.textContent = remain > 0 ? `Новая попытка через ${duration(remain)}` : '−10…+15 мм';
    if (remain <= 0) { state = { ...state, canRoll: true, remainMs: 0 }; renderAll(); }
  }

  renderAll();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  timer = window.setInterval(tick, 1000);
}
