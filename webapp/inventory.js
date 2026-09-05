const REASONS = {
  potion_not_found: 'Зелье больше недоступно. Обнови инвентарь.',
  potion_empty: 'Это зелье закончилось.',
  player_dead: 'Нельзя использовать зелье, пока персонаж мёртв.',
  hp_full: 'HP уже полностью восстановлено.',
  mp_full: 'MP уже полностью восстановлено.',
  unsupported_potion: 'Этот предмет пока нельзя использовать в Mini App.',
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

function percent(value, max) {
  return max > 0 ? Math.min(100, Math.max(0, Number(value) / Number(max) * 100)) : 0;
}

function potionIcon(item) {
  if (item.type === 'mp') return '🔵';
  if (item.bottleType === 'elixir') return '💗';
  return '❤️';
}

export async function openInventoryGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/inventory');
  let pending = false;
  let lastResult = null;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay inventory-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass inventory-panel">
      <header class="overlay-head">
        <div><div class="eyebrow">INVENTORY · MONGO</div><h2>Инвентарь</h2></div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>
      <p class="overlay-copy">Ресурсы и предметы читаются из той же Mongo-сессии. Снаряжение и гача уже имеют отдельные экраны; здесь можно использовать расходники.</p>
      <div data-inventory-content></div>
      <div class="utility-feedback" data-inventory-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-inventory-content]');
  const feedback = overlay.querySelector('[data-inventory-feedback]');
  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function vitalsHtml() {
    return `
      <section class="inventory-vitals">
        <article>
          <div><span>❤ HP</span><strong>${formatNumber(state.player.hp)} / ${formatNumber(state.player.maxHp)}</strong></div>
          <i><b style="width:${percent(state.player.hp, state.player.maxHp)}%"></b></i>
        </article>
        <article>
          <div><span>🔹 MP</span><strong>${formatNumber(state.player.mp)} / ${formatNumber(state.player.maxMp)}</strong></div>
          <i><b style="width:${percent(state.player.mp, state.player.maxMp)}%"></b></i>
        </article>
      </section>`;
  }

  function potionHtml(item) {
    const usable = item.count > 0 && !pending;
    const power = item.bottleType === 'elixir' ? `${item.power}%` : formatNumber(item.power);
    return `
      <article class="inventory-potion ${item.count <= 0 ? 'empty' : ''}">
        <span>${potionIcon(item)}</span>
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <small>${escapeHtml(item.description)}</small>
          <em>${item.type.toUpperCase()} · сила ${power} · ×${formatNumber(item.count)}</em>
        </div>
        <button type="button" data-inventory-potion="${escapeHtml(item.key)}" ${usable ? '' : 'disabled'}>Использовать</button>
      </article>`;
  }

  function resultHtml() {
    if (!lastResult) return '';
    const resource = lastResult.resource === 'mp' ? 'MP' : 'HP';
    return `<section class="inventory-result"><span>✓</span><div><strong>Восстановлено ${formatNumber(lastResult.restored)} ${resource}</strong><small>${escapeHtml(lastResult.potion?.name || '')}</small></div></section>`;
  }

  function render() {
    content.innerHTML = `
      <section class="inventory-resources">
        <article><span>🪙</span><small>Золото</small><strong>${formatNumber(state.resources.gold)}</strong></article>
        <article><span>💎</span><small>Кристаллы</small><strong>${formatNumber(state.resources.crystals)}</strong></article>
        <article><span>⛏️</span><small>Руда</small><strong>${formatNumber(state.resources.ironOre)}</strong></article>
      </section>
      ${vitalsHtml()}
      ${resultHtml()}
      <section class="inventory-meta">
        <article><span>🛡️</span><div><small>Снаряжение</small><strong>${formatNumber(state.counts.equipment)} предметов</strong></div></article>
        <article><span>✨</span><div><small>Гача</small><strong>${formatNumber(state.counts.gacha)} предметов</strong></div></article>
        <article><span>🏆</span><div><small>Арена</small><strong>${formatNumber(state.arena.tokens)} жетонов${state.arena.pvpSign ? ` · ${escapeHtml(state.arena.pvpSign)}` : ''}</strong></div></article>
      </section>
      <section class="inventory-section">
        <div class="inventory-title"><div><strong>Зелья</strong><small>${formatNumber(state.counts.potions)} шт.</small></div><button type="button" data-inventory-refresh aria-label="Обновить">↻</button></div>
        <div class="inventory-potions">${state.potions.length ? state.potions.map(potionHtml).join('') : '<p class="inventory-empty">Зелий пока нет.</p>'}</div>
      </section>`;
    bind();
  }

  function bind() {
    content.querySelector('[data-inventory-refresh]')?.addEventListener('click', refresh);
    content.querySelectorAll('[data-inventory-potion]').forEach(button => {
      button.addEventListener('click', () => usePotion(button.dataset.inventoryPotion));
    });
  }

  async function refresh() {
    if (pending) return;
    pending = true;
    feedback.textContent = 'Обновляем инвентарь…';
    try {
      state = await api('/api/inventory');
      lastResult = null;
      feedback.textContent = '';
      render();
    } catch (error) {
      feedback.textContent = error.message;
    } finally {
      pending = false;
    }
  }

  async function usePotion(key) {
    if (pending) return;
    pending = true;
    overlay.classList.add('busy');
    feedback.textContent = 'Используем предмет…';
    haptic('medium');
    try {
      const payload = await api('/api/inventory/use', {
        method: 'POST',
        body: JSON.stringify({ key }),
      });
      state = payload.inventory;
      lastResult = payload;
      if (payload.state) renderState(payload.state);
      const resource = payload.resource === 'mp' ? 'MP' : 'HP';
      feedback.textContent = `+${formatNumber(payload.restored)} ${resource}.`;
      statusElement.textContent = `Инвентарь: использовано ${payload.potion?.name || 'зелье'}.`;
      haptic('light');
      render();
    } catch (error) {
      if (error.payload?.inventory) state = error.payload.inventory;
      lastResult = null;
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
      haptic('light');
      render();
    } finally {
      pending = false;
      overlay.classList.remove('busy');
    }
  }

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
