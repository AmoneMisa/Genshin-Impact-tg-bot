/**
 * Every feature builds its own `.game-overlay`. Instead of touching each one,
 * mark overlays as modal dialogs when they appear, and let Escape close the
 * topmost one through its own close button.
 */
function markDialog(node) {
  if (!(node instanceof HTMLElement) || !node.classList.contains('game-overlay')) return;
  node.setAttribute('role', 'dialog');
  node.setAttribute('aria-modal', 'true');
}

export function installOverlayA11y() {
  document.querySelectorAll('.game-overlay').forEach(markDialog);
  new MutationObserver(records => {
    for (const record of records) record.addedNodes.forEach(markDialog);
  }).observe(document.body, { childList: true, subtree: true });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const open = [...document.querySelectorAll('.game-overlay:not(.closing)')].pop();
    open?.querySelector('.overlay-close')?.click();
  });
}
