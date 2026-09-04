const TYPE_LABELS = {
  weapon: 'Оружие',
  armor: 'Броня',
  shield: 'Щиты',
  cloak: 'Плащи',
  accessories: 'Аксессуары',
};

const SLOT_LABELS = {
  head: 'Голова',
  hands: 'Руки',
  leftHand: 'Левая рука',
  rightHand: 'Правая рука',
  legs: 'Ноги',
  leftEar: 'Левое ухо',
  rightEar: 'Правое ухо',
  leftRing: 'Левое кольцо',
  rightRing: 'Правое кольцо',
  necklace: 'Шея',
  up: 'Верх',
  down: 'Низ',
  cloak: 'Плащ',
};

const REASONS = {
  stale_item: 'Список уже изменился. Обнови снаряжение и повтори действие.',
  already_equipped: 'Этот предмет уже надет.',
  not_equipped: 'Этот предмет уже снят.',
  invalid_item: 'Предмет повреждён и не может быть экипирован.',
  equip_failed: 'Не удалось надеть предмет.',
  invalid_action: 'Неизвестное действие.',
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

function gradeClass(grade) {
  return `grade-${String(grade || 'noGrade').toLowerCase()}`;
}

function statText(stat) {
  const value = Number(stat.value) || 0;
  return `${value > 0 ? '+' : ''}${formatNumber(value)} ${stat.name || 'stat'}`;
}

function renderSlots(container, state) {
  const entries = Object.entries(state.equippedSlots || {});
  if (!entries.length) {
    container.innerHTML = '<div class="equipment-empty compact">Ничего не экипировано</div>';
    return;
  }

  container.innerHTML = entries.map(([slot, item]) => `
    <article class="loadout-slot">
      <small>${escapeHtml(SLOT_LABELS[slot] || slot)}</small>
      <strong class="${gradeClass(item.grade)}">${escapeHtml(item.grade)}</strong>
      <span>${escapeHtml(item.translatedName || item.name)}</span>
    </article>`).join('');
}

function itemCard(item) {
  const stats = (item.stats || []).slice(0, 5);
  const durability = item.persistence
    ? `${formatNumber(item.persistence.current)} / ${formatNumber(item.persistence.max)}`
    : '—';
  const quality = item.quality
    ? `${formatNumber(item.quality.current)} / ${formatNumber(item.quality.max)}`
    : '—';

  return `
    <article class="equipment-item ${item.isUsed ? 'equipped' : ''}" data-key="${escapeHtml(item.key)}">
      <div class="equipment-item-top">
        <div class="equipment-item-title">
          <span class="equipment-grade ${gradeClass(item.grade)}">${escapeHtml(item.grade)}</span>
          <div>
            <strong>${escapeHtml(item.translatedName)}</strong>
            <small>${escapeHtml(item.rarityTranslated || TYPE_LABELS[item.mainType] || item.mainType)}</small>
          </div>
        </div>
        ${item.isUsed ? '<span class="equipped-pill">НАДЕТО</span>' : ''}
      </div>

      <p class="equipment-full-name">${escapeHtml(item.name)}</p>
      ${item.description ? `<p class="equipment-description">${escapeHtml(item.description)}</p>` : ''}

      <div class="equipment-meta">
        <span>LVL ${item.minLevel}+</span>
        <span>Качество ${quality}</span>
        <span>Прочность ${durability}</span>
      </div>

      <div class="equipment-stats">
        ${stats.length ? stats.map((stat) => `<span>${escapeHtml(statText(stat))}</span>`).join('') : '<span>Без дополнительных статов</span>'}
      </div>

      <div class="equipment-item-actions">
        <button class="equipment-action primary" type="button" data-action="${item.isUsed ? 'unequip' : 'equip'}" data-key="${escapeHtml(item.key)}">
          ${item.isUsed ? 'Снять' : 'Надеть'}
        </button>
        <button class="equipment-action sell" type="button" data-action="sell" data-key="${escapeHtml(item.key)}" data-price="${item.cost}">
          Продать · ${formatNumber(item.cost)} 🪙
        </button>
      </div>
    </article>`;
}

export async function openEquipmentGame({ api, renderState, haptic, statusElement }) {
  let equipment = await api('/api/equipment');
  let activeType = 'all';
  let pending = false;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay equipment-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass equipment-panel">
      <header class="overlay-head">
        <div>
          <div class="eyebrow">СНАРЯЖЕНИЕ · WEBGL MODE</div>
          <h2>Арсенал</h2>
        </div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>

      <div class="equipment-summary">
        <div><small>Предметов</small><strong data-equipment-count>0</strong></div>
        <div><small>Экипировано</small><strong data-equipped-count>0</strong></div>
        <div><small>Золото</small><strong data-equipment-gold>0</strong></div>
      </div>

      <section class="loadout-section">
        <div class="equipment-section-title"><strong>Активные слоты</strong><small>Боевые статы берутся отсюда</small></div>
        <div class="loadout-grid" data-loadout></div>
      </section>

      <div class="equipment-filters" data-filters></div>
      <div class="equipment-list" data-equipment-list></div>
      <div class="equipment-feedback" data-equipment-feedback aria-live="polite"></div>
    </div>`;

  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  const list = overlay.querySelector('[data-equipment-list]');
  const filters = overlay.querySelector('[data-filters]');
  const loadout = overlay.querySelector('[data-loadout]');
  const feedback = overlay.querySelector('[data-equipment-feedback]');

  function renderFilters() {
    const types = [...new Set((equipment.items || []).map((item) => item.mainType).filter(Boolean))];
    const options = ['all', ...types];
    filters.innerHTML = options.map((type) => `
      <button type="button" class="equipment-filter ${activeType === type ? 'active' : ''}" data-type="${escapeHtml(type)}">
        ${type === 'all' ? 'Все' : escapeHtml(TYPE_LABELS[type] || type)}
      </button>`).join('');

    filters.querySelectorAll('[data-type]').forEach((button) => {
      button.addEventListener('click', () => {
        activeType = button.dataset.type;
        haptic('light');
        renderAll();
      });
    });
  }

  function bindActions() {
    list.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (pending) return;
        const action = button.dataset.action;
        const key = button.dataset.key;

        if (action === 'sell' && button.dataset.confirm !== 'yes') {
          button.dataset.confirm = 'yes';
          button.textContent = `Подтвердить · ${formatNumber(button.dataset.price)} 🪙`;
          button.classList.add('confirming');
          haptic('medium');
          window.setTimeout(() => {
            if (!button.isConnected || button.dataset.confirm !== 'yes') return;
            button.dataset.confirm = '';
            button.classList.remove('confirming');
            button.textContent = `Продать · ${formatNumber(button.dataset.price)} 🪙`;
          }, 2800);
          return;
        }

        pending = true;
        overlay.classList.add('busy');
        feedback.textContent = action === 'sell' ? 'Продаём предмет…' : 'Обновляем экипировку…';
        haptic(action === 'sell' ? 'heavy' : 'medium');

        try {
          const payload = await api('/api/equipment/action', {
            method: 'POST',
            body: JSON.stringify({ key, action }),
          });

          equipment = payload.equipment;
          if (payload.state) renderState(payload.state);

          if (action === 'sell') {
            feedback.textContent = `Продано. Получено ${formatNumber(payload.soldGold)} золота.`;
          } else if (action === 'equip') {
            feedback.textContent = 'Предмет экипирован. Конфликтующие слоты сняты автоматически.';
          } else {
            feedback.textContent = 'Предмет снят.';
          }
          haptic('light');
          renderAll();
        } catch (error) {
          const reason = error.payload?.reason;
          feedback.textContent = REASONS[reason] || error.message;
          statusElement.textContent = `Снаряжение: ${feedback.textContent}`;
          if (reason === 'stale_item') {
            try {
              equipment = await api('/api/equipment');
              renderAll();
            } catch {}
          }
          haptic('light');
        } finally {
          pending = false;
          overlay.classList.remove('busy');
        }
      });
    });
  }

  function renderAll() {
    overlay.querySelector('[data-equipment-count]').textContent = equipment.count || 0;
    overlay.querySelector('[data-equipped-count]').textContent = equipment.equippedCount || 0;
    overlay.querySelector('[data-equipment-gold]').textContent = formatNumber(equipment.gold);
    renderSlots(loadout, equipment);
    renderFilters();

    const visible = (equipment.items || []).filter((item) => activeType === 'all' || item.mainType === activeType);
    list.innerHTML = visible.length
      ? visible.map(itemCard).join('')
      : '<div class="equipment-empty">В этой категории пока нет предметов.</div>';
    bindActions();
  }

  renderAll();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
