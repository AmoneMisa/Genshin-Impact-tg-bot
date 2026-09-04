const MODE_LABELS = {
  common: { title: 'Обычная арена', subtitle: 'Соперники из текущего игрового чата' },
  expansion: { title: 'Мировая арена', subtitle: 'Глобальный рейтинг между чатами' },
};

const REASONS = {
  no_chances: 'Попытки закончились. Они восстановятся по расписанию арены.',
  stale_defender: 'Список соперников уже изменился. Обновляю арену.',
  self_attack: 'Нельзя атаковать самого себя.',
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

function resultCopy(result) {
  if (result === 'win') return { icon: '🏆', title: 'Победа', className: 'win' };
  if (result === 'lose') return { icon: '💥', title: 'Поражение', className: 'lose' };
  return { icon: '⚖️', title: 'Ничья', className: 'draw' };
}

function defenderCard(defender) {
  return `
    <article class="arena-opponent" data-defender="${escapeHtml(defender.id)}">
      <div class="arena-opponent-head">
        <div class="arena-avatar">${defender.kind === 'bot' ? '🤖' : '⚔️'}</div>
        <div class="arena-opponent-title">
          <strong>${escapeHtml(defender.name)}</strong>
          <small>${escapeHtml(defender.className)} · LVL ${defender.level}</small>
        </div>
        <div class="arena-rating"><strong>${formatNumber(defender.rating)}</strong><small>MMR</small></div>
      </div>
      <div class="arena-opponent-meta">
        <span>🛡️ Gear ${formatNumber(defender.gearScore)}</span>
        <span>${defender.kind === 'bot' ? 'Тренировочный бот' : 'Игрок'}</span>
      </div>
      <button type="button" class="arena-attack" data-attack="${escapeHtml(defender.id)}">Атаковать</button>
    </article>`;
}

export async function openArenaGame({ api, renderState, haptic, statusElement }) {
  let mode = 'common';
  let arena = await api(`/api/arena?mode=${mode}`);
  let pending = false;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay arena-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass arena-panel">
      <header class="overlay-head">
        <div>
          <div class="eyebrow">АРЕНА · SERVER AUTHORITATIVE</div>
          <h2>Боевой рейтинг</h2>
        </div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>

      <div class="arena-tabs" data-arena-tabs>
        <button type="button" data-mode="common" class="active">Обычная</button>
        <button type="button" data-mode="expansion">Мировая</button>
      </div>

      <section class="arena-hero">
        <div>
          <small data-arena-mode-title>Обычная арена</small>
          <strong data-arena-rank>—</strong>
          <span data-arena-mode-subtitle></span>
        </div>
        <div class="arena-score"><strong data-arena-rating>1000</strong><small>MMR</small></div>
      </section>

      <div class="arena-summary">
        <div><small>Попытки</small><strong data-arena-chances>0 / 0</strong></div>
        <div><small>Позиция</small><strong data-arena-position>—</strong></div>
        <div><small>Игроков</small><strong data-arena-total>0</strong></div>
      </div>

      <div class="arena-section-title">
        <strong>Соперники</strong>
        <button type="button" class="arena-refresh" data-arena-refresh>↻ Обновить</button>
      </div>
      <div class="arena-opponents" data-arena-opponents></div>
      <div class="arena-feedback" data-arena-feedback aria-live="polite"></div>
    </div>`;

  const opponents = overlay.querySelector('[data-arena-opponents]');
  const feedback = overlay.querySelector('[data-arena-feedback]');

  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  async function loadMode(nextMode) {
    if (pending) return;
    pending = true;
    overlay.classList.add('busy');
    feedback.textContent = 'Подбираем соперников…';
    try {
      mode = nextMode;
      arena = await api(`/api/arena?mode=${mode}`);
      feedback.textContent = '';
      renderAll();
      haptic('light');
    } catch (error) {
      feedback.textContent = error.message;
      statusElement.textContent = `Арена: ${error.message}`;
    } finally {
      pending = false;
      overlay.classList.remove('busy');
    }
  }

  function showBattle(result) {
    const copy = resultCopy(result.result);
    const card = document.createElement('div');
    card.className = `arena-result ${copy.className}`;
    card.innerHTML = `
      <span>${copy.icon}</span>
      <div>
        <strong>${copy.title}</strong>
        <small>${escapeHtml(result.defender?.name || 'Соперник')}</small>
      </div>
      <div class="arena-result-delta ${result.ratingDelta >= 0 ? 'positive' : 'negative'}">
        ${result.ratingDelta > 0 ? '+' : ''}${formatNumber(result.ratingDelta)} MMR
      </div>`;
    overlay.querySelector('.arena-panel').prepend(card);
    requestAnimationFrame(() => card.classList.add('visible'));
    window.setTimeout(() => {
      card.classList.add('leaving');
      window.setTimeout(() => card.remove(), 220);
    }, 2600);
  }

  async function attack(defenderId, button) {
    if (pending) return;
    if (button.dataset.confirm !== 'yes') {
      button.dataset.confirm = 'yes';
      const text = button.textContent;
      button.dataset.oldText = text;
      button.textContent = 'Подтвердить бой';
      button.classList.add('confirming');
      haptic('medium');
      window.setTimeout(() => {
        if (!button.isConnected || button.dataset.confirm !== 'yes') return;
        button.dataset.confirm = '';
        button.classList.remove('confirming');
        button.textContent = button.dataset.oldText || text;
      }, 2400);
      return;
    }

    pending = true;
    overlay.classList.add('busy', 'fighting');
    feedback.textContent = 'Симулируем бой на сервере…';
    haptic('heavy');

    try {
      const result = await api('/api/arena/attack', {
        method: 'POST',
        body: JSON.stringify({ mode, defenderId }),
      });
      arena = result.arena;
      if (result.state) renderState(result.state);
      showBattle(result);
      feedback.textContent = result.result === 'win'
        ? `Победа. Рейтинг +${formatNumber(result.points)}.`
        : result.result === 'lose'
          ? `Поражение. Рейтинг -${formatNumber(result.points)}. У соперника осталось ${Number(result.defenderHpPercent || 0).toFixed(1)}% HP.`
          : 'Ничья. Рейтинг не изменился.';
      haptic(result.result === 'win' ? 'medium' : 'light');
      renderAll();
    } catch (error) {
      const reason = error.payload?.reason;
      feedback.textContent = REASONS[reason] || error.message;
      statusElement.textContent = `Арена: ${feedback.textContent}`;
      if (error.payload?.arena) {
        arena = error.payload.arena;
        renderAll();
      } else if (reason === 'stale_defender') {
        try { await loadMode(mode); } catch {}
      }
    } finally {
      pending = false;
      overlay.classList.remove('busy', 'fighting');
    }
  }

  function bind() {
    overlay.querySelectorAll('[data-mode]').forEach((button) => {
      button.addEventListener('click', () => loadMode(button.dataset.mode));
    });
    overlay.querySelector('[data-arena-refresh]').onclick = () => loadMode(mode);
    opponents.querySelectorAll('[data-attack]').forEach((button) => {
      button.addEventListener('click', () => attack(button.dataset.attack, button));
    });
  }

  function renderAll() {
    const meta = MODE_LABELS[arena.mode] || MODE_LABELS.common;
    overlay.querySelector('[data-arena-mode-title]').textContent = meta.title;
    overlay.querySelector('[data-arena-mode-subtitle]').textContent = meta.subtitle;
    overlay.querySelector('[data-arena-rank]').textContent = arena.rank || 'Без ранга';
    overlay.querySelector('[data-arena-rating]').textContent = formatNumber(arena.rating);
    overlay.querySelector('[data-arena-chances]').textContent = `${arena.chances} / ${arena.maxChances}`;
    overlay.querySelector('[data-arena-position]').textContent = `#${arena.position}`;
    overlay.querySelector('[data-arena-total]').textContent = formatNumber(arena.totalPlayers);

    overlay.querySelectorAll('[data-mode]').forEach((button) => {
      button.classList.toggle('active', button.dataset.mode === arena.mode);
    });

    opponents.innerHTML = arena.defenders?.length
      ? arena.defenders.map(defenderCard).join('')
      : '<div class="arena-empty">Сейчас подходящих соперников нет.</div>';
    bind();
  }

  renderAll();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
