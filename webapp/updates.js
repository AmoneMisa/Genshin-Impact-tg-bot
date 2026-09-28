function renderPanel(container, state) {
  const enabled = Boolean(state?.enabled);
  container.innerHTML = `
    <div class="updates-card ${enabled ? 'enabled' : ''}">
      <div class="updates-card-icon">${enabled ? '🔔' : '🔕'}</div>
      <div class="updates-card-copy">
        <span class="eyebrow">WHATS NEW</span>
        <h3>${enabled ? 'Уведомления включены' : 'Уведомления выключены'}</h3>
        <p>Новости о новых возможностях бота будут приходить в личный чат с ботом. Настройка хранится для вашего участника текущего игрового чата.</p>
      </div>
      <button type="button" class="updates-toggle ${enabled ? 'active' : ''}" data-updates-toggle aria-pressed="${enabled}">
        <span></span><strong>${enabled ? 'Вкл' : 'Выкл'}</strong>
      </button>
    </div>
    <div class="updates-note glass">
      <strong>Telegram должен уже знать вас.</strong>
      <p>Бот не может первым начать личный диалог. Если вы ещё не открывали чат с ботом, сначала нажмите Start в Telegram.</p>
    </div>`;
}

export async function openUpdatesGame({ api, renderState, haptic, statusElement }) {
  const overlay = document.createElement('section');
  overlay.className = 'game-overlay updates-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass updates-panel">
      <header class="overlay-head">
        <div><div class="eyebrow">NOTIFICATIONS · MINI APP</div><h2>Что нового</h2></div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>
      <div data-updates-content class="updates-content"><div class="updates-loading">Загружаем настройки…</div></div>
    </div>`;

  const content = overlay.querySelector('[data-updates-content]');
  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  let state = await api('/api/updates');

  const bind = () => {
    content.querySelector('[data-updates-toggle]')?.addEventListener('click', async button => {
      const control = button.currentTarget;
      control.disabled = true;
      try {
        haptic('medium');
        const payload = await api('/api/updates/settings', {
          method: 'POST',
          body: JSON.stringify({ enabled: !state.enabled }),
        });
        state = payload.updates;
        if (payload.state) renderState(payload.state);
        renderPanel(content, state);
        bind();
        statusElement.textContent = state.enabled ? 'Уведомления о новостях включены.' : 'Уведомления о новостях выключены.';
      } catch (error) {
        statusElement.textContent = `Уведомления: ${error.message}`;
        control.disabled = false;
      }
    });
  };

  renderPanel(content, state);
  bind();
  statusElement.textContent = state.enabled ? 'Уведомления о новостях включены.' : 'Уведомления о новостях выключены.';
}
