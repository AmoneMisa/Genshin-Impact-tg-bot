// Optical centring for single-glyph icons (emoji in round buttons and element
// chips). Fonts place glyph ink off the middle of the line box — emoji sit
// 0.5–2px low, arrows even more — so a plain flex/grid centre looks off. We
// measure the real ink box on a canvas with the element's own font (so it
// adapts to Segoe / Apple / Noto emoji) and nudge the glyph with padding.

const SELECTOR = [
  '.el-chip', '[class*="-round"]', '.seat-portrait.bot', '.boss-attack i',
  '.boss-attack-feed i', '.mmo-status', '[data-glyph]',
].join(',');

const cache = new Map();
let context = null;

function measure(text, font) {
  const key = `${font}|${text}`;
  if (cache.has(key)) return cache.get(key);
  context ||= document.createElement('canvas').getContext('2d');
  context.font = font;
  const m = context.measureText(text);
  const offset = {
    // Ink centre minus em-box centre, in px (positive = ink is low / right).
    y: ((m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) - (m.fontBoundingBoxDescent - m.fontBoundingBoxAscent)) / 2,
    x: (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2 - m.width / 2,
  };
  cache.set(key, offset);
  return offset;
}

function isGlyph(node) {
  if (node.children.length) return false;
  const text = node.textContent.trim();
  return text && [...text].length <= 3 ? text : null;
}

/** Nudges every single-glyph icon inside `root` onto its optical centre. */
export function centerGlyphs(root = document) {
  if (typeof document === 'undefined') return;
  const nodes = root.matches?.(SELECTOR) ? [root, ...root.querySelectorAll(SELECTOR)] : root.querySelectorAll(SELECTOR);
  for (const node of nodes) {
    const text = isGlyph(node);
    if (!text || node.dataset.glyphCentered === text) continue;
    const style = getComputedStyle(node);
    // Icons drawn by CSS (font-size 0, e.g. the back arrow) need no nudge.
    if (!parseFloat(style.fontSize)) continue;
    const { x, y } = measure(text, `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`);
    // Padding on the far side moves the centred content by half its size.
    const dy = Math.max(-4, Math.min(4, y)) * 2;
    const dx = Math.max(-4, Math.min(4, x)) * 2;
    node.style.paddingTop = dy < 0 ? `${-dy}px` : '0px';
    node.style.paddingBottom = dy > 0 ? `${dy}px` : '0px';
    node.style.paddingLeft = dx < 0 ? `${-dx}px` : '0px';
    node.style.paddingRight = dx > 0 ? `${dx}px` : '0px';
    node.dataset.glyphCentered = text;
  }
}

/** Keeps icons centred as screens render: one pass per animation frame. */
export function watchGlyphs(root = document.body) {
  if (typeof MutationObserver === 'undefined' || !root) return () => {};
  let queued = false;
  const run = () => { queued = false; centerGlyphs(root); };
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(run);
  });
  observer.observe(root, { childList: true, subtree: true, characterData: true });
  document.fonts?.ready?.then(() => { cache.clear(); root.querySelectorAll('[data-glyph-centered]').forEach(node => delete node.dataset.glyphCentered); run(); });
  run();
  return () => observer.disconnect();
}
