// Optical centring for single-glyph icons (emoji and symbols in round buttons,
// element chips, status icons). Fonts place glyph ink off the middle of the
// line box, and symbols like ✦ or emoji come from fallback fonts whose metrics
// differ from the line box's, so font metrics alone can't be trusted. Instead
// we find the real ink: draw the glyph on a canvas and scan its pixels, place
// it on the DOM baseline (text box top + the primary font's ascent) and nudge
// the glyph with padding until its ink sits on the element's centre.

const SELECTOR = [
  '.el-chip', '[class*="-round"]', '.seat-portrait.bot', '.boss-attack i',
  '.boss-attack-feed i', '.mmo-status', '[data-glyph]',
].join(',');

const SCALE = 4; // canvas oversampling for sub-pixel accuracy
const cache = new Map();

/**
 * Ink box of `text` relative to its baseline / start, plus the primary
 * font's ascent (what the DOM line box uses), all in CSS px.
 */
function measure(text, font, size) {
  const key = `${font}|${text}`;
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(size * 5 * SCALE);
  canvas.height = Math.ceil(size * 4 * SCALE);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.scale(SCALE, SCALE);
  context.font = font;
  context.textBaseline = 'alphabetic';
  context.fillStyle = '#000';
  const originX = size;
  const baseline = size * 2.5;
  context.fillText(text, originX, baseline);
  const ascent = context.measureText(text).fontBoundingBoxAscent;
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  let top = height, bottom = -1, left = width, right = -1;
  for (let y = 0; y < height; y += 1) {
    const row = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      if (data[row + x * 4 + 3] > 40) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  const result = bottom < 0 ? null : {
    ascent,
    top: top / SCALE - baseline,
    bottom: (bottom + 1) / SCALE - baseline,
    left: left / SCALE - originX,
    right: (right + 1) / SCALE - originX,
  };
  cache.set(key, result);
  return result;
}

function isGlyph(node) {
  if (node.children.length) return false;
  const text = node.textContent.trim();
  return text && [...text].length <= 3 ? text : null;
}

function centerOne(node) {
  const text = isGlyph(node);
  if (!text || node.dataset.glyphCentered === text) return;
  const style = getComputedStyle(node);
  const size = parseFloat(style.fontSize);
  // Icons drawn by CSS (font-size 0, e.g. the back arrow) need no nudge.
  if (!size) return;
  const ink = measure(text, `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, size);
  if (!ink) return;

  // Measure from a clean state so repeated passes don't accumulate.
  node.style.padding = '0';
  const rect = node.getBoundingClientRect();
  if (!rect.width || !rect.height) { node.style.padding = ''; return; }
  const range = document.createRange();
  range.selectNodeContents(node);
  const textBox = range.getBoundingClientRect();
  const baseline = textBox.top + ink.ascent;
  const inkY = baseline + (ink.top + ink.bottom) / 2;
  const inkX = textBox.left + (ink.left + ink.right) / 2;
  const dy = Math.max(-6, Math.min(6, inkY - (rect.top + rect.height / 2)));
  const dx = Math.max(-6, Math.min(6, inkX - (rect.left + rect.width / 2)));
  // Padding on the far side moves the centred content by half its size.
  node.style.paddingTop = dy < 0 ? `${-dy * 2}px` : '0px';
  node.style.paddingBottom = dy > 0 ? `${dy * 2}px` : '0px';
  node.style.paddingLeft = dx < 0 ? `${-dx * 2}px` : '0px';
  node.style.paddingRight = dx > 0 ? `${dx * 2}px` : '0px';
  node.dataset.glyphCentered = text;
}

/** Nudges every single-glyph icon inside `root` onto its optical centre. */
export function centerGlyphs(root = document) {
  if (typeof document === 'undefined') return;
  const nodes = root.matches?.(SELECTOR) ? [root, ...root.querySelectorAll(SELECTOR)] : root.querySelectorAll(SELECTOR);
  for (const node of nodes) centerOne(node);
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
  document.fonts?.ready?.then(() => {
    cache.clear();
    root.querySelectorAll('[data-glyph-centered]').forEach(node => delete node.dataset.glyphCentered);
    run();
  });
  run();
  return () => observer.disconnect();
}
