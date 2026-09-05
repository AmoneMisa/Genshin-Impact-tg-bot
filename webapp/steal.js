const REASONS = {
  attacker_not_found: 'Не удалось найти твоего персонажа в этом чате.',
  target_not_found: 'Цель больше недоступна. Обнови список.',
  self_target: 'Нельзя ограбить самого себя.',
  no_attempts: 'Сегодня попытки ограбления закончились. Они восстановятся после ежедневного сброса.',
  no_combat_class: 'Для ограбления нужен выбранный боевой класс.',
  target_shielded: 'У цели действует щит от ограблений.',
};

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}

function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.ceil((Number(ms) || 0) / 60000));
  if (totalMinutes < 60) return `${totalMinutes} мин.`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} ч. ${minutes} мин.` : `${hours} ч.`;
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
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || '?';
}

export async function openStealGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/steal');
  let pending = false;
  let result = null;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay steal-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass steal-panel">
      <header class="overlay-head">
        <div><div class="eyebrow">RAID · MONGO</div><h2>Ограбление</h2></div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>
      <p class="overlay-copy">Выбери игрока из этого чата. Бой, щиты, добыча и опыт рассчитываются только на сервере.</p>
      <div data-steal-content></div>
      <div class="utility-feedback" data-steal-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-steal-content]');
  const feedback = overlay.querySelector('[data-steal-feedback]');
  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function resultHtml() {
    if (!result) return '';
    if (result.outcome === 'defended') {
      return `
        <section class="steal-result defended">
          <span>🛡️</span>
          <div><strong>${escapeHtml(result.targetName)} отбился</strong><small>Попытка потрачена · осталось ${result.attempts}</small></div>
        </section>`;
    }
    return `
      <section class="steal-result success">
        <span>🦹</span>
        <div>
          <strong>Ограбление удалось</strong>
          <small>${escapeHtml(result.targetName)} · +${formatNumber(result.gainedExp)} XP</small>
          <p>🪙 ${formatNumber(result.gold)} · 💎 ${formatNumber(result.crystals)} · ⛏️ ${formatNumber(result.ironOre)}</p>
        </div>
      </section>`;
  }

  function targetHtml(target) {
    const shielded = target.shieldRemainingMs > 0;
    const disabled = pending || state.attempts <= 0 || !state.combatReady || shielded;
    return `
      <article class="steal-target ${shielded ? 'shielded' : ''}">
        <span class="steal-avatar">${escapeHtml(initials(target.name))}</span>
        <div class="steal-target-copy">
          <strong>${escapeHtml(target.name)}</strong>
          <small>LVL ${target.level} · ${escapeHtml(target.className === 'noClass' ? 'без класса' : target.className)}</small>
          ${shielded ? `<em>🛡️ ${formatDuration(target.shieldRemainingMs)}</em>` : '<em>Щита нет</em>'}
        </div>
        <button type="button" data-steal-target="${escapeHtml(target.id)}" ${disabled ? 'disabled' : ''}>${shielded ? 'Защищён' : 'Атаковать'}</button>
      </article>`;
  }

  function bind() {
    content.querySelector('[data-steal-refresh]')?.addEventListener('click', refresh);
    content.querySelectorAll('[data-steal-target]').forEach(button => {
      button.addEventListener('click', () => attack(button.dataset.stealTarget));
    });
  }

  function render() {
    const shield = state.shieldRemainingMs > 0
      ? `🛡️ Твой щит: ${formatDuration(state.shieldRemainingMs)}`
      : 'Щит не активен';
    content.innerHTML = `
      <section class="steal-summary">
        <article><small>ПОПЫТКИ</small><strong>${state.attempts} / 2</strong></article>
        <article><small>ЗАЩИТА</small><strong>${shield}</strong></article>
        <button type="button" data-steal-refresh aria-label="Обновить">↻</button>
      </section>
      ${state.shieldRemainingMs > 0 ? '<p class="steal-warning">После собственной попытки ограбления твой щит исчезнет.</p>' : ''}
      ${!state.combatReady ? '<p class="steal-warning">Выбери боевой класс, чтобы нападать на других игроков.</p>' : ''}
      ${resultHtml()}
      <section class="steal-section">
        <div class="steal-section-title"><strong>Цели</strong><span>${state.targets.length}</span></div>
        <div class="steal-targets">
          ${state.targets.length ? state.targets.map(targetHtml).join('') : '<div class="steal-empty">В этом чате пока не на кого нападать.</div>'}
        </div>
      </section>`;
    bind();
  }

  async function refresh() {
    if (pending) return;
    pending = true;
    feedback.textContent = 'Обновляем цели…';
    try {
      state = await api('/api/steal');
      result = null;
      feedback.textContent = '';
      render();
    } catch (error) {
      feedback.textContent = error.message;
    } finally {
      pending = false;
    }
  }

  async function attack(targetId) {
    if (pending) return;
    pending = true;
    overlay.classList.add('busy');
    feedback.textContent = 'Идёт бой…';
    haptic('heavy');
    try {
      const payload = await api('/api/steal/attack', {
        method: 'POST',
        body: JSON.stringify({ targetId }),
      });
      state = payload.steal;
      result = payload;
      if (payload.state) renderState(payload.state);
      statusElement.textContent = payload.outcome === 'stolen'
        ? `Ограбление: +${formatNumber(payload.gold)} золота, +${formatNumber(payload.gainedExp)} XP.`
        : `Ограбление: ${payload.targetName} отбил атаку.`;
      feedback.textContent = payload.outcome === 'stolen' ? 'Добыча сохранена в Mongo.' : 'Попытка потрачена.';
      haptic(payload.outcome === 'stolen' ? 'medium' : 'light');
      render();
    } catch (error) {
      if (error.payload?.steal) state = error.payload.steal;
      const base = REASONS[error.payload?.reason] || error.message;
      const shield = error.payload?.shieldRemainingMs ? ` Осталось: ${formatDuration(error.payload.shieldRemainingMs)}` : '';
      feedback.textContent = `${base}${shield}`;
      result = null;
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
