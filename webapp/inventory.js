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

/** Liquid colour of a potion flask. */
export function potionTone(item) {
  if (item?.bottleType === 'elixir') return 'elixir';
  return item?.type === 'mp' ? 'mp' : 'hp';
}

export function flaskHtml(item) {
  return `<span class="inv-flask tone-${potionTone(item)}" aria-hidden="true"><i class="inv-liquid"></i><i class="inv-bubbles"></i></span>`;
}

const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));

export async function openInventoryGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/inventory');
  let pending = false;
  let lastResult = null;
  let selectedKey = null;
  let previousPlayer = null; // vitals before the last potion, to animate the fill

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay inventory-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass inventory-panel">
      <header class="inv-head">
        <button class="overlay-close inv-round" type="button" aria-label="Закрыть">←</button>
        <h2>Инвентарь</h2>
        <button class="inv-round" type="button" data-inventory-refresh aria-label="Обновить">↻</button>
      </header>
      <p class="overlay-copy" hidden>Ресурсы и предметы читаются из той же Mongo-сессии. Снаряжение и гача уже имеют отдельные экраны; здесь можно использовать расходники.</p>
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
  overlay.querySelector('[data-inventory-refresh]').addEventListener('click', () => refresh());

  function vitalsHtml() {
    const before = previousPlayer || state.player;
    const bar = (key, label, value, max, prev) => `
      <article class="inv-vital ${key}">
        <div><span>${label}</span><strong>${formatNumber(value)} / ${formatNumber(max)}</strong></div>
        <i><b data-fill="${percent(value, max)}" style="width:${percent(prev, max)}%"></b></i>
      </article>`;
    return `
      <section class="inventory-vitals">
        ${bar('hp', '❤ HP', state.player.hp, state.player.maxHp, before.hp)}
        ${bar('mp', '🔹 MP', state.player.mp, state.player.maxMp, before.mp)}
      </section>`;
  }

  function slotHtml(item) {
    return `
      <button type="button" class="inv-slot ${item.count <= 0 ? 'empty' : ''} ${item.key === selectedKey ? 'selected' : ''}" data-inventory-select="${escapeHtml(item.key)}" aria-label="${escapeHtml(item.name)} ×${formatNumber(item.count)}">
        ${flaskHtml(item)}
        <em>${formatNumber(item.count)}</em>
      </button>`;
  }

  function detailHtml() {
    const item = state.potions.find(potion => potion.key === selectedKey);
    if (!item) return '<p class="inv-hint">Выбери предмет в сумке.</p>';
    const power = item.bottleType === 'elixir' ? `${item.power}%` : formatNumber(item.power);
    const usable = item.count > 0;
    return `
      <section class="inv-detail tone-${potionTone(item)}">
        ${flaskHtml(item)}
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <small>${escapeHtml(item.description)}</small>
          <em>${item.type.toUpperCase()} · сила ${power} · осталось ${formatNumber(item.count)}</em>
        </div>
        <button type="button" data-inventory-potion="${escapeHtml(item.key)}" ${usable ? '' : 'disabled'}>Выпить</button>
      </section>`;
  }

  function resultHtml() {
    if (!lastResult) return '';
    const resource = lastResult.resource === 'mp' ? 'MP' : 'HP';
    return `<section class="inventory-result ${lastResult.resource === 'mp' ? 'mp' : 'hp'}"><span>+</span><div><strong>${formatNumber(lastResult.restored)} ${resource}</strong><small>${escapeHtml(lastResult.potion?.name || '')}</small></div></section>`;
  }

  function render() {
    if (!selectedKey || !state.potions.some(potion => potion.key === selectedKey)) {
      selectedKey = state.potions.find(potion => potion.count > 0)?.key || state.potions[0]?.key || null;
    }
    const emptySlots = Math.max(0, 8 - state.potions.length);
    content.innerHTML = `
      ${vitalsHtml()}
      ${resultHtml()}
      <section class="inventory-section">
        <div class="inventory-title"><strong>Сумка</strong><small>${formatNumber(state.counts.potions)} зелий</small></div>
        <div class="inv-bag">${state.potions.map(slotHtml).join('')}${'<span class="inv-slot blank" aria-hidden="true"></span>'.repeat(emptySlots)}</div>
        ${detailHtml()}
      </section>
      <section class="inventory-resources">
        <article><span>🪙</span><strong>${formatNumber(state.resources.gold)}</strong></article>
        <article><span>💎</span><strong>${formatNumber(state.resources.crystals)}</strong></article>
        <article><span>⛏️</span><strong>${formatNumber(state.resources.ironOre)}</strong></article>
      </section>
      <section class="inventory-meta">
        <article><span>🛡️</span><div><small>Снаряжение</small><strong>${formatNumber(state.counts.equipment)}</strong></div></article>
        <article><span>✨</span><div><small>Гача</small><strong>${formatNumber(state.counts.gacha)}</strong></div></article>
        <article><span>🏆</span><div><small>Жетоны арены</small><strong>${formatNumber(state.arena.tokens)}${state.arena.pvpSign ? ` · ${escapeHtml(state.arena.pvpSign)}` : ''}</strong></div></article>
      </section>`;
    bind();
    // Vitals glide from the pre-potion value to the new one.
    requestAnimationFrame(() => content.querySelectorAll('[data-fill]').forEach(fill => { fill.style.width = `${fill.dataset.fill}%`; }));
    previousPlayer = null;
  }

  function bind() {
    content.querySelectorAll('[data-inventory-select]').forEach(button => {
      button.addEventListener('click', () => { selectedKey = button.dataset.inventorySelect; haptic('light'); render(); });
    });
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
    feedback.textContent = '';
    haptic('medium');
    const flask = content.querySelector('.inv-detail .inv-flask');
    flask?.classList.add('drinking');
    try {
      const [payload] = await Promise.all([
        api('/api/inventory/use', { method: 'POST', body: JSON.stringify({ key }) }),
        wait(650),
      ]);
      previousPlayer = { ...state.player };
      state = payload.inventory;
      lastResult = payload;
      if (payload.state) renderState(payload.state);
      const resource = payload.resource === 'mp' ? 'MP' : 'HP';
      feedback.textContent = `+${formatNumber(payload.restored)} ${resource}.`;
      statusElement.textContent = `Инвентарь: использовано ${payload.potion?.name || 'зелье'}.`;
      haptic('light');
      render();
    } catch (error) {
      flask?.classList.remove('drinking');
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
