import {closeIconHtml} from './dialog-heading.js';
import {installGameRules} from './game-rules.js';

let installed = false, nextId = 0;

export function installOverlayA11y() {
  if (installed) return;
  installed = true;
  const updateRules=installGameRules();
  let top = null;
  const origins = new WeakMap(), inert = new Map();
  const visible = node => node.isConnected && !node.hidden && !node.closest('.closing,[hidden]') && node.getClientRects().length;
  const buttons = node => [...node.querySelectorAll('button,a[href],input,select,textarea,[tabindex]')].filter(n => !n.disabled && n.tabIndex >= 0 && visible(n) && !n.closest('[inert]'));
  function restoreBackground() { for (const [node, value] of inert) node.inert = value; inert.clear(); }
  function disable(node) { if (!inert.has(node)) inert.set(node, node.inert); node.inert = true; }
  function update() {
    updateRules?.();
    restoreBackground();
    const dialogs = [...document.querySelectorAll('.game-overlay,[role="dialog"].game-dialog-panel,.death-panel,dialog[open]')].filter(visible);
    for (const node of dialogs) {
      for (const close of node.querySelectorAll('.overlay-close')) {
        if (!close.hasAttribute('data-close-normalized')) {
          close.setAttribute('data-close-normalized', '');
          close.innerHTML = closeIconHtml;
        }
        close.setAttribute('aria-label', 'Закрыть');
      }
      node.setAttribute('role', 'dialog');node.setAttribute('aria-modal', 'true');
      if (!node.hasAttribute('tabindex')) node.tabIndex = -1;
      if (!node.getAttribute('aria-label') && !node.getAttribute('aria-labelledby')) {
        const heading = node.querySelector('h1,h2,h3,.game-dialog-heading strong,header strong');
        if (heading) { heading.id ||= `game-dialog-title-${++nextId}`;node.setAttribute('aria-labelledby', heading.id); }
        else node.setAttribute('aria-label', 'Окно игры');
      }
    }
    // Death actions must stay above overlays appended after the death panel.
    dialogs.sort((a,b) => Number(Boolean(a.closest('.death-overlay'))) - Number(Boolean(b.closest('.death-overlay'))));
    const native = dialogs.findLast(node => node.tagName === 'DIALOG');
    const next = native || dialogs.at(-1) || null;
    const previous = top;top = next;
    // Native modal dialogs already handle focus, Escape and the top layer.
    // Never make them inert or redirect their focus into the underlying overlay.
    if (next?.tagName === 'DIALOG') return;
    const modalOpen = dialogs.some(n => !n.classList.contains('city-window'));
    if (document.body.classList.contains('modal-open') !== modalOpen) document.body.classList.toggle('modal-open', modalOpen);
    if (next) {
      let cursor = next;
      while (cursor.parentElement) {
        for (const sibling of cursor.parentElement.children) if (sibling !== cursor) disable(sibling);
        if (cursor.parentElement === document.body) break;
        cursor = cursor.parentElement;
      }
      if (next !== previous || !next.contains(document.activeElement)) {
        if (!origins.has(next)) origins.set(next, document.activeElement);
        const returning = previous && origins.get(previous);
        if (returning && next.contains(returning) && visible(returning)) returning.focus();
        else (buttons(next)[0] || next).focus({preventScroll:true});
      }
    } else if (previous) {
      const origin = origins.get(previous);
      if (origin?.isConnected && !origin.closest('[inert]')) origin.focus({preventScroll:true});
    }
  }
  new MutationObserver(update).observe(document.body, {childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
  document.addEventListener('keydown', event => {
    if (!top) return;
    if (event.key === 'Escape') {
      const escape = new CustomEvent('overlay-escape', {cancelable:true,bubbles:true});
      top.dispatchEvent(escape);
      if (escape.defaultPrevented) {event.preventDefault();event.stopImmediatePropagation();return;}
      const close = top.querySelector('.overlay-close,[data-dismiss],[data-close],[data-chest-close]');
      if (close) { event.preventDefault();event.stopImmediatePropagation();close.click(); }
    } else if (event.key === 'Tab') {
      const targets = buttons(top), first = targets[0], last = targets.at(-1);
      if (!first) {event.preventDefault();top.focus();return;}
      if (!top.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault();(event.shiftKey ? last : first).focus();
      }
    }
  }, true);
  document.addEventListener('focusin', () => {
    if (top && !top.contains(document.activeElement)) (buttons(top)[0] || top).focus({preventScroll:true});
  });
  update();
}
