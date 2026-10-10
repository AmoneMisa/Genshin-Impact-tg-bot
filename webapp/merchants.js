import { materialIcon } from './material-icons.js';
import { escapeHtml } from './escape-html.js';
import { icon } from './icons.js';
import {L2_UI_ART,l2IconHtml} from './art/l2-icon-art.js';
import {itemArtKey,itemArtSources} from './art/items-art.js';
import {normalizeLootKind} from './loot-renderer.js';

// The merchants: equipment, gemstones, dyes, recipe books, ammunition and scrolls sold as in the real Lineage II
// shops. The server filters and pages the stock, so only one page of a merchant is ever loaded.

const REASONS = {
  unknown_item: 'Товар больше не продаётся.',
  invalid_count: 'Неверное количество.',
  level_too_low: 'Твой уровень слишком низкий для этого предмета.',
  class_cannot_use: 'Твой класс не может носить этот предмет.',
  not_enough_gold: 'Недостаточно золота.',
  not_enough_aa: 'Недостаточно древней адены.',
  not_enough_materials: 'Не хватает материалов для обмена.',
  not_enough_ammo: 'Нет столько стрел или болтов.',
  invalid_kind: 'Неверный вид боеприпасов.',
  invalid_grade: 'Неверный грейд.',
};

const number = value => new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
const gradeText = grade => (grade === 'noGrade' ? 'NG' : String(grade || ''));
const CONVERT_TAB = 'convert';
const STAT_NAMES = { STR: 'Сила', DEX: 'Ловкость', CON: 'Выносливость', INT: 'Интеллект', WIT: 'Мудрость', MEN: 'Дух' };

/** The pair of a dye: the gain in green, the loss in red. */
function symbolHtml(symbol) {
  const stats = Object.entries(symbol.stats).sort((a, b) => b[1] - a[1])
    .map(([stat, value]) => `<b class="${value > 0 ? 'plus' : 'minus'}">${STAT_NAMES[stat] || stat} ${value > 0 ? '+' : ''}${value}</b>`).join(' · ');
  return `<small class="merchant-symbol">${stats} · ${symbol.level} ур. · ${symbol.dyes} красок</small>`;
}

