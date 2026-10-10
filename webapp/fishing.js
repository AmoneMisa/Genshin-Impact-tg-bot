import { materialIcon } from './material-icons.js';
import { escapeHtml } from './escape-html.js';
import { icon } from './icons.js';

// Fishing: no minigame. Cast by hand or switch on auto fishing; a daily number of casts limits both. The catch is
// fish, which turn into oils, scales and bones (the dye ingredients) when opened.

const REASONS = {
  no_rod: 'Нужна удочка. Купи её у рыбака (раздел «Торговцы»).',
  not_ready: 'Удочка ещё не готова.',
  not_a_fish: 'Это не рыба.',
  no_fish: 'Рыбы нет.',
};
const number = value => new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
const seconds = ms => `${Math.ceil(Math.max(0, ms) / 1000)} с`;

export async function openFishingGame({ api, renderState, haptic, statusElement }) {
  let state = null;
  let pending = false;
  let feedback = '';
  let timer = 0;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay fishing-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass fishing-panel">
      <header class="ds-head">
        <button class="overlay-close ds-round" type="button" aria-label="Закрыть">←</button>
        <h2>Рыбалка</h2>
        <span class="ds-round" aria-hidden="true">${icon('sparkles')}</span>
      </header>
      <div data-content></div>
      <div class="boss-feedback" data-feedback aria-live="polite"></div>
    </div>`;
  const content = overlay.querySelector('[data-content]');
  const feedbackNode = overlay.querySelector('[data-feedback]');
  const close = () => { window.clearInterval(timer); overlay.classList.add('closing'); window.setTimeout(() => overlay.remove(), 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  const caughtText = list => (list || []).map(row => `${row.name} ×${row.amount}`).join(', ');

  async function run(action = 'state', body = {}, quiet = false) {
    if (pending) return;
    pending = true;
    if (!quiet) overlay.classList.add('busy');
    try {
      const payload = await api('/api/fishing', { method: 'POST', body: JSON.stringify({ action, ...body }) });
      state = payload.fishing;
      if (action === 'cast' || action === 'state') feedback = payload.caught?.length ? `Улов: ${caughtText(payload.caught)}.` : (quiet ? feedback : '');
      if (action === 'auto') feedback = payload.auto ? 'Автоловля включена.' : 'Автоловля выключена.';
      if (action === 'open') feedback = payload.items.length ? `Разобрано ${number(payload.opened)}: ${payload.items.map(row => `${row.name} ×${row.amount}`).join(', ')}.` : `Разобрано ${number(payload.opened)}, ничего не выпало.`;
      if (action !== 'state' && payload.state) renderState(payload.state);
    } catch (error) {
      if (error.payload?.fishing) state = error.payload.fishing;
      feedback = REASONS[error.payload?.reason] || error.message;
      haptic('light');
    } finally {
      pending = false;
      overlay.classList.remove('busy');
      render();
    }
  }

  function rodsHtml() {
    return `<div class="fishing-rods">${state.rods.map(rod => `<span class="${rod.owned ? 'owned' : ''} ${rod.usable ? '' : 'locked'}">${escapeHtml(rod.name)} <b>${rod.grade === 'noGrade' ? 'NG' : rod.grade}</b><small>${rod.level} ур. · скорость ${rod.damage} · ${number(rod.limit)} рыб в день${rod.owned ? ' · есть' : ''}</small></span>`).join('')}</div>`;
  }

  function fishHtml() {
    if (!state.fishBag.length) return '<p class="party-note">Рыбы в сумке нет.</p>';
    return `<div class="fishing-bag">${state.fishBag.map(fish => `<article class="fishing-fish">
      <span class="shop-icon">${materialIcon(`l2_${fish.item}`)}</span>
      <div class="shop-item-copy"><h3>${escapeHtml(fish.name)} <small>×${number(fish.count)}</small></h3>
        <p>${fish.can.map(product => `${escapeHtml(product.name)} ×${product.amount} (${product.chance}%)`).join(' · ')}</p></div>
      <button type="button" class="shop-price" data-open="${fish.item}">Разобрать</button>
    </article>`).join('')}</div>`;
  }

  function render() {
    if (!state) { content.innerHTML = '<p class="shop-empty">Загрузка…</p>'; return; }
    const ready = state.rod && state.nextCastMs <= 0;
    content.innerHTML = `
      <section class="mmo-frame">
        <div class="mmo-section-title"><strong>${state.rod ? escapeHtml(state.rod.name) : 'Нет удочки'}</strong><small>рыба до ${state.fishLevel} ур.</small></div>
        <p class="party-note">Заброс: ${state.rod ? seconds(state.rod.castMs) : '—'} · рыбы сегодня ${number(state.fishToday)} / ${number(state.limit)} · всего забросов ${number(state.total)}</p>
        ${state.overLimit ? `<p class="party-note">Дневная норма выловлена: теперь клюёт крайне редко (${(state.overChance * 100).toFixed(1)}% на заброс).</p>` : ''}
        ${state.shot ? `<label class="merchant-filter"><input type="checkbox" data-shots ${state.shots ? 'checked' : ''}> ${escapeHtml(state.shot.name)}: ${number(state.shot.count)} шт. — вдвое быстрее</label>` : ''}
        <div class="party-actions">
          <button type="button" class="equipment-action forge-action" data-cast ${ready ? '' : 'disabled'}>${state.nextCastMs > 0 && state.rod ? `Через ${seconds(state.nextCastMs)}` : 'Забросить удочку'}</button>
          <button type="button" class="equipment-action ${state.auto ? 'active' : ''}" data-auto="${state.auto ? '0' : '1'}" ${state.rod ? '' : 'disabled'}>${state.auto ? 'Остановить автоловлю' : 'Автоловля'}</button>
        </div>
        ${rodsHtml()}
      </section>
      <section class="mmo-frame">
        <div class="mmo-section-title"><strong>Улов</strong><small>${number(state.fishBag.reduce((sum, fish) => sum + fish.count, 0))} рыб</small></div>
        ${state.fishBag.length ? '<button type="button" class="equipment-action" data-open-all>Разобрать всё</button>' : ''}
        ${fishHtml()}
      </section>`;
    feedbackNode.textContent = feedback;
    content.querySelector('[data-cast]')?.addEventListener('click', () => { haptic('light'); run('cast'); });
    content.querySelector('[data-auto]')?.addEventListener('click', event => { haptic('medium'); run('auto', { enabled: event.currentTarget.dataset.auto === '1' }); });
    content.querySelector('[data-shots]')?.addEventListener('change', event => { run('shots', { enabled: event.target.checked }, true); });
    content.querySelector('[data-open-all]')?.addEventListener('click', () => { haptic('medium'); run('open', { item: 'all', count: 'all' }); });
    content.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => { haptic('light'); run('open', { item: Number(button.dataset.open), count: 'all' }); }));
  }

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  render();
  await run('state');
  // while auto fishing runs the catch is settled by asking; the screen asks every few seconds
  timer = window.setInterval(() => { if (state?.auto && !document.hidden) run('state', {}, true); }, 15000);
  if (statusElement) statusElement.textContent = 'Рыбалка';
}
