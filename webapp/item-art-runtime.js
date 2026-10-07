// No canvas, model fetches, per-frame JavaScript, or GPU contexts for items.
export function startItemArt(root = globalThis.document) {
  if (!root?.querySelectorAll) return () => {};
  const doc = root.ownerDocument || root;
  const tracked = new Set();
  const selector = '.loot-art-2d.is-reveal,.loot-art-2d.is-animated';
  const visibility = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('is-art-visible', entry.isIntersecting);
  }) : null;
  const scan = scope => {
    for (const node of tracked) if (!node.isConnected) { visibility?.unobserve(node); tracked.delete(node); }
    const nodes = [...(scope.querySelectorAll?.(selector) || [])];
    if (scope.matches?.(selector)) nodes.push(scope);
    for (const node of nodes) if (!tracked.has(node)) {
      tracked.add(node);
      if (visibility) visibility.observe(node);
      else node.classList.add('is-art-visible');
    }
  };
  const onError = event => {
    const img = event.target;
    if (!img.matches?.('.loot-item-image')) return;
    img.closest('.loot-art-2d')?.classList.add('art-unavailable');
  };
  const onVisibility = () => doc.documentElement.classList.toggle('item-art-paused', doc.hidden);
  const observer = new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) scan(node);
    // Also release targets when a sheet is closed without adding a replacement.
    for (const node of tracked) if (!node.isConnected) { visibility?.unobserve(node); tracked.delete(node); }
  });
  scan(root);
  observer.observe(root === doc ? doc.body : root, { childList: true, subtree: true });
  root.addEventListener('error', onError, true);
  doc.addEventListener('visibilitychange', onVisibility);
  onVisibility();
  return () => {
    observer.disconnect(); visibility?.disconnect();
    for (const node of tracked) node.classList.remove('is-art-visible');
    tracked.clear();
    root.removeEventListener('error', onError, true);
    doc.removeEventListener('visibilitychange', onVisibility);
    doc.documentElement.classList.remove('item-art-paused');
  };
}
