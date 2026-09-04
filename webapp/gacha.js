const PAYMENT_LABELS = {
  free: 'Бесплатная крутка',
  shards: 'За осколки',
  currency: 'За ресурсы',
  level_locked: 'Нужен уровень',
  gold_locked: 'Не хватает моры',
  crystals_locked: 'Не хватает кристаллов',
  locked: 'Недоступно',
};

const GRADE_ORDER = ['noGrade', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

function number(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}

function gradeLabel(grade) {
  return grade === 'noGrade' ? '—' : grade;
}

function costText(spiral) {
  const parts = [];
  if (spiral.spinCost.gold) parts.push(`🪙 ${number(spiral.spinCost.gold)}`);
  if (spiral.spinCost.crystals) parts.push(`💎 ${number(spiral.spinCost.crystals)}`);
  return parts.join(' · ') || 'Бесплатно';
}

function paymentText(spiral) {
  if (spiral.paymentMode === 'free') return `Бесплатно · осталось ${spiral.freeSpins}`;
  if (spiral.paymentMode === 'shards') return `Осколки ${spiral.shards}/${spiral.shardsCost}`;
  return PAYMENT_LABELS[spiral.paymentMode] || PAYMENT_LABELS.locked;
}

function itemStats(item) {
  if (!item?.stats?.length) return '';
  return item.stats
    .map((stat) => `<span><b>${stat.name}</b> ${number(stat.value)}</span>`)
    .join('');
}

function renderPending(container, pending, onResolve) {
  if (!pending?.item) {
    container.replaceChildren();
    container.hidden = true;
    return;
  }

  container.hidden = false;
  const item = pending.item;
  container.innerHTML = `
    <div class="gacha-reward-glow"></div>
    <div class="gacha-grade">${gradeLabel(item.grade || item.rarity)}</div>
    <div class="eyebrow">ВЫПАЛО · ${item.rarityTranslated || item.rarity || 'ПРЕДМЕТ'}</div>
    <h3>${item.translatedName || item.name || 'Неизвестный предмет'}</h3>
    <p>${item.description || 'Новый предмет для твоего билда.'}</p>
    <div class="gacha-item-stats">${itemStats(item)}</div>
    <div class="gacha-resolve-actions">
      <button class="gacha-action primary" type="button" data-action="save">Оставить</button>
      <button class="gacha-action" type="button" data-action="break">Распылить</button>
    </div>`;

  container.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => onResolve(button.dataset.action, button));
  });
}

function renderSpirals(container, state, onRoll, playerLevel) {
  container.replaceChildren(...state.spirals.map((spiral) => {
    const card = document.createElement('article');
    const locked = !spiral.canRoll;
    card.className = `gacha-spiral glass${locked ? ' locked' : ''}`;

    const probabilities = [...spiral.grades]
      .sort((a, b) => GRADE_ORDER.indexOf(a.value) - GRADE_ORDER.indexOf(b.value))
      .map((grade) => `<span><b>${gradeLabel(grade.value)}</b>${Math.round(Number(grade.chance) * 1000) / 10}%</span>`)
      .join('');

    card.innerHTML = `
      <div class="gacha-orbit" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="gacha-spiral-head">
        <div>
          <div class="eyebrow">LVL ${spiral.needLvl}+</div>
          <h3>${spiral.title}</h3>
        </div>
        <span class="gacha-payment ${spiral.paymentMode}">${paymentText(spiral)}</span>
      </div>
      <div class="gacha-probabilities">${probabilities}</div>
      <div class="gacha-meta">
        <span>Осколки: <b>${number(spiral.shards)}</b> / ${number(spiral.shardsCost)}</span>
        <span>Цена: <b>${costText(spiral)}</b></span>
      </div>
      <button class="gacha-roll" type="button" ${locked ? 'disabled' : ''}>
        ${spiral.canRoll ? 'Крутить спираль' : PAYMENT_LABELS[spiral.paymentMode] || 'Недоступно'}
      </button>
      ${playerLevel < spiral.needLvl ? `<small class="gacha-lock-copy">Твой уровень: ${playerLevel}</small>` : ''}`;

    card.querySelector('.gacha-roll').addEventListener('click', () => onRoll(spiral.id, card));
    return card;
  }));
}

export async function openGachaGame({ api, renderState, haptic, statusElement, playerLevel = 1 }) {
  let state = await api('/api/gacha');
  let pendingRequest = false;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay gacha-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass gacha-panel">
      <header class="overlay-head">
        <div>
          <div class="eyebrow">СПИРАЛИ · WEBGL MODE</div>
          <h2>Гача</h2>
        </div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>
      <p class="overlay-copy">Шансы, списание ресурсов и генерация предмета выполняются на сервере. Незавершённый предмет нельзя обойти новой круткой.</p>
      <section class="gacha-pending" hidden aria-live="polite"></section>
      <div class="gacha-grid"></div>
      <div class="gacha-status" aria-live="polite"></div>
    </div>`;

  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  const grid = overlay.querySelector('.gacha-grid');
  const pending = overlay.querySelector('.gacha-pending');
  const localStatus = overlay.querySelector('.gacha-status');

  const refresh = () => {
    renderPending(pending, state.pending, resolvePending);
    renderSpirals(grid, state, roll, playerLevel);
    if (state.pending) overlay.classList.add('has-gacha-reward');
    else overlay.classList.remove('has-gacha-reward');
  };

  async function roll(gachaType, card) {
    if (pendingRequest || state.pending) return;
    pendingRequest = true;
    card.classList.add('rolling');
    haptic('medium');
    localStatus.textContent = 'Спираль вращается…';

    try {
      const payload = await api('/api/gacha/roll', {
        method: 'POST',
        body: JSON.stringify({ gachaType }),
      });
      state = payload.gacha;
      if (payload.state) renderState(payload.state);
      localStatus.textContent = `Выпал предмет ${gradeLabel(payload.item?.grade || payload.item?.rarity)}. Выбери, что с ним сделать.`;
      haptic('heavy');
      refresh();
    } catch (error) {
      localStatus.textContent = error.message;
      statusElement.textContent = `Гача: ${error.message}`;
      haptic('light');
    } finally {
      pendingRequest = false;
      card.classList.remove('rolling');
    }
  }

  async function resolvePending(action, button) {
    if (pendingRequest || !state.pending) return;
    pendingRequest = true;
    haptic('medium');
    pending.querySelectorAll('button').forEach((item) => { item.disabled = true; });
    button.classList.add('working');

    try {
      const payload = await api('/api/gacha/resolve', {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      state = payload.gacha;
      if (payload.state) renderState(payload.state);
      if (action === 'break') {
        localStatus.textContent = `Предмет распылён: +${number(payload.shards)} осколков.`;
      } else {
        localStatus.textContent = 'Предмет добавлен в инвентарь.';
      }
      haptic('heavy');
      refresh();
    } catch (error) {
      localStatus.textContent = error.message;
      statusElement.textContent = `Гача: ${error.message}`;
      haptic('light');
    } finally {
      pendingRequest = false;
      pending.querySelectorAll('button').forEach((item) => { item.disabled = false; });
      button.classList.remove('working');
    }
  }

  refresh();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
