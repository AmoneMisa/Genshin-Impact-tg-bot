import { escapeHtml } from './escape-html.js';
const REASONS = {
  invalid_title: 'Титул должен быть одним словом из русских или латинских букв, до 32 символов.',
  sender_not_found: 'Не удалось найти твоего персонажа в чате.',
  cooldown: 'Команда ещё на перезарядке.',
  no_recipients: 'В чате нет доступных участников для титула.',
};


function remain(until) {
  const ms = Math.max(0, Number(until || 0) - Date.now());
  if (!ms) return 'готово';
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Names that flicker past before the roulette stops on the recipient. */
export function rouletteNames(recent = [], recipient = '', count = 12) {
  const pool = [...new Set(recent.map(item => item.nickname).filter(Boolean))].filter(name => name !== recipient);
  const filler = pool.length ? pool : ['???', '✦', '???'];
  return [...Array.from({ length: count }, (_, i) => filler[i % filler.length]), recipient];
}

const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));

export async function openTitlesGame({ api, haptic, statusElement }) {
  let state = await api('/api/titles');
  let pending = false;
  let success = null;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay titles-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass utility-panel titles-panel">
      <header class="tt-head">
        <button class="overlay-close tt-round" type="button" aria-label="Закрыть">←</button>
        <h2>Титулы</h2>
        <span class="tt-round" aria-hidden="true">🏷️</span>
      </header>
      <p class="tt-rules">Одно слово достанется случайному участнику чата — судьба решает на сервере.</p>
      <section class="tt-stage" data-title-stage hidden aria-live="polite"></section>
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

  // Names flicker past, slow down, stop on the recipient; then the ribbon unfurls.
  async function playRoulette(recipient, title) {
    const stage = overlay.querySelector('[data-title-stage]');
    if (!stage) return;
    const names = rouletteNames(state.recent, recipient);
    stage.hidden = false;
    stage.className = 'tt-stage spinning';
    stage.innerHTML = `<div class="tt-wheel"><span data-title-name></span></div><div class="tt-ribbon"><strong>«${escapeHtml(title)}»</strong></div>`;
    const node = stage.querySelector('[data-title-name]');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    for (let i = reduced ? names.length - 1 : 0; i < names.length; i += 1) {
      node.textContent = names[i];
      node.classList.remove('tick');
      void node.offsetWidth;
      node.classList.add('tick');
      haptic('light');
      await wait(60 + i * i * 2.2);
    }
    stage.className = 'tt-stage landed';
    haptic('heavy');
    await wait(900);
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
      await playRoulette(payload.recipient.name, payload.assigned.title);
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
