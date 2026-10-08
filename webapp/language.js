import { LANGUAGES, currentLanguage, storeLanguage } from './i18n/lang.js';

// Language picker (Menu → Til / Язык). The choice is kept on the device and sent
// to the server with every request; the page reloads so everything is redrawn.

export async function openLanguageGame({ haptic }) {
  const active = currentLanguage();
  const overlay = document.createElement('section');
  overlay.className = 'game-overlay language-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass feedback-panel">
      <header class="ds-head">
        <button class="overlay-close ds-round" type="button" aria-label="×">←</button>
        <h2 data-i18n-skip>Til / Язык</h2>
        <span class="ds-round" aria-hidden="true">🌐</span>
      </header>
      <div class="feedback-card language-list">
        ${LANGUAGES.map(item => `
          <button type="button" class="feedback-submit language-option ${item.code === active ? 'active' : ''}" data-lang="${item.code}" lang="${item.code}">
            ${item.label}${item.code === active ? ' ✓' : ''}
          </button>`).join('')}
      </div>
    </div>`;
  const close = () => { overlay.classList.add('closing'); window.setTimeout(() => overlay.remove(), 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);
  overlay.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.lang === active) return close();
    haptic?.('medium');
    storeLanguage(button.dataset.lang);
    window.location.reload();
  }));
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
