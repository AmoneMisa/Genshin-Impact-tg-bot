import { escapeHtml } from './escape-html.js';

// Аукцион чата: лоты других игроков, продажа своих вещей и список своих лотов.

const REASONS = {
  lot_gone: 'Этот лот уже продан или снят.',
  own_lot: 'Свой лот купить нельзя.',
  not_enough_gold: 'Не хватает золота.',
  invalid_price: 'Цена: целое число золота от 1 до 1 000 000 000.',
  invalid_count: 'Количество: целое число от 1.',
  invalid_kind: 'Этот предмет нельзя продать.',
  item_not_found: 'Предмет не найден: обнови список.',
  item_equipped: 'Сначала сними предмет.',
  timed_item: 'Временный предмет нельзя продать.',
  not_enough: 'Столько у тебя нет.',
  too_many_lots: 'Слишком много лотов: максимум 10.',
  not_yours: 'Это чужой лот.',
};

const KIND_LABELS = { all: 'Всё', equipment: 'Снаряжение', potion: 'Зелья', material: 'Материалы' };
const SORT_LABELS = { new: 'Новые', cheap: 'Дешевле', expensive: 'Дороже' };
const formatNumber = value => new Intl.NumberFormat('ru-RU').format(Number(value) || 0);

export async function openAuctionGame({ api, renderState, haptic, statusElement }) {
  let kind = 'all';
  let sort = 'new';
  let tab = 'lots';
  let selected = null; // the item being put up: {kind, ref, title, count}
  let pending = false;
  let feedback = { kind: '', text: '' };
  const load = () => api(`/api/auction?kind=${encodeURIComponent(kind)}&sort=${encodeURIComponent(sort)}`);
  let state = await load();

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay auction-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass feedback-panel">
      <header class="ds-head">
        <button class="overlay-close ds-round" type="button" aria-label="Закрыть">←</button>
        <h2>Аукцион</h2>
        <span class="ds-round" aria-hidden="true">⚖️</span>
      </header>
      <div data-auction-body></div>
    </div>`;
  const body = overlay.querySelector('[data-auction-body]');
  const close = () => { overlay.classList.add('closing'); window.setTimeout(() => overlay.remove(), 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  const detailsHtml = lot => `
    ${lot.description ? `<p>${escapeHtml(lot.description)}</p>` : ''}
    ${lot.stats?.length ? `<p class="auction-stats">${lot.stats.map(escapeHtml).join(' · ')}</p>` : ''}`;

  function lotHtml(lot) {
    const action = lot.mine
      ? `<button type="button" class="feedback-submit" data-auction-cancel="${escapeHtml(lot.id)}">Снять с продажи</button>`
      : `<button type="button" class="feedback-submit" data-auction-buy="${escapeHtml(lot.id)}" ${state.gold < lot.price ? 'disabled' : ''}>Купить · ${formatNumber(lot.price)} 🪙</button>`;
    return `
      <article class="mail-letter pending auction-lot">
        <div class="mail-head"><strong>${lot.icon} ${escapeHtml(lot.title)}${lot.count > 1 ? ` ×${formatNumber(lot.count)}` : ''}${lot.enchant ? ` +${lot.enchant}` : ''}</strong><small>${lot.grade ? `${escapeHtml(lot.grade)} · ` : ''}${formatNumber(lot.price)} 🪙</small></div>
        ${detailsHtml(lot)}
        <small>${lot.mine ? 'Твой лот' : `Продавец: ${escapeHtml(lot.sellerName)}`} · ещё ${lot.hoursLeft} ч.</small>
        ${action}
      </article>`;
  }

  function lotsTab() {
    return `
      <nav class="fr-tabs luck-tabs" aria-label="Категория">${Object.entries(KIND_LABELS).map(([id, label]) => `<button type="button" data-auction-kind="${id}" class="${id === kind ? 'active' : ''}">${label}</button>`).join('')}</nav>
      <nav class="fr-tabs luck-tabs" aria-label="Сортировка">${Object.entries(SORT_LABELS).map(([id, label]) => `<button type="button" data-auction-sort="${id}" class="${id === sort ? 'active' : ''}">${label}</button>`).join('')}</nav>
      <div class="mail-list">${state.lots.length ? state.lots.map(lotHtml).join('') : '<p class="mail-empty">Лотов пока нет.</p>'}</div>`;
  }

  function sellTab() {
    if (selected) {
      return `
        <div class="feedback-card">
          <strong>${escapeHtml(selected.title)}</strong>
          ${selected.max > 1 ? `<label class="feedback-field"><span>Количество (до ${formatNumber(selected.max)})</span><input type="number" min="1" max="${selected.max}" step="1" value="${selected.max}" inputmode="numeric" data-sell-count /></label>` : ''}
          <label class="feedback-field"><span>Цена за весь лот, золото</span><input type="number" min="1" step="1" inputmode="numeric" data-sell-price placeholder="1000" /></label>
          <small>Комиссия ${Math.round(state.fee * 100)}% с продажи. Лот висит ${state.hours} ч., потом вещь вернётся.</small>
          <button type="button" class="feedback-submit" data-sell-confirm>Выставить</button>
          <button type="button" class="fr-btn ghost" data-sell-back>Назад</button>
        </div>`;
    }
    return `<div class="mail-list">${state.sellable.length ? state.sellable.map((entry, index) => `
      <article class="mail-letter pending">
        <div class="mail-head"><strong>${entry.icon} ${escapeHtml(entry.title)}${entry.count > 1 ? ` ×${formatNumber(entry.count)}` : ''}${entry.enchant ? ` +${entry.enchant}` : ''}</strong><small>${entry.grade ? escapeHtml(entry.grade) : KIND_LABELS[entry.kind === 'material' ? 'material' : entry.kind]}</small></div>
        <button type="button" class="feedback-submit" data-sell-pick="${index}">Продать</button>
      </article>`).join('') : '<p class="mail-empty">Нечего продавать: снимите снаряжение или добудьте материалы.</p>'}</div>`;
  }

  function mineTab() {
    return `<div class="mail-list">${state.mine.length ? state.mine.map(lotHtml).join('') : '<p class="mail-empty">У тебя нет активных лотов.</p>'}</div>
      <small>Активных лотов: ${state.mine.length} из ${state.maxLots}.</small>`;
  }

  function render() {
    body.innerHTML = `
      <div class="feedback-card"><div class="feedback-intro"><span>⚖️</span><div><strong>Золото: ${formatNumber(state.gold)}</strong>
        <p>Здесь игроки этого чата продают вещи друг другу. С продажи берётся комиссия ${Math.round(state.fee * 100)}%.</p></div></div></div>
      <nav class="fr-tabs luck-tabs" aria-label="Раздел">${[['lots', 'Лоты'], ['sell', 'Продать'], ['mine', `Мои (${state.mine.length})`]].map(([id, label]) => `<button type="button" data-auction-tab="${id}" class="${id === tab ? 'active' : ''}">${label}</button>`).join('')}</nav>
      ${tab === 'lots' ? lotsTab() : tab === 'sell' ? sellTab() : mineTab()}
      ${feedback.text ? `<div class="feedback-result ${feedback.kind}">${escapeHtml(feedback.text)}</div>` : ''}`;
    body.querySelectorAll('[data-auction-tab]').forEach(button => button.addEventListener('click', () => { tab = button.dataset.auctionTab; selected = null; feedback = { kind: '', text: '' }; haptic?.('light'); render(); }));
    body.querySelectorAll('[data-auction-kind]').forEach(button => button.addEventListener('click', async () => { kind = button.dataset.auctionKind; state = await load(); render(); }));
    body.querySelectorAll('[data-auction-sort]').forEach(button => button.addEventListener('click', async () => { sort = button.dataset.auctionSort; state = await load(); render(); }));
    body.querySelectorAll('[data-auction-buy]').forEach(button => button.addEventListener('click', () => act('/api/auction/buy', { lotId: button.dataset.auctionBuy }, 'Куплено!')));
    body.querySelectorAll('[data-auction-cancel]').forEach(button => button.addEventListener('click', () => act('/api/auction/cancel', { lotId: button.dataset.auctionCancel }, 'Лот снят, вещь вернулась к тебе.')));
    body.querySelectorAll('[data-sell-pick]').forEach(button => button.addEventListener('click', () => {
      const entry = state.sellable[Number(button.dataset.sellPick)];
      selected = { kind: entry.kind, ref: entry.ref, title: entry.title, max: entry.count };
      render();
    }));
    body.querySelector('[data-sell-back]')?.addEventListener('click', () => { selected = null; render(); });
    body.querySelector('[data-sell-confirm]')?.addEventListener('click', () => {
      const count = Number(body.querySelector('[data-sell-count]')?.value || 1);
      const price = Number(body.querySelector('[data-sell-price]').value);
      act('/api/auction/list', { kind: selected.kind, ref: selected.ref, count, price }, 'Лот выставлен.', () => { selected = null; tab = 'mine'; });
    });
  }

  async function act(path, payload, okText, after = () => {}) {
    if (pending) return;
    pending = true;
    haptic?.('medium');
    try {
      const result = await api(path, { method: 'POST', body: JSON.stringify(payload) });
      state = result.auction;
      feedback = { kind: 'success', text: result.fee ? `${okText} Комиссия продавца: ${formatNumber(result.fee)} 🪙.` : okText };
      after();
      renderState?.(result.state);
      if (statusElement) statusElement.textContent = `Аукцион: ${okText}`;
    } catch (error) {
      if (error.payload?.auction) state = error.payload.auction;
      feedback = { kind: 'error', text: REASONS[error.payload?.reason] || error.message };
    } finally {
      pending = false;
      render();
    }
  }

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  render();
}
