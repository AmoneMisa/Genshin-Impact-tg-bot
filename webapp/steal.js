import { menuArtFor } from './menu-art.js';

const REASONS = {
  attacker_not_found: 'Не удалось найти твоего персонажа в этом чате.',
  target_not_found: 'Цель больше недоступна. Обнови список.',
  self_target: 'Нельзя ограбить самого себя.',
  no_attempts: 'Сегодня попытки ограбления закончились. Они восстановятся после ежедневного сброса.',
  no_combat_class: 'Для ограбления нужен выбранный боевой класс.',
  target_shielded: 'У цели действует щит от ограблений.',
  target_in_table_game: 'Игрок сейчас в игре со ставкой — ограбить его нельзя, пока партия не закончится.',
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

const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));

/** Coin/gem/ore pieces thrown out of the vault, a few per looted resource. */
export function lootBurst(result) {
  const pieces = [];
  if (Number(result?.gold) > 0) pieces.push('🪙', '🪙', '🪙', '🪙');
  if (Number(result?.crystals) > 0) pieces.push('💎', '💎');
  if (Number(result?.ironOre) > 0) pieces.push('⛏️');
  return pieces.length ? pieces : ['✦'];
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
      <header class="steal-head">
        <button class="overlay-close steal-round" type="button" aria-label="Закрыть">←</button>
        <h2>Ограбление</h2>
        <button class="steal-round" type="button" data-steal-refresh aria-label="Обновить">↻</button>
      </header>
      <section class="steal-heist" hidden aria-hidden="true"></section>
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
  overlay.querySelector('[data-steal-refresh]').addEventListener('click', () => refresh());
  const heist = overlay.querySelector('.steal-heist');

  // Thief creeps to the vault; then it bursts with loot or a shield throws him back.
  function startHeist(target) {
    heist.className = 'steal-heist';
    heist.innerHTML = `
      <div class="heist-vault"><span class="heist-door"><i></i></span></div>
      <div class="heist-thief">🦹</div>
      <div class="heist-shield">🛡️</div>
      <div class="heist-loot"></div>
      <strong class="heist-title">${escapeHtml(target?.name || 'Цель')}</strong>`;
    heist.hidden = false;
    requestAnimationFrame(() => heist.classList.add('sneak'));
  }
  async function finishHeist(payload) {
    if (payload.outcome === 'stolen') {
      heist.querySelector('.heist-loot').innerHTML = lootBurst(payload).map((piece, i) => `<i style="--a:${-70 + i * 22}deg;--d:${i * 50}ms">${piece}</i>`).join('');
      heist.querySelector('.heist-title').textContent = 'Добыча!';
      heist.classList.add('success');
    } else {
      heist.querySelector('.heist-title').textContent = `${payload.targetName || 'Цель'} отбился`;
      heist.classList.add('defended');
    }
    await wait(1300);
    heist.classList.add('leaving');
    await wait(250);
    heist.hidden = true;
    heist.innerHTML = '';
  }
  function abortHeist() { heist.hidden = true; heist.innerHTML = ''; }

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
    const seated = Boolean(target.inTable);
    const disabled = pending || state.attempts <= 0 || !state.combatReady || shielded || seated;
    return `
      <article class="steal-target ${shielded || seated ? 'shielded' : ''}">
        <span class="steal-avatar" style="--art:url('${menuArtFor('profile', { className: target.className })}')">${escapeHtml(initials(target.name))}</span>
        <div class="steal-target-copy">
          <strong>${escapeHtml(target.name)}</strong>
          <small>LVL ${target.level} · ${escapeHtml(target.className === 'noClass' ? 'без класса' : target.className)}</small>
          ${seated ? `<em class="steal-seated">🎲 В игре «${escapeHtml(target.inTable)}» — ограбить нельзя</em>`
            : shielded ? `<em>🛡️ ${formatDuration(target.shieldRemainingMs)}</em>` : '<em>Щита нет</em>'}
        </div>
        <button type="button" data-steal-target="${escapeHtml(target.id)}" ${disabled ? 'disabled' : ''}>${seated ? 'Играет' : shielded ? 'Защищён' : 'Атаковать'}</button>
      </article>`;
  }

  function bind() {
    content.querySelectorAll('[data-steal-target]').forEach(button => {
      button.addEventListener('click', () => attack(button.dataset.stealTarget));
    });
  }

  function render() {
    const shield = state.shieldRemainingMs > 0
      ? `🛡️ Твой щит: ${formatDuration(state.shieldRemainingMs)}`
      : 'Щит не активен';
    content.innerHTML = `
      <section class="steal-hero">
        <div class="steal-chips">
          <span>🗝️ Попытки <b>${state.attempts} / 2</b></span>
          <span class="${state.shieldRemainingMs > 0 ? 'on' : ''}">${shield}</span>
        </div>
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
    feedback.textContent = '';
    haptic('heavy');
    startHeist(state.targets.find(target => String(target.id) === String(targetId)));
    try {
      const [payload] = await Promise.all([
        api('/api/steal/attack', { method: 'POST', body: JSON.stringify({ targetId }) }),
        wait(1200),
      ]);
      haptic(payload.outcome === 'stolen' ? 'heavy' : 'light');
      await finishHeist(payload);
      state = payload.steal;
      result = payload;
      if (payload.state) renderState(payload.state);
      statusElement.textContent = payload.outcome === 'stolen'
        ? `Ограбление: +${formatNumber(payload.gold)} золота, +${formatNumber(payload.gainedExp)} XP.`
        : `Ограбление: ${payload.targetName} отбил атаку.`;
      feedback.textContent = payload.outcome === 'stolen' ? 'Добыча твоя!' : 'Попытка потрачена.';
      haptic(payload.outcome === 'stolen' ? 'medium' : 'light');
      render();
    } catch (error) {
      abortHeist();
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
