import { escapeHtml } from './escape-html.js';

/** Position of sign `index` of `count` on the zodiac ring (degrees, 0 = top). */
export function signAngle(index, count = 12) {
  return (360 / Math.max(1, count)) * index;
}

const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));

export async function openHoroscopeGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/horoscope');
  let text = state.text || '';
  let shared = Boolean(state.shared);
  let pending = false;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay horoscope-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass utility-panel horo-panel">
      <header class="horo-head">
        <button class="overlay-close horo-round" type="button" aria-label="Закрыть">←</button>
        <h2>Шуточный гороскоп</h2>
        <span class="horo-round" aria-hidden="true">🔮</span>
      </header>
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
      <p class="horo-intro">Выбери знак — получи шуточное предсказание на день.</p>
      <section class="horo-signs horo-cards" aria-label="Знаки зодиака">
        ${state.signs.map(sign => `<button type="button" class="horo-card ${sign.code === state.sign.code ? 'active' : ''}" data-horo-sign="${sign.code}" aria-pressed="${sign.code === state.sign.code}" ${pending ? 'disabled' : ''}><span class="horo-symbol no-emoji-icons" aria-hidden="true">${escapeHtml(sign.icon)}</span><strong>${escapeHtml(sign.name)}</strong></button>`).join('')}
      </section>
      <section class="horo-styles-wrap">
        <small>Настроение</small>
        <div class="horo-styles">
          ${state.styles.map(style => `<button type="button" class="horo-style ${style.key === state.style.key ? 'active' : ''}" ${pending ? 'disabled' : ''} data-horo-style="${style.key}">${escapeHtml(style.label)}</button>`).join('')}
        </div>
      </section>
      <div class="horo-result no-emoji-icons ${text ? 'filled' : ''}" data-horo-text>${text ? '' : 'Здесь появится твоё шуточное предсказание.'}</div>
      <button class="utility-action horo-go" type="button" data-horo-generate ${pending ? 'disabled' : ''}>${pending ? 'Звёзды шепчут…' : text ? 'Ещё предсказание' : 'Получить предсказание'}</button>
      ${text ? `<button class="utility-action horo-share" type="button" data-horo-share ${pending || shared ? 'disabled' : ''}>${shared ? 'Отправлено в чат' : 'Поделиться в чате'}</button>` : ''}`;

    content.querySelectorAll('[data-horo-sign]').forEach(button => button.addEventListener('click', () => save({ sign: button.dataset.horoSign })));
    content.querySelectorAll('[data-horo-style]').forEach(button => button.addEventListener('click', () => save({ style: button.dataset.horoStyle })));
    content.querySelector('[data-horo-generate]')?.addEventListener('click', generate);
    content.querySelector('[data-horo-share]')?.addEventListener('click', share);
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
      shared = false;
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
      shared = false;
      writing += 1;
      feedback.textContent = 'Готово.';
      statusElement.textContent = 'Шуточное предсказание готово.';
      haptic('medium');
    } catch (error) {
      feedback.textContent = error.message;
    } finally {
      pending = false;
      render();
    }
  }

  async function share() {
    if (pending || shared || !text) return;
    pending = true;
    render();
    try {
      const payload = await api('/api/horoscope/share', {method: 'POST'});
      shared = Boolean(payload.horoscope?.shared);
      feedback.textContent = 'Предсказание отправлено в чат.';
      haptic('light');
    } catch (error) {
      feedback.textContent = ({no_prediction: 'Сначала получи предсказание.', already_shared: 'Это предсказание уже отправлено.'})[error.payload?.reason] || error.message;
    } finally { pending = false; render(); }
  }

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
