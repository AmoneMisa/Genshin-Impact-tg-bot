import { escapeHtml } from './escape-html.js';

// "Hello" popups written by the admin, shown when the Mini App opens. A player
// can hide one for the rest of the day; the choice lives on the device, keyed
// by notice id + last edit so an edited notice shows again.

const STORAGE_KEY = 'hello-notices-dismissed';

export const noticeKey = notice => `${notice.id}:${notice.updatedAt}`;
const todayKey = () => new Date().toISOString().slice(0, 10);

export function readDismissed(raw) {
  try {
    const parsed = JSON.parse(raw ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, day]) => typeof day === 'string'));
  } catch {
    return {};
  }
}

export function visibleNotices(notices, dismissed, today) {
  return notices.filter(notice => dismissed[noticeKey(notice)] !== today);
}

/** Returns the new map; entries from earlier days are dropped so it never grows. */
export function dismissForToday(dismissed, notice, today) {
  const next = Object.fromEntries(Object.entries(dismissed).filter(([, day]) => day === today));
  next[noticeKey(notice)] = today;
  return next;
}

function load() {
  try { return readDismissed(window.localStorage.getItem(STORAGE_KEY)); } catch { return {}; }
}

function save(map) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch { /* storage may be unavailable */ }
}

export async function showHelloNotices({ api, haptic }) {
  let notices;
  try {
    ({ notices } = await api('/api/notices'));
  } catch {
    return;
  }
  const queue = visibleNotices(notices || [], load(), todayKey());
  const next = () => {
    const notice = queue.shift();
    if (!notice) return;
    const overlay = document.createElement('section');
    overlay.className = 'game-overlay notice-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="overlay-backdrop"></div>
      <div class="overlay-panel glass notice-panel">
        <h2>${escapeHtml(notice.title)}</h2>
        <p>${escapeHtml(notice.body).replace(/\n/g, '<br>')}</p>
        <label class="notice-skip"><input type="checkbox" data-notice-skip /> Больше не показывать сегодня</label>
        <button type="button" class="feedback-submit" data-notice-ok>Понятно</button>
      </div>`;
    const close = () => {
      if (overlay.querySelector('[data-notice-skip]').checked) save(dismissForToday(load(), notice, todayKey()));
      overlay.classList.add('closing');
      window.setTimeout(() => { overlay.remove(); next(); }, 180);
    };
    overlay.querySelector('[data-notice-ok]').addEventListener('click', () => { haptic?.('light'); close(); });
    overlay.querySelector('.overlay-backdrop').addEventListener('click', close);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));
  };
  next();
}
