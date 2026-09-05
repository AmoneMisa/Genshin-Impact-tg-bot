const REASONS = {
  invalid_title: 'Титул должен быть одним словом из русских или латинских букв, до 32 символов.',
  sender_not_found: 'Не удалось найти твоего персонажа в чате.',
  cooldown: 'Команда ещё на перезарядке.',
  no_recipients: 'В чате нет доступных участников для титула.',
};

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
  if (!ms) return 'готово';
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export async function openTitlesGame({ api, haptic, statusElement }) {
  let state = await api('/api/titles');
  let pending = false;
  let success = null;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay titles-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass utility-panel">
      <header class="overlay-head">
        <div><div class="eyebrow">SOCIAL · MONGO</div><h2>Титулы</h2></div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>
      <p class="overlay-copy">Одно слово попадёт случайному доступному участнику чата. Выбор получателя происходит на сервере.</p>
      <div data-titles-content></div>
      <div class="utility-feedback" data-titles-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-titles-content]');
  const feedback = overlay.querySelector('[data-titles-feedback]');
  let timer = null;

  const close = () => {
    if (timer) window.clearInterval(timer);
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function render() {
    const locked = Number(state.cooldown?.until || 0) > Date.now();
    content.innerHTML = `
      <section class="utility-card">
        <h3>Случайный титул</h3>
        <p>${state.eligibleCount} доступных участников · перезарядка: <b data-title-cooldown>${remain(state.cooldown?.until)}</b></p>
        ${success ? `<div class="bonus-win"><span>🏷️</span><strong>${escapeHtml(success.name)} — ${escapeHtml(success.title)}</strong></div>` : ''}
        <div class="title-form">
          <input type="text" maxlength="32" autocomplete="off" placeholder="Например: Архонт" data-title-input ${locked || pending ? 'disabled' : ''} />
          <button type="button" data-title-assign ${locked || pending ? 'disabled' : ''}>Назначить</button>
        </div>
      </section>
      <section class="utility-card">
        <h3>Последние титулы</h3>
        <p>Храним последние 15 записей этого чата.</p>
        <div class="title-list">
          ${state.recent.length ? state.recent.map(item => `
            <article class="title-row">
              <div><strong>${escapeHtml(item.nickname)}</strong><small>${item.obtainedAt ? new Date(item.obtainedAt).toLocaleString('ru-RU') : ''}</small></div>
              <b>${escapeHtml(item.title)}</b>
            </article>`).join('') : '<p>Титулов пока нет.</p>'}
        </div>
      </section>`;

    content.querySelector('[data-title-assign]')?.addEventListener('click', assign);
    content.querySelector('[data-title-input]')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') assign();
    });
  }

  async function assign() {
    if (pending) return;
    const input = content.querySelector('[data-title-input]');
    const title = input?.value?.trim() || '';
    pending = true;
    success = null;
    feedback.textContent = 'Выбираем участника…';
    haptic('heavy');
    render();
    try {
      const payload = await api('/api/titles/assign', {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
      state = payload.titles;
      success = { name: payload.recipient.name, title: payload.assigned.title };
      feedback.textContent = `${payload.recipient.name} получает титул «${payload.assigned.title}».`;
      statusElement.textContent = `Титул: ${payload.recipient.name} — ${payload.assigned.title}`;
      haptic('medium');
    } catch (error) {
      if (error.payload?.titles) state = error.payload.titles;
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
      haptic('light');
    } finally {
      pending = false;
      render();
    }
  }

  render();
  timer = window.setInterval(() => {
    const node = content.querySelector('[data-title-cooldown]');
    if (node) node.textContent = remain(state.cooldown?.until);
    if (Number(state.cooldown?.until || 0) <= Date.now() && content.querySelector('[data-title-assign]:disabled') && !pending) render();
  }, 1000);

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
