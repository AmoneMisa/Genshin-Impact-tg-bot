import { materialIcon } from './material-icons.js';
import { escapeHtml } from './escape-html.js';
import { icon } from './icons.js';

// Symbols (tattoos) of Lineage II: up to three at a time, each one is drawn with ten dyes and adena and changes the six
// base characteristics (+5 at most per characteristic from symbols; the losses always count).

const REASONS = {
  unknown_dye: 'Такой краски нет.',
  no_free_slot: 'Все слоты заняты. Сначала сотри символ.',
  profession_too_low: 'Мастер символов принимает только после второй профессии.',
  level_too_low: 'Твой уровень слишком низкий для этой краски.',
  class_cannot_use: 'Эта краска не для твоего класса.',
  bonus_capped: 'Бонус по этим характеристикам уже достиг +5.',
  not_enough_dyes: 'Не хватает красок.',
  not_enough_gold: 'Недостаточно золота.',
  no_such_symbol: 'Такого символа нет.',
};
const STAT_NAMES = {STR: 'Сила', DEX: 'Ловкость', CON: 'Выносливость', INT: 'Интеллект', WIT: 'Мудрость', MEN: 'Дух'};
const STATS = Object.keys(STAT_NAMES);
const number = value => new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
const signed = value => (value > 0 ? `+${value}` : String(value));

