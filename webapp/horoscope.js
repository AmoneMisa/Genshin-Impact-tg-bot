function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function openHoroscopeGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/horoscope');
  let text = '';
  let pending = false;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay horoscope-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass utility-panel">
      <header class="overlay-head">
        <div><div class="eyebrow">HOROSCOPE · FREELLM</div><h2>Шуточный гороскоп</h2></div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>
      <p class="overlay-copy">Настройки сохраняются в Mongo. Текст генерируется на сервере через FreeLLMAPI; при недоступности модели используется локальный fallback.</p>
      <div data-horo-content></div>
      <div class="utility-feedback" data-horo-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-horo-content]');
  const feedback = overlay.querySelector('[data-horo-feedback]');

  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function render() {
    content.innerHTML = `
      <section class="utility-card">
        <h3>Знак зодиака</h3>
        <div class="horo-signs">
          ${state.signs.map(sign => `<button type="button" class="horo-sign ${sign.code === state.sign.code ? 'active' : ''}" data-horo-sign="${sign.code}">${sign.icon} ${escapeHtml(sign.name)}</button>`).join('')}
        </div>
      </section>
      <section class="utility-card">
        <h3>Характер ответа</h3>
        <div class="horo-styles">
          ${state.styles.map(style => `<button type="button" class="horo-style ${style.key === state.style.key ? 'active' : ''}" data-horo-style="${style.key}">${escapeHtml(style.label)}</button>`).join('')}
        </div>
      </section>
      <div class="horo-result">${text ? escapeHtml(text) : 'Выбери настройки и нажми «Сгенерировать».'}</div>
      <button class="utility-action" type="button" data-horo-generate ${pending ? 'disabled' : ''}>${pending ? 'Генерируем…' : 'Сгенерировать'}</button>`;

    content.querySelectorAll('[data-horo-sign]').forEach(button => button.addEventListener('click', () => save({ sign: button.dataset.horoSign })));
    content.querySelectorAll('[data-horo-style]').forEach(button => button.addEventListener('click', () => save({ style: button.dataset.horoStyle })));
    content.querySelector('[data-horo-generate]')?.addEventListener('click', generate);
  }

  async function save(patch) {
    if (pending) return;
    pending = true;
    feedback.textContent = 'Сохраняем настройки…';
    render();
    try {
      const payload = await api('/api/horoscope/settings', {
        method: 'POST',
        body: JSON.stringify(patch),
      });
      state = payload.horoscope;
      text = '';
      feedback.textContent = 'Настройки сохранены.';
      if (payload.state) renderState(payload.state);
      haptic('light');
    } catch (error) {
      feedback.textContent = error.message;
    } finally {
      pending = false;
      render();
    }
  }

  async function generate() {
    if (pending) return;
    pending = true;
    feedback.textContent = 'Смотрим на звёзды…';
    haptic('medium');
    render();
    try {
      const payload = await api('/api/horoscope/generate', { method: 'POST' });
      state = payload.horoscope;
      text = payload.text;
      feedback.textContent = 'Готово.';
      statusElement.textContent = 'Гороскоп сгенерирован на сервере.';
      haptic('medium');
    } catch (error) {
      feedback.textContent = error.message;
    } finally {
      pending = false;
      render();
    }
  }

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
