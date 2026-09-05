function timeLabel(unixSeconds) {
  if (!unixSeconds) return '';
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .format(new Date(unixSeconds * 1000));
}

function renderContent(container, state) {
  if (!state?.isGroup) {
    container.innerHTML = `
      <div class="utility-card self-mute-message">
        <span class="self-mute-icon">🤫</span>
        <h3>Только в групповом чате</h3>
        <p>Само-мут ограничивает отправку сообщений в текущей Telegram-группе и не имеет смысла в личном чате.</p>
      </div>`;
    return;
  }

  if (!state.enabled) {
    container.innerHTML = `
      <div class="utility-card self-mute-message">
        <span class="self-mute-icon">🔒</span>
        <h3>Само-мут отключён</h3>
        <p>Администратор текущего чата выключил эту возможность в настройках группы.</p>
      </div>`;
    return;
  }

  if (state.isAdministrator) {
    container.innerHTML = `
      <div class="utility-card self-mute-message">
        <span class="self-mute-icon">🛡️</span>
        <h3>Админа ограничить нельзя</h3>
        <p>Telegram не позволяет боту применить restrictChatMember к создателю или администратору группы.</p>
      </div>`;
    return;
  }

  if (state.isActive) {
    container.innerHTML = `
      <div class="utility-card self-mute-message active">
        <span class="self-mute-icon">🔇</span>
        <h3>Ты уже в само-муте</h3>
        <p>${state.activeUntil ? `Ограничение действует примерно до ${timeLabel(state.activeUntil)}.` : 'Ограничение уже активно.'}</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="self-mute-card utility-card">
      <span class="self-mute-icon">🤐</span>
      <div>
        <h3>Уйти в себя на 2 минуты</h3>
        <p>Бот временно запретит тебе отправлять сообщения, медиа, опросы и другие сообщения в этой группе.</p>
      </div>
      <button type="button" class="self-mute-action" data-self-mute>Замутить себя на 2 минуты</button>
    </div>`;
}

export async function openSelfMute({ api, haptic, statusElement }) {
  const overlay = document.createElement('section');
  overlay.className = 'game-overlay self-mute-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass self-mute-panel">
      <header class="overlay-head">
        <div><div class="eyebrow">GROUP · TELEGRAM</div><h2>Само-мут</h2></div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>
      <div data-self-mute-content class="self-mute-content">
        <div class="self-mute-loading">Проверяем статус…</div>
      </div>
    </div>`;

  const content = overlay.querySelector('[data-self-mute-content]');
  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  let state = await api('/api/self-mute');

  const bind = () => {
    content.querySelector('[data-self-mute]')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        haptic('heavy');
        const payload = await api('/api/self-mute/activate', { method: 'POST' });
        state = payload.selfMute;
        renderContent(content, state);
        statusElement.textContent = `Само-мут включён до ${timeLabel(payload.untilDate)}.`;
      } catch (error) {
        statusElement.textContent = `Само-мут: ${error.message}`;
        state = await api('/api/self-mute').catch(() => state);
        renderContent(content, state);
        bind();
      }
    });
  };

  renderContent(content, state);
  bind();
  statusElement.textContent = state.canMute ? 'Само-мут готов.' : 'Само-мут сейчас недоступен.';
}
