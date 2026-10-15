// The system chat of a fight (Lineage II): short messages float over the screen for a few seconds and fade away.
// They never take pointer events, so they do not block the screen or the buttons under them.
import { escapeHtml } from './escape-html.js';

const MAX_VISIBLE = 5;
const LIFETIME_MS = 4200;
let host = null;

function container() {
  const overlay=[...document.querySelectorAll('.game-overlay:not(.closing)')].at(-1);
  const parent=overlay?.querySelector('[role="dialog"].game-dialog-panel,.overlay-panel')||overlay||document.body;
  if (host?.isConnected){if(host.parentNode!==parent){host.inert=false;parent.appendChild(host);}return host;}
  host = document.createElement('div');
  host.className = 'system-toasts';
  host.setAttribute('role', 'log');
  host.setAttribute('aria-live', 'polite');
  parent.appendChild(host);
  return host;
}

/** Floats one system message; `iconHtml` is trusted markup, `text` is escaped. */
export function systemToast(text, iconHtml = '', {action=null}={}) {
  const message = String(text || '').trim();
  if (!message) return;
  const node = document.createElement('div');
  node.className = 'system-toast';
  node.innerHTML = `${iconHtml ? `<i>${iconHtml}</i>` : ''}<span>${escapeHtml(message)}</span>`;
  if(action){const button=document.createElement('button');button.type='button';button.className='ui-button ui-compact';button.textContent=action.label;button.addEventListener('click',()=>{node.remove();action.onClick();});node.append(button);}
  const root = container();
  root.appendChild(node);
  while (root.children.length > MAX_VISIBLE) root.firstElementChild.remove();
  window.setTimeout(() => node.classList.add('leaving'), LIFETIME_MS);
  window.setTimeout(() => node.remove(), LIFETIME_MS + 450);
}
