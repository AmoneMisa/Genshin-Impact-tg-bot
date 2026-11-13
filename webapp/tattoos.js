import {dialogHeading} from './dialog-heading.js';
import { materialIcon } from './material-icons.js';
import { escapeHtml } from './escape-html.js';
import {itemGridHtml} from './item-grid.js';
import {installOverlayA11y} from './overlay-a11y.js';
import {openDetailDialog} from './detail-dialog.js';
import {confirmDialog} from './confirm-dialog.js';

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

export async function openTattoosGame({ api, renderState, haptic, statusElement, onClose }) {
  installOverlayA11y();
  const query = { page: 1, stat: null, owned: false, usable: true };
  let state = null;
  let pending = false;
  let feedback = '';
  let detail = null, open = null; // open: {kind: 'dye'|'slot', id}

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay tattoos-overlay character-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel game-dialog-panel l2-status-window character-panel tattoos-panel">
      ${dialogHeading('Мастер символов').replace('data-dismiss', 'class="overlay-close" data-dismiss')}
      <div class="character-scroll" data-content></div>
      <p class="tattoo-feedback" data-feedback role="status" hidden></p>
    </div>`;
  const content = overlay.querySelector('[data-content]');
  const feedbackNode = overlay.querySelector('[data-feedback]');
  const closeDetail = () => { open = null; detail?.close(); detail = null; };
  const close = () => { closeDetail(); overlay.classList.add('closing'); window.setTimeout(() => { overlay.remove(); onClose?.(); }, 180); };
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
      if (action !== 'list') closeDetail();
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

  const section = (title, html, note = '') => `<section class="character-section"><h3>${escapeHtml(title)}${note ? ` <small>${escapeHtml(note)}</small>` : ''}</h3><div class="character-section-body">${html}</div></section>`;
  const row = (label, value) => `<div class="character-row"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`;
  const gold = value => `<span class="ui-inline-content">${materialIcon('gold')} ${number(value)}</span>`;
  const statsText = stats => Object.entries(stats).map(([stat, value]) => `${STAT_NAMES[stat]} ${signed(value)}`).join(', ');

  function totalsHtml() {
    return `<div class="tattoo-totals">${STATS.map(stat => {
      const value = state.totals[stat] || 0;
      return `<span class="${value > 0 ? 'plus' : value < 0 ? 'minus' : ''}"><small>${STAT_NAMES[stat]}</small><b>${value ? signed(value) : '0'}</b></span>`;
    }).join('')}</div>`;
  }

  // A worn symbol opens its details with the removal; free and closed slots only show their state.
  function slotsHtml() {
    return `<div class="ui-choice-list tattoo-slots">${Array.from({ length: state.maxSlots }, (_, index) => {
      const entry = state.worn[index];
      if (entry) return `<button type="button" class="ui-button ui-choice-row compact" data-slot="${entry.index}"><span>${escapeHtml(entry.name)}<small>${escapeHtml(statsText(entry.stats))}</small></span></button>`;
      const free = index < state.slots;
      return `<div class="tattoo-slot ${free ? 'free' : 'locked'}"><strong>${free ? 'Свободный слот' : 'Закрыт'}</strong><small>${free ? 'Выбери краску ниже' : `Нужна 2-я профессия (с ${state.needLevel} уровня)`}</small></div>`;
    }).join('')}</div>`;
  }

  const dyeBlock = dye => !dye.levelOk ? `Нужен ${dye.level} уровень` : !dye.classOk ? 'Не для твоего класса' : state.worn.length >= state.slots ? 'Нет свободного слота' : dye.have < dye.need ? 'Не хватает красок' : state.gold < dye.fee ? 'Не хватает адены' : '';

  function dyeCell(dye) {
    return `<button type="button" class="item-grid-cell ${dyeBlock(dye) ? 'insufficient' : ''}" data-dye="${dye.dye}" aria-label="${escapeHtml(dye.name)}" title="${escapeHtml(dye.name)} · ${escapeHtml(statsText(dye.stats))}">${materialIcon(`l2_${dye.dye}`)}<em class="item-grid-count">${number(dye.have)}</em></button>`;
  }

  function dyeDetailHtml(dye) {
    const block = dyeBlock(dye);
    const affected = STATS.filter(stat => (state.totals[stat] || 0) !== (dye.after?.[stat] || 0) || dye.stats[stat]);
    const compare = affected.map(stat => {
      const before = state.totals[stat] || 0, after = dye.after?.[stat] ?? before;
      return row(STAT_NAMES[stat], `${signed(before)} → <span class="${after > before ? 'plus' : after < before ? 'minus' : ''}">${signed(after)}</span>`);
    }).join('');
    return `${section('Эффект', `<p class="tattoo-effect">${escapeHtml(statsText(dye.stats))}</p>`)}
      ${section('После нанесения', `<div class="ui-stat-table tattoo-compare">${compare}</div><p class="character-empty">Прибавка к характеристике не больше +${state.cap}.</p>`)}
      ${section('Условия', `<div class="ui-stat-table">${row('Краски', `${number(dye.have)} / ${number(dye.need)}`)}${row('Плата', gold(dye.fee))}${row('Уровень', `${dye.level}`)}</div>`)}
      ${block ? `<p class="character-empty" role="status">${escapeHtml(block)}</p>` : `<button type="button" class="ui-button primary" data-apply="${dye.dye}" ${pending ? 'disabled' : ''}>Нанести · ${number(dye.fee)} адены</button>`}`;
  }

  function slotDetailHtml(entry) {
    return `${section('Эффект', `<p class="tattoo-effect">${escapeHtml(statsText(entry.stats))}</p>`)}
      ${section('Стирание', `<div class="ui-stat-table">${row('Плата', gold(entry.cancelFee))}${row('Вернётся красок', number(entry.back))}</div>`)}
      <button type="button" class="ui-button" data-remove="${entry.index}" ${pending ? 'disabled' : ''}>Стереть символ</button>`;
  }

  function showDetail(kind, id) {
    const item = kind === 'dye' ? state.dyes.find(d => String(d.dye) === String(id)) : state.worn.find(w => String(w.index) === String(id));
    if (!item) { closeDetail(); return; }
    open = { kind, id };
    const html = kind === 'dye' ? dyeDetailHtml(item) : slotDetailHtml(item);
    if (detail?.open) { detail.update(item.name, html); return; }
    detail = openDetailDialog({
      owner: overlay, title: item.name, html,
      onClose: () => { open = null; detail = null; },
      onAction: async button => {
        if (button.dataset.apply) { haptic('medium'); load('apply', { dye: Number(button.dataset.apply) }); }
        if (button.dataset.remove && await confirmDialog({ owner: overlay, title: 'Стереть символ', text: `Стереть «${item.name}»? Плата ${number(item.cancelFee)} адены, вернётся красок: ${number(item.back)}.`, confirmLabel: 'Стереть' })) {
          haptic('medium'); load('remove', { index: Number(button.dataset.remove) });
        }
      },
    });
  }

  function render() {
    if (!state) { content.innerHTML = '<p class="character-empty">Загрузка…</p>'; return; }
    const statChips = [null, ...STATS].map(stat => `<button type="button" class="equipment-filter ${query.stat === stat ? 'active' : ''}" aria-pressed="${query.stat === stat}" data-stat="${stat || ''}">${stat ? STAT_NAMES[stat] : 'Все'}</button>`).join('');
    const pager = state.pages > 1 ? `<div class="pager"><button type="button" class="ui-button" data-page="${state.page - 1}" aria-label="Предыдущая страница" ${state.page <= 1 ? 'disabled' : ''}>←</button>
          <span>${state.page} / ${state.pages}</span>
          <button type="button" class="ui-button" data-page="${state.page + 1}" aria-label="Следующая страница" ${state.page >= state.pages ? 'disabled' : ''}>→</button></div>` : '';
    content.innerHTML = section('Символы', slotsHtml() + totalsHtml(), `${state.worn.length} / ${state.slots} · максимум +${state.cap} по характеристике`)
      + section('Краски', `<div class="equipment-filters">${statChips}</div>
        <label class="ui-check"><input type="checkbox" data-owned ${query.owned ? 'checked' : ''}> Только те, что у меня есть</label>
        <label class="ui-check"><input type="checkbox" data-usable ${query.usable ? 'checked' : ''}> Только подходящие мне</label>
        ${state.dyes.length ? itemGridHtml(state.dyes.map(dyeCell), { min: 0, fill: false, label: 'Краски', className: 'tattoo-dyes' }) : '<p class="character-empty">Подходящих красок нет.</p>'}${pager}`, number(state.total));
    feedbackNode.hidden = !feedback;
    feedbackNode.textContent = feedback;
    if (open) showDetail(open.kind, open.id);
  }

  content.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled || pending) return;
    if (button.dataset.stat !== undefined) { query.stat = button.dataset.stat || null; query.page = 1; load(); }
    if (button.dataset.page) { query.page = Number(button.dataset.page); load(); }
    if (button.dataset.dye) { haptic('light'); showDetail('dye', button.dataset.dye); }
    if (button.dataset.slot) { haptic('light'); showDetail('slot', button.dataset.slot); }
  });
  content.addEventListener('change', event => {
    if (event.target.matches('[data-owned]')) { query.owned = event.target.checked; query.page = 1; load(); }
    if (event.target.matches('[data-usable]')) { query.usable = event.target.checked; query.page = 1; load(); }
  });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  render();
  await load();
  if (statusElement) statusElement.textContent = 'Мастер символов';
}
