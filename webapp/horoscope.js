function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/** Position of sign `index` of `count` on the zodiac ring (degrees, 0 = top). */
export function signAngle(index, count = 12) {
  return (360 / Math.max(1, count)) * index;
}

const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));

export async function openHoroscopeGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/horoscope');
  let text = '';
  let pending = false;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay horoscope-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass utility-panel horo-panel">
      <header class="horo-head">
        <button class="overlay-close horo-round" type="button" aria-label="Закрыть">←</button>
        <h2>Гороскоп</h2>
        <span class="horo-round" aria-hidden="true">🔮</span>
      </header>
      <p class="overlay-copy" hidden>Настройки сохраняются в Mongo. Текст генерируется на сервере через FreeLLMAPI; при недоступности модели используется локальный fallback.</p>
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
    const current = state.signs.find(sign => sign.code === state.sign.code) || state.sign;
    content.innerHTML = `
      <section class="horo-wheel ${pending ? 'divining' : ''}">
        ${state.signs.map((sign, i) => `<button type="button" class="horo-sign ${sign.code === state.sign.code ? 'active' : ''}" data-horo-sign="${sign.code}" style="--a:${signAngle(i, state.signs.length)}deg" title="${escapeHtml(sign.name)}" aria-label="${escapeHtml(sign.name)}"><span>${sign.icon}</span></button>`).join('')}
        <div class="horo-ball" aria-hidden="true"><i></i><span>${current?.icon || '✦'}</span></div>
        <strong class="horo-current">${escapeHtml(current?.name || '')}</strong>
      </section>
      <section class="horo-styles-wrap">
        <small>Характер предсказания</small>
        <div class="horo-styles">
          ${state.styles.map(style => `<button type="button" class="horo-style ${style.key === state.style.key ? 'active' : ''}" data-horo-style="${style.key}">${escapeHtml(style.label)}</button>`).join('')}
        </div>
      </section>
      <div class="horo-result ${text ? 'filled' : ''}" data-horo-text>${text ? '' : 'Выбери знак и нажми «Узнать судьбу».'}</div>
      <button class="utility-action horo-go" type="button" data-horo-generate ${pending ? 'disabled' : ''}>${pending ? 'Звёзды шепчут…' : 'Узнать судьбу'}</button>`;

    content.querySelectorAll('[data-horo-sign]').forEach(button => button.addEventListener('click', () => save({ sign: button.dataset.horoSign })));
    content.querySelectorAll('[data-horo-style]').forEach(button => button.addEventListener('click', () => save({ style: button.dataset.horoStyle })));
    content.querySelector('[data-horo-generate]')?.addEventListener('click', generate);
    if (text) writeText(text);
  }

  // The prediction writes itself onto the parchment word by word.
  let writing = 0;
  async function writeText(value) {
    const node = content.querySelector('[data-horo-text]');
    if (!node) return;
    const run = ++writing;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || node.dataset.done === value) { node.textContent = value; return; }
    const words = value.split(/(\s+)/);
    node.textContent = '';
    for (const word of words) {
      if (run !== writing || !node.isConnected) return;
      node.textContent += word;
      if (word.trim()) await wait(28);
    }
    node.dataset.done = value;
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
      writing += 1;
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
