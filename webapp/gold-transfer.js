const REASONS = {
  invalid_amount: 'Введи целое положительное количество золота.',
  self_transfer: 'Нельзя перевести золото самому себе.',
  sender_not_found: 'Не удалось найти твоего персонажа в этом чате.',
  recipient_not_found: 'Получатель больше недоступен. Обнови список.',
  not_enough_gold: 'На балансе недостаточно золота.',
  chat_not_found: 'Игровой чат не найден.',
};

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('');
}

export async function openGoldTransfer({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/gold-transfer');
  let selectedId = state.recipients[0]?.id || null;
  let pending = false;
  let lastSuccess = null;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay gold-transfer-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass gold-transfer-panel">
      <header class="overlay-head">
        <div><div class="eyebrow">TRANSFER · MONGO</div><h2>Передать золото</h2></div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>
      <p class="overlay-copy">Перевод выполняется на сервере одной операцией над отправителем и получателем. Отрицательные суммы, дроби и недоступные участники блокируются.</p>
      <div data-transfer-content></div>
      <div class="gold-transfer-feedback" data-transfer-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-transfer-content]');
  const feedback = overlay.querySelector('[data-transfer-feedback]');

  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function selectedRecipient() {
    return state.recipients.find(recipient => recipient.id === selectedId) || null;
  }

  function recipientList() {
    if (!state.recipients.length) {
      return `
        <section class="gold-empty">
          <span>👤</span>
          <strong>Некому переводить</strong>
          <p>В этом игровом чате сейчас нет доступных участников кроме тебя.</p>
        </section>`;
    }

    return `
      <div class="gold-recipient-list">
        ${state.recipients.map(recipient => `
          <button type="button" class="gold-recipient ${recipient.id === selectedId ? 'active' : ''}" data-recipient="${escapeHtml(recipient.id)}">
            <span class="gold-avatar">${escapeHtml(initials(recipient.name))}</span>
            <span class="gold-recipient-copy">
              <strong>${escapeHtml(recipient.name)}</strong>
              <small>${recipient.username ? `@${escapeHtml(recipient.username)}` : `ID ${escapeHtml(recipient.id)}`}</small>
            </span>
            <i>${recipient.id === selectedId ? '✓' : '›'}</i>
          </button>`).join('')}
      </div>`;
  }

  function transferForm() {
    const recipient = selectedRecipient();
    if (!recipient) return '';

    const quick = [100, 1000, 5000, 10000].filter(value => value <= state.gold);
    const defaultAmount = Math.min(100, Math.floor(state.gold));

    return `
      <section class="gold-transfer-form">
        <div class="gold-balance-row"><span>Твой баланс</span><strong>🪙 ${formatNumber(state.gold)}</strong></div>
        <div class="gold-to-row"><span>Получатель</span><strong>${escapeHtml(recipient.name)}</strong></div>
        <label class="gold-amount-field">
          <span>Количество</span>
          <div><b>🪙</b><input type="number" min="1" step="1" max="${Math.floor(state.gold)}" value="${defaultAmount || ''}" inputmode="numeric" data-transfer-amount /></div>
        </label>
        <div class="gold-quick-row">
          ${quick.map(value => `<button type="button" data-transfer-quick="${value}">${formatNumber(value)}</button>`).join('')}
          ${state.gold > 0 ? `<button type="button" data-transfer-quick="${Math.floor(state.gold)}">Всё</button>` : ''}
        </div>
        <button type="button" class="gold-send-button" data-transfer-send ${state.gold <= 0 ? 'disabled' : ''}>
          <span>↗</span><div><strong>Перевести</strong><small>${escapeHtml(recipient.name)}</small></div>
        </button>
      </section>`;
  }

  function successBanner() {
    if (!lastSuccess) return '';
    return `
      <section class="gold-success">
        <span>✓</span>
        <div><strong>Переведено ${formatNumber(lastSuccess.amount)} золота</strong><small>${escapeHtml(lastSuccess.recipientName)}</small></div>
      </section>`;
  }

  function bind() {
    content.querySelectorAll('[data-recipient]').forEach(button => {
      button.addEventListener('click', () => {
        selectedId = button.dataset.recipient;
        lastSuccess = null;
        feedback.textContent = '';
        haptic('light');
        renderAll();
      });
    });

    content.querySelectorAll('[data-transfer-quick]').forEach(button => {
      button.addEventListener('click', () => {
        const input = content.querySelector('[data-transfer-amount]');
        if (input) input.value = button.dataset.transferQuick;
        haptic('light');
      });
    });

    content.querySelector('[data-transfer-send]')?.addEventListener('click', send);
    content.querySelector('[data-transfer-refresh]')?.addEventListener('click', refresh);
  }

  async function refresh() {
    if (pending) return;
    pending = true;
    feedback.textContent = 'Обновляем участников…';
    try {
      state = await api('/api/gold-transfer');
      if (!state.recipients.some(recipient => recipient.id === selectedId)) {
        selectedId = state.recipients[0]?.id || null;
      }
      feedback.textContent = '';
      renderAll();
    } catch (error) {
      feedback.textContent = error.message;
    } finally {
      pending = false;
    }
  }

  async function send() {
    if (pending) return;
    const recipient = selectedRecipient();
    const input = content.querySelector('[data-transfer-amount]');
    const amount = input?.value ?? '';
    if (!recipient) return;

    pending = true;
    overlay.classList.add('busy');
    feedback.textContent = 'Выполняем перевод…';
    haptic('heavy');

    try {
      const payload = await api('/api/gold-transfer/send', {
        method: 'POST',
        body: JSON.stringify({ recipientId: recipient.id, amount }),
      });
      state = payload.transfer;
      lastSuccess = { amount: payload.amount, recipientName: recipient.name };
      feedback.textContent = `Осталось ${formatNumber(state.gold)} золота.`;
      statusElement.textContent = `Перевод: ${formatNumber(payload.amount)} золота → ${recipient.name}`;
      if (payload.state) renderState(payload.state);
      haptic('medium');
      renderAll();
    } catch (error) {
      if (error.payload?.transfer) state = error.payload.transfer;
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
      haptic('light');
      renderAll();
    } finally {
      pending = false;
      overlay.classList.remove('busy');
    }
  }

  function renderAll() {
    content.innerHTML = `
      <section class="gold-transfer-summary">
        <div><small>ДОСТУПНО</small><strong>🪙 ${formatNumber(state.gold)}</strong></div>
        <button type="button" data-transfer-refresh aria-label="Обновить список">↻</button>
      </section>
      ${successBanner()}
      <div class="gold-transfer-columns">
        <section>
          <div class="gold-section-title"><span>Кому</span><small>${state.recipients.length}</small></div>
          ${recipientList()}
        </section>
        ${transferForm()}
      </div>`;
    bind();
  }

  renderAll();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
