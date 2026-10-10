import { materialIcon } from './material-icons.js';
import { escapeHtml } from './escape-html.js';
import { icon } from './icons.js';

// The merchants: equipment, gemstones, recipe books and scrolls sold as in the real Lineage II shops (adena and
// Ancient Adena prices; some goods also need materials such as Blank Scrolls).

const REASONS = {
  unknown_item: 'Товар больше не продаётся.',
  invalid_count: 'Неверное количество.',
  level_too_low: 'Твой уровень слишком низкий для этого предмета.',
  class_cannot_use: 'Твой класс не может носить этот предмет.',
  not_enough_gold: 'Недостаточно золота.',
  not_enough_aa: 'Недостаточно древней адены.',
  not_enough_materials: 'Не хватает материалов для обмена.',
};

const number = value => new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
const gradeText = grade => (grade === 'noGrade' ? 'NG' : String(grade || ''));

export async function openMerchantsGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/merchants');
  let merchantId = state.merchants[0]?.id;
  let onlyUsable = true;
  let pending = false;
  let confirming = null;

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
      <label class="merchant-filter"><input type="checkbox" data-usable checked> Только то, что подходит мне</label>
      <div class="shop-list" data-list></div>
      <div class="shop-feedback" data-feedback aria-live="polite"></div>
    </div>`;
  const wallet = overlay.querySelector('[data-wallet]');
  const tabs = overlay.querySelector('[data-tabs]');
  const list = overlay.querySelector('[data-list]');
  const feedback = overlay.querySelector('[data-feedback]');
  const close = () => { overlay.classList.add('closing'); window.setTimeout(() => overlay.remove(), 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);
  overlay.querySelector('[data-usable]').addEventListener('change', event => { onlyUsable = event.target.checked; renderList(); });

  function priceHtml(item) {
    const parts = [];
    if (item.cost.gold) parts.push(`🪙 ${number(item.cost.gold)}`);
    if (item.cost.aa) parts.push(`AA ${number(item.cost.aa)}`);
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
    const art = item.kind === 'equipment' ? icon('shield') : item.key ? materialIcon(item.key, escapeHtml(item.icon || '✦')) : '✦';
    return `<article class="shop-item merchant-item ${item.canPay && item.canUse ? '' : 'poor'} ${armed ? 'armed' : ''}">
      <span class="shop-icon">${art}</span>
      <div class="shop-item-copy">
        <h3>${escapeHtml(item.name)}${item.grade ? ` <small>${escapeHtml(gradeText(item.grade))}</small>` : ''}</h3>
        <p>${armed ? 'Нажми ещё раз, чтобы купить' : `${escapeHtml(note)}${note ? ' · ' : ''}${priceHtml(item)}`}</p>
      </div>
      <button type="button" class="shop-price ${armed ? 'confirming' : ''}" data-buy="${escapeHtml(item.id)}" ${item.canPay && item.canUse ? '' : 'disabled'}>${armed ? '✓' : 'Купить'}</button>
    </article>`;
  }

  function renderTabs() {
    tabs.innerHTML = state.merchants.map(merchant => `<button type="button" data-tab="${escapeHtml(merchant.id)}" class="${merchant.id === merchantId ? 'active' : ''}">${escapeHtml(merchant.title)}</button>`).join('');
    tabs.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
      merchantId = button.dataset.tab;
      confirming = null;
      haptic('light');
      renderAll();
    }));
  }

  function renderList() {
    const merchant = state.merchants.find(entry => entry.id === merchantId);
    const items = (merchant?.items || []).filter(item => !onlyUsable || item.canUse);
    list.innerHTML = (merchant ? `<p class="merchant-note">${escapeHtml(merchant.subtitle)}</p>` : '')
      + (items.length ? items.map(itemCard).join('') : '<div class="shop-empty">Здесь пока нечего купить.</div>');
    list.querySelectorAll('[data-buy]').forEach(button => button.addEventListener('click', () => buy(button.dataset.buy)));
  }

  function renderAll() {
    wallet.innerHTML = `🪙 ${number(state.gold)} · AA ${number(state.aa)}`;
    renderTabs();
    renderList();
  }

  async function buy(entryId) {
    if (pending) return;
    if (confirming !== entryId) {
      confirming = entryId;
      feedback.textContent = 'Нажми ещё раз, чтобы подтвердить покупку.';
      haptic('medium');
      renderList();
      return;
    }
    pending = true;
    confirming = null;
    overlay.classList.add('busy');
    haptic('heavy');
    try {
      const payload = await api('/api/merchants/buy', { method: 'POST', body: JSON.stringify({ merchant: merchantId, entry: entryId }) });
      state = payload.merchants;
      if (payload.state) renderState(payload.state);
      feedback.textContent = `Куплено: ${payload.entry.name}.`;
      if (statusElement) statusElement.textContent = 'Покупка совершена.';
    } catch (error) {
      if (error.payload?.merchants) state = error.payload.merchants;
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
      haptic('light');
    } finally {
      pending = false;
      overlay.classList.remove('busy');
      renderAll();
    }
  }

  renderAll();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
