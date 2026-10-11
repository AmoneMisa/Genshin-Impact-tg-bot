// The system chat of a fight (Lineage II): short messages float over the screen for a few seconds and fade away.
// They never take pointer events, so they do not block the screen or the buttons under them.
import { escapeHtml } from './escape-html.js';

const MAX_VISIBLE = 5;
const LIFETIME_MS = 4200;
let host = null;

function container() {
  if (host?.isConnected) return host;
  host = document.createElement('div');
  host.className = 'system-toasts';
  host.setAttribute('role', 'log');
  host.setAttribute('aria-live', 'polite');
  document.body.appendChild(host);
  return host;
}

/** Floats one system message; `iconHtml` is trusted markup, `text` is escaped. */
export function systemToast(text, iconHtml = '') {
  const message = String(text || '').trim();
  if (!message) return;
  const node = document.createElement('div');
  node.className = 'system-toast';
  node.innerHTML = `${iconHtml ? `<i>${iconHtml}</i>` : ''}<span>${escapeHtml(message)}</span>`;
  const root = container();
  root.appendChild(node);
  while (root.children.length > MAX_VISIBLE) root.firstElementChild.remove();
  window.setTimeout(() => node.classList.add('leaving'), LIFETIME_MS);
  window.setTimeout(() => node.remove(), LIFETIME_MS + 450);
}
