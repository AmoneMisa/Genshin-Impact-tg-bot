const REASONS = {
  unknown_item: 'Товар больше не существует.',
  cooldown: 'Этот товар уже покупался и пока не обновился.',
  not_enough_gold: 'Недостаточно золота.',
  rejected: 'Покупка отклонена правилами магазина.',
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

function remain(until) {
  const ms = Math.max(0, Number(until || 0) - Date.now());
  if (!ms) return 'Доступно';
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} дн. ${hours % 24} ч.`;
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  if (hours > 0) return `${hours} ч. ${minutes % 60} мин.`;
  return `${minutes} мин.`;
}

export async function openShopGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/shop');
  let category = 'all';
  let pending = false;
  let confirming = null;
  let timer = null;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay shop-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass shop-panel">
      <header class="overlay-head">
        <div><div class="eyebrow">МАГАЗИН · MONGO INVENTORY</div><h2>Лавка</h2></div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>
      <div class="shop-wallet"><small>Твой баланс</small><strong data-shop-gold>🪙 0</strong></div>
      <div class="shop-categories" data-shop-categories></div>
      <div class="shop-list" data-shop-list></div>
      <div class="shop-feedback" data-shop-feedback aria-live="polite"></div>
    </div>`;

  const list = overlay.querySelector('[data-shop-list]');
  const categories = overlay.querySelector('[data-shop-categories]');
  const feedback = overlay.querySelector('[data-shop-feedback]');
  const gold = overlay.querySelector('[data-shop-gold]');

  const close = () => {
    if (timer) window.clearInterval(timer);
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function itemCard(item) {
    const disabled = item.onCooldown || !item.canAfford;
    const buttonText = item.onCooldown
      ? `Обновится через ${remain(item.resetAt)}`
      : !item.canAfford
        ? 'Не хватает золота'
        : confirming === item.command
          ? `Подтвердить за ${formatNumber(item.cost)}`
          : `Купить · ${formatNumber(item.cost)}`;

    return `
      <article class="shop-item ${item.onCooldown ? 'cooldown' : ''}">
        <div class="shop-item-head">
          <span>${escapeHtml(item.categoryLabel)}</span>
          <strong>🪙 ${formatNumber(item.cost)}</strong>
        </div>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.message)}</p>
        <button type="button" data-shop-buy="${escapeHtml(item.command)}" ${disabled ? 'disabled' : ''} class="${confirming === item.command ? 'confirming' : ''}">${escapeHtml(buttonText)}</button>
      </article>`;
  }

  function renderCategories() {
    const all = [{ id: 'all', title: 'Все' }, ...state.categories];
    categories.innerHTML = all.map((item) => `
      <button type="button" data-shop-category="${item.id}" class="${category === item.id ? 'active' : ''}">${escapeHtml(item.title)}</button>
    `).join('');
    categories.querySelectorAll('[data-shop-category]').forEach((button) => {
      button.addEventListener('click', () => {
        category = button.dataset.shopCategory;
        confirming = null;
        haptic('light');
        renderAll();
      });
    });
  }

  function renderItems() {
    const items = category === 'all' ? state.items : state.items.filter((item) => item.category === category);
    list.innerHTML = items.length ? items.map(itemCard).join('') : '<div class="shop-empty">В этой категории пока пусто.</div>';
    list.querySelectorAll('[data-shop-buy]').forEach((button) => {
      button.addEventListener('click', () => buy(button.dataset.shopBuy));
    });
  }

  function renderAll() {
    gold.textContent = `🪙 ${formatNumber(state.gold)}`;
    renderCategories();
    renderItems();
  }

  async function buy(command) {
    if (pending) return;
    if (confirming !== command) {
      confirming = command;
      feedback.textContent = 'Нажми ещё раз, чтобы подтвердить покупку.';
      haptic('medium');
      renderItems();
      return;
    }

    pending = true;
    confirming = null;
    overlay.classList.add('busy');
    feedback.textContent = 'Проводим покупку…';
    haptic('heavy');

    try {
      const payload = await api('/api/shop/buy', {
        method: 'POST',
        body: JSON.stringify({ command }),
      });
      state = payload.shop;
      if (payload.state) renderState(payload.state);
      feedback.textContent = payload.message || `Куплено: ${payload.item?.name || command}`;
      statusElement.textContent = 'Магазин: покупка сохранена в Mongo.';
      renderAll();
    } catch (error) {
      if (error.payload?.shop) state = error.payload.shop;
      feedback.textContent = error.payload?.message || REASONS[error.payload?.reason] || error.message;
      statusElement.textContent = `Магазин: ${feedback.textContent}`;
      haptic('light');
      renderAll();
    } finally {
      pending = false;
      overlay.classList.remove('busy');
    }
  }

  renderAll();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  timer = window.setInterval(() => {
    if (state.items.some((item) => item.onCooldown && Number(item.resetAt) <= Date.now())) {
      state.items = state.items.map((item) => Number(item.resetAt) <= Date.now() ? { ...item, onCooldown: false, available: item.canAfford } : item);
      renderItems();
    } else {
      list.querySelectorAll('.shop-item.cooldown button').forEach((button) => {
        const item = state.items.find((candidate) => candidate.command === button.dataset.shopBuy);
        if (item) button.textContent = `Обновится через ${remain(item.resetAt)}`;
      });
    }
  }, 30000);
}
