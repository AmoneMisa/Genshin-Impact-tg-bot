import {dialogHeading} from './dialog-heading.js';

/**
 * Shared details window for a selected object (skill, party member, clan member…).
 * Closes with its cross, Escape or a tap outside; `onAction(button, event)` receives clicks on
 * any other button inside. `update` redraws the content without reopening the dialog.
 */
export function openDetailDialog({owner = document.body, title, html, onAction = () => {}, onClose = () => {}}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'game-dialog-panel character-detail-dialog';
  let closed = false;
  const close = () => { if (closed) return; closed = true; if (dialog.open) dialog.close(); dialog.remove(); onClose(); };
  dialog.addEventListener('close', close);
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) { close(); return; }
    }
    if (event.target.closest('[data-dismiss]')) { close(); return; }
    const button = event.target.closest('button');
    if (button && !button.disabled) onAction(button, event);
  });
  const update = (nextTitle, nextHtml) => { dialog.innerHTML = dialogHeading(nextTitle) + nextHtml; };
  update(title, html);
  owner.append(dialog);
  dialog.showModal();
  return {update, close, get open() { return !closed; }, element: dialog};
}