export async function openTattoosGame({ api, renderState, haptic, statusElement }) {
  const query = { page: 1, stat: null, owned: false, usable: true };
  let state = null;
  let pending = false;
  let feedback = '';

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay tattoos-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass tattoos-panel">
      <header class="ds-head">
        <button class="overlay-close ds-round" type="button" aria-label="Закрыть">←</button>
        <h2>Мастер символов</h2>
        <span class="ds-round" aria-hidden="true">${icon('sparkles')}</span>
      </header>
      <div data-content></div>
      <div class="boss-feedback" data-feedback aria-live="polite"></div>
    </div>`;
  const content = overlay.querySelector('[data-content]');
  const feedbackNode = overlay.querySelector('[data-feedback]');
  const close = () => { overlay.classList.add('closing'); window.setTimeout(() => overlay.remove(), 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  async function load(action = 'list', extra = {}) {
    if (pending) return;
    pending = true;
    overlay.classList.add('busy');
    try {
      const payload = await api('/api/tattoos', { method: 'POST', body: JSON.stringify({ action, ...query, query, ...extra }) });
      state = payload.tattoos;
      feedback = action === 'apply' ? 'Символ нанесён.' : action === 'remove' ? `Символ стёрт: вернулось красок — ${payload.returned}.` : '';
      if (action !== 'list' && payload.state) renderState(payload.state);
    } catch (error) {
      if (error.payload?.tattoos) state = error.payload.tattoos;
      feedback = REASONS[error.payload?.reason] || error.message;
      haptic('light');
    } finally {
      pending = false;
      overlay.classList.remove('busy');
      render();
    }
  }

  function totalsHtml() {
    return `<div class="tattoo-totals">${STATS.map(stat => {
      const value = state.totals[stat] || 0;
      return `<span class="${value > 0 ? 'plus' : value < 0 ? 'minus' : ''}"><small>${STAT_NAMES[stat]}</small><b>${value ? signed(value) : '0'}</b></span>`;
    }).join('')}</div>`;
  }

  function slotsHtml() {
    return `<div class="tattoo-slots">${Array.from({ length: state.maxSlots }, (_, index) => {
      const entry = state.worn[index];
      if (entry) {
        const stats = Object.entries(entry.stats).map(([stat, value]) => `${STAT_NAMES[stat]} ${signed(value)}`).join(', ');
        return `<div class="tattoo-slot"><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(stats)}</small>
          <button type="button" class="equipment-action" data-remove="${entry.index}">Стереть · 🪙 ${number(entry.cancelFee)} · вернётся ${entry.back}</button></div>`;
      }
      const open = index < state.slots;
      return `<div class="tattoo-slot ${open ? 'free' : 'locked'}"><strong>${open ? 'Свободный слот' : 'Закрыт'}</strong><small>${open ? 'Выбери краску ниже' : `Нужна 2-я профессия (с ${state.needLevel} уровня)`}</small></div>`;
    }).join('')}</div>`;
  }

  function dyeHtml(dye) {
    const effect = Object.entries(dye.stats).map(([stat, value]) => `<span class="${value > 0 ? 'plus' : 'minus'}">${STAT_NAMES[stat]} ${signed(value)}</span>`).join(' ');
    const enough = dye.have >= dye.need;
    const free = state.worn.length < state.slots;
    const note = !dye.levelOk ? `Нужен ${dye.level} уровень` : !dye.classOk ? 'Не для твоего класса' : !free ? 'Нет свободного слота' : '';
    const can = enough && dye.levelOk && dye.classOk && free && state.gold >= dye.fee;
    return `<article class="tattoo-dye ${can ? '' : 'poor'}">
      <span class="shop-icon">${materialIcon(`l2_${dye.dye}`)}</span>
      <div class="shop-item-copy">
        <h3>${escapeHtml(dye.name)}</h3>
        <p>${effect}</p>
        <small>${escapeHtml(note)}${note ? ' · ' : ''}красок ${number(dye.have)}/${number(dye.need)} · 🪙 ${number(dye.fee)} · ур. ${dye.level}</small>
      </div>
      <button type="button" class="shop-price" data-apply="${dye.dye}" ${can ? '' : 'disabled'}>Нанести</button>
    </article>`;
  }

  function render() {
    if (!state) { content.innerHTML = '<p class="shop-empty">Загрузка…</p>'; return; }
    const statChips = [null, ...STATS].map(stat => `<button type="button" class="equipment-filter ${query.stat === stat ? 'active' : ''}" data-stat="${stat || ''}">${stat ? STAT_NAMES[stat] : 'Все'}</button>`).join('');
    content.innerHTML = `
      <section class="mmo-frame"><div class="mmo-section-title"><strong>Символы</strong><small>${state.worn.length} / ${state.slots} · максимум +${state.cap} по характеристике</small></div>
        ${slotsHtml()}${totalsHtml()}</section>
      <section class="mmo-frame">
        <div class="mmo-section-title"><strong>Краски</strong><small>${number(state.total)}</small></div>
        <div class="equipment-filters">${statChips}</div>
        <label class="merchant-filter"><input type="checkbox" data-owned ${query.owned ? 'checked' : ''}> Только те, что у меня есть</label>
        <label class="merchant-filter"><input type="checkbox" data-usable ${query.usable ? 'checked' : ''}> Только подходящие мне</label>
        <div class="tattoo-dyes">${state.dyes.length ? state.dyes.map(dyeHtml).join('') : '<p class="shop-empty">Подходящих красок нет.</p>'}</div>
        <div class="pager"><button type="button" class="equipment-action" data-page="${state.page - 1}" ${state.page <= 1 ? 'disabled' : ''}>←</button>
          <span>${state.page} / ${state.pages}</span>
          <button type="button" class="equipment-action" data-page="${state.page + 1}" ${state.page >= state.pages ? 'disabled' : ''}>→</button></div>
      </section>`;
    feedbackNode.textContent = feedback;
    content.querySelectorAll('[data-stat]').forEach(button => button.addEventListener('click', () => { query.stat = button.dataset.stat || null; query.page = 1; load(); }));
    content.querySelector('[data-owned]').addEventListener('change', event => { query.owned = event.target.checked; query.page = 1; load(); });
    content.querySelector('[data-usable]').addEventListener('change', event => { query.usable = event.target.checked; query.page = 1; load(); });
    content.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => { query.page = Number(button.dataset.page); load(); }));
    content.querySelectorAll('[data-apply]').forEach(button => button.addEventListener('click', () => { haptic('medium'); load('apply', { dye: Number(button.dataset.apply) }); }));
    content.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => { haptic('medium'); load('remove', { index: Number(button.dataset.remove) }); }));
  }

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  render();
  await load();
  if (statusElement) statusElement.textContent = 'Мастер символов';
}
