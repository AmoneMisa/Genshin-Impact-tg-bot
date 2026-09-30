function renderContent(container, state) {
  if (!state?.isGroup) {
    container.innerHTML = `
      <div class="utility-card chat-settings-message">
        <h3>Открой Mini App из группы</h3>
        <p>Настройки команд относятся к конкретному групповому чату и недоступны в личном контексте.</p>
      </div>`;
    return;
  }

  if (!state?.canManage) {
    container.innerHTML = `
      <div class="utility-card chat-settings-message">
        <h3>Только для администраторов</h3>
        <p>Менять доступность команд могут создатель и администраторы текущего чата.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="chat-settings-intro utility-card">
      <h3>Игры и команды чата</h3>
      <p>Выключенная игра пропадёт и в Mini App, и из команд в чате. Настройки действуют только для этого чата.</p>
    </div>
    <div class="chat-settings-grid">
      ${state.settings.map(item => `
        <article class="chat-setting-row ${item.enabled ? 'enabled' : ''}">
          <div><strong>${item.label}</strong><small>${item.enabled ? 'доступно' : 'выключено'}</small></div>
          <button type="button" class="chat-setting-toggle ${item.enabled ? 'active' : ''}"
            data-chat-setting="${item.key}" aria-pressed="${item.enabled}">
            <span></span><b>${item.enabled ? 'Вкл' : 'Выкл'}</b>
          </button>
        </article>`).join('')}
    </div>`;
}

export async function openChatSettings({ api, haptic, statusElement }) {
  const overlay = document.createElement('section');
  overlay.className = 'game-overlay chat-settings-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass chat-settings-panel">
      <header class="ds-head">
        <button class="overlay-close ds-round" type="button" aria-label="Закрыть">←</button>
        <h2>Настройки чата</h2>
        <span class="ds-round" aria-hidden="true">⚙</span>
      </header>
      <div data-chat-settings-content class="chat-settings-content">
        <div class="chat-settings-loading">Загружаем настройки…</div>
      </div>
    </div>`;

  const content = overlay.querySelector('[data-chat-settings-content]');
  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  let state = await api('/api/chat-settings');

  const bind = () => {
    content.querySelectorAll('[data-chat-setting]').forEach(button => {
      button.addEventListener('click', async event => {
        const control = event.currentTarget;
        const key = control.dataset.chatSetting;
        const current = state.settings.find(item => item.key === key);
        if (!current) return;

        control.disabled = true;
        try {
          haptic('medium');
          const payload = await api('/api/chat-settings/update', {
            method: 'POST',
            body: JSON.stringify({ key, enabled: !current.enabled }),
          });
          state = payload.chatSettings;
          renderContent(content, state);
          bind();
          statusElement.textContent = `${current.label}: ${current.enabled ? 'выключено' : 'включено'}.`;
        } catch (error) {
          statusElement.textContent = `Настройки чата: ${error.message}`;
          control.disabled = false;
        }
      });
    });
  };

  renderContent(content, state);
  bind();
  statusElement.textContent = state.canManage
    ? 'Настройки текущего чата загружены.'
    : 'Настройки чата доступны только администраторам группы.';
}