export async function openMerchantsGame({ api, renderState, haptic, statusElement }) {
  const query = { merchant: null, page: 1, grade: null, group: null, search: '', usable: true, affordable: false };
  let state = null;
  let tab = null;
  let pending = false;
  let confirming = null;
  let searchTimer = 0;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay merchants-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass merchants-panel">
      <header class="shop-head">
        <button class="overlay-close shop-back" type="button" aria-label="Закрыть">←</button>
        <h2>Торговцы</h2>
        <strong class="shop-wallet" data-wallet></strong>
      </header>
      <div class="shop-categories" data-tabs></div>
      <div data-body></div>
      <div class="shop-feedback" data-feedback aria-live="polite"></div>
    </div>`;
  const wallet = overlay.querySelector('[data-wallet]');
  const tabs = overlay.querySelector('[data-tabs]');
  const body = overlay.querySelector('[data-body]');
  const feedback = overlay.querySelector('[data-feedback]');
  const close = () => { window.clearTimeout(searchTimer); overlay.classList.add('closing'); window.setTimeout(() => overlay.remove(), 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  async function load(path = '/api/merchants', payload = {}) {
    if (pending) return null;
    pending = true;
    overlay.classList.add('busy');
    try {
      const response = await api(path, { method: 'POST', body: JSON.stringify({ ...query, ...payload }) });
      state = response.action ? response.merchants : response;
      return response;
    } catch (error) {
      if (error.payload?.merchants) state = error.payload.merchants;
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
      haptic('light');
      return null;
    } finally {
      pending = false;
      overlay.classList.remove('busy');
      render();
    }
  }

  function priceHtml(item) {
    const parts = [];
    if (item.cost.gold) parts.push(`🪙 ${number(item.cost.gold)}`);
    if (item.cost.aa) parts.push(`${materialIcon('aa')} AA ${number(item.cost.aa)}`);
    for (const material of item.cost.materials) {
      parts.push(`<span class="${material.have >= material.need ? '' : 'missing'}">${materialIcon(material.key)} ${escapeHtml(material.name)} ${number(material.have)}/${number(material.need)}</span>`);
    }
    return parts.join(' · ');
  }

  function itemCard(item) {
    const armed = confirming === item.id;
    const note = !item.canUse
      ? (item.useReason === 'level_too_low' ? `Нужен ${item.minLevel} уровень` : 'Не подходит твоему классу')
      : item.kind === 'sp' ? `+${number(item.amount)} ОП` : item.amount > 1 ? `×${number(item.amount)}` : '';
    let art=item.key?materialIcon(item.key,escapeHtml(item.icon||'✦')):icon('sparkle');
    if(item.kind==='equipment'){
      const [grade,mainType,kind,slot]=String(item.itemId||item.id.slice(3)).split(':');
      const definition={name:item.name,grade,mainType,kind,category:slot||kind};
      const image=itemArtSources(itemArtKey(normalizeLootKind(definition),definition));
      art=`<img class="merchant-equipment-art" src="${image.src}" srcset="${image.srcset}" sizes="48px" width="48" height="48" alt="" loading="lazy" decoding="async">`;
    }
    return `<article class="shop-item merchant-item ${item.canPay && item.canUse ? '' : 'poor'} ${armed ? 'armed' : ''}">
      <span class="shop-icon">${art}</span>
      <div class="shop-item-copy">
        <h3>${escapeHtml(item.name)}${item.grade ? ` <small>${escapeHtml(gradeText(item.grade))}</small>` : ''}</h3>
        ${item.symbol ? symbolHtml(item.symbol) : ''}
        <p>${armed ? 'Нажми ещё раз, чтобы купить' : `${escapeHtml(note)}${note ? ' · ' : ''}${priceHtml(item)}`}</p>
      </div>
      <button type="button" class="shop-price ${armed ? 'confirming' : ''}" data-buy="${escapeHtml(item.id)}" ${item.canPay && item.canUse ? '' : 'disabled'}>${armed ? '✓' : 'Купить'}</button>
    </article>`;
  }

  function filtersHtml() {
    const grades = ['', ...state.facets.grades].map(grade => `<button type="button" class="equipment-filter ${(query.grade || '') === grade ? 'active' : ''}" data-grade="${escapeHtml(grade)}">${grade ? escapeHtml(gradeText(grade)) : 'Все грейды'}</button>`).join('');
    const groups = [{ id: '', label: 'Все виды' }, ...state.facets.groups].map(group => `<option value="${escapeHtml(group.id)}" ${(query.group || '') === group.id ? 'selected' : ''}>${escapeHtml(group.label)}</option>`).join('');
    return `<div class="merchant-filters">
      ${state.facets.grades.length ? `<div class="equipment-filters">${grades}</div>` : ''}
      <div class="merchant-row">
        <select data-group aria-label="Вид товара">${groups}</select>
        <input type="search" data-search placeholder="Поиск по названию" value="${escapeHtml(query.search)}" maxlength="40">
      </div>
      <label class="merchant-filter"><input type="checkbox" data-usable ${query.usable ? 'checked' : ''}> Только то, что подходит мне</label>
      <label class="merchant-filter"><input type="checkbox" data-affordable ${query.affordable ? 'checked' : ''}> Только то, что мне по карману</label>
    </div>`;
  }

  function convertHtml() {
    const rows = state.convert.map(row => `<div class="convert-row">
      <strong>${escapeHtml(gradeText(row.grade))}</strong>
      <span>Стрелы ${number(row.arrows)} · Болты ${number(row.bolts)}</span>
      <button type="button" class="equipment-action" data-convert="arrow:${escapeHtml(row.grade)}" ${row.arrows ? '' : 'disabled'}>Стрелы → болты</button>
      <button type="button" class="equipment-action" data-convert="bolt:${escapeHtml(row.grade)}" ${row.bolts ? '' : 'disabled'}>Болты → стрелы</button>
    </div>`).join('');
    return `<p class="merchant-note">Чёрный торговец Маммона меняет стрелы на болты и обратно один к одному, бесплатно. Нужны для луков и арбалетов своего грейда.</p>${rows}`;
  }

  function render() {
    if (!state) { body.innerHTML = '<div class="shop-empty">Загрузка…</div>'; return; }
    wallet.innerHTML = `${materialIcon('gold')} ${number(state.gold)} · ${materialIcon('aa')} ${number(state.aa)}`;
    const active = tab || state.merchant;
    tabs.innerHTML = state.merchants.map(merchant => `<button type="button" data-tab="${escapeHtml(merchant.id)}" class="${merchant.id === active ? 'active' : ''}">${l2IconHtml(L2_UI_ART['merchant-'+merchant.id])} ${escapeHtml(merchant.title)}</button>`).join('')
      + `<button type="button" data-tab="${CONVERT_TAB}" class="${active === CONVERT_TAB ? 'active' : ''}">Боеприпасы</button>`;
    const ammo = state.ammo ? `<p class="merchant-note">В руках: ${escapeHtml(state.ammo.name)} — ${number(state.ammo.count)} шт.</p>` : '';
    if (active === CONVERT_TAB) {
      body.innerHTML = ammo + convertHtml();
    } else {
      const meta = state.merchants.find(merchant => merchant.id === state.merchant);
      const banner=L2_UI_ART['merchant-'+state.merchant]?`<img class="merchant-banner" src="/art/merchants/${state.merchant}-720.webp" srcset="/art/merchants/${state.merchant}-480.webp 480w, /art/merchants/${state.merchant}-720.webp 720w" sizes="(max-width: 600px) calc(100vw - 40px), 560px" width="720" height="480" alt="${escapeHtml(meta?.title || '')}" decoding="async">`:'';
      body.innerHTML = `${banner}${ammo}<p class="merchant-note">${escapeHtml(meta?.subtitle || '')}</p>${filtersHtml()}
        <div class="shop-list">${state.items.length ? state.items.map(itemCard).join('') : '<div class="shop-empty">Ничего не найдено.</div>'}</div>
        <div class="pager"><button type="button" class="equipment-action" data-page="${state.page - 1}" ${state.page <= 1 ? 'disabled' : ''}>←</button>
          <span>${state.page} / ${state.pages} · ${number(state.total)}</span>
          <button type="button" class="equipment-action" data-page="${state.page + 1}" ${state.page >= state.pages ? 'disabled' : ''}>→</button></div>`;
    }
    bind();
  }

  function bind() {
    tabs.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
      confirming = null;
      haptic('light');
      if (button.dataset.tab === CONVERT_TAB) { tab = CONVERT_TAB; render(); return; }
      tab = null;
      query.merchant = button.dataset.tab;
      query.page = 1; query.grade = null; query.group = null; query.search = '';
      load();
    }));
    body.querySelectorAll('[data-grade]').forEach(button => button.addEventListener('click', () => { query.grade = button.dataset.grade || null; query.page = 1; confirming = null; load(); }));
    body.querySelector('[data-group]')?.addEventListener('change', event => { query.group = event.target.value || null; query.page = 1; confirming = null; load(); });
    body.querySelector('[data-usable]')?.addEventListener('change', event => { query.usable = event.target.checked; query.page = 1; load(); });
    body.querySelector('[data-affordable]')?.addEventListener('change', event => { query.affordable = event.target.checked; query.page = 1; load(); });
    body.querySelector('[data-search]')?.addEventListener('input', event => {
      window.clearTimeout(searchTimer);
      const value = event.target.value;
      searchTimer = window.setTimeout(() => { query.search = value; query.page = 1; load(); }, 350);
    });
    body.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => { query.page = Number(button.dataset.page); confirming = null; load(); }));
    body.querySelectorAll('[data-buy]').forEach(button => button.addEventListener('click', () => buy(button.dataset.buy)));
    body.querySelectorAll('[data-convert]').forEach(button => button.addEventListener('click', () => convert(button.dataset.convert)));
  }

  async function buy(entryId) {
    if (pending) return;
    if (confirming !== entryId) {
      confirming = entryId;
      feedback.textContent = 'Нажми ещё раз, чтобы подтвердить покупку.';
      haptic('medium');
      render();
      return;
    }
    confirming = null;
    haptic('heavy');
    const response = await load('/api/merchants/buy', { merchant: state.merchant, entry: entryId, query: { ...query, merchant: state.merchant } });
    if (response?.ok) {
      if (response.state) renderState(response.state);
      feedback.textContent = `Куплено: ${response.entry.name}.`;
      if (statusElement) statusElement.textContent = 'Покупка совершена.';
      render();
    }
  }

  async function convert(spec) {
    const [from, grade] = spec.split(':');
    const row = state.convert.find(entry => entry.grade === grade);
    const count = from === 'arrow' ? row?.arrows : row?.bolts;
    haptic('medium');
    const response = await load('/api/merchants/convert', { from, grade, count, query: { ...query, merchant: state.merchant } });
    if (response?.ok) {
      feedback.textContent = `Обменяно: ${number(response.count)} шт.`;
      render();
    }
  }

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  render();
  await load();
}
