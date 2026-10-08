// Translates everything the player sees: text nodes, a few attributes, native
// dialogs and canvas text. The page keeps being written in Russian; this layer
// runs after it, so no screen needs to know about languages.

import { hasCyrillic } from './engine.js';

const ATTRIBUTES = ['title', 'aria-label', 'placeholder', 'alt'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE']);

export function installDomTranslation(translate, root = document) {
  // Text we wrote ourselves, so the observer does not translate it again.
  const written = new WeakMap();

  function translateTextNode(node) {
    const value = node.nodeValue;
    if (!value || written.get(node) === value || !hasCyrillic(value)) return;
    if (SKIP_TAGS.has(node.parentNode?.nodeName) || node.parentElement?.closest?.('[data-i18n-skip]')) return;
    const next = translate(value);
    if (next === value) return;
    written.set(node, next);
    node.nodeValue = next;
  }

  function translateAttributes(element) {
    for (const name of ATTRIBUTES) {
      const value = element.getAttribute?.(name);
      if (!value || !hasCyrillic(value)) continue;
      const next = translate(value);
      if (next !== value) element.setAttribute(name, next);
    }
  }

  function translateTree(node) {
    if (node.nodeType === Node.TEXT_NODE) return translateTextNode(node);
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    if (node.nodeType === Node.ELEMENT_NODE) translateAttributes(node);
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
      if (current.nodeType === Node.TEXT_NODE) translateTextNode(current);
      else translateAttributes(current);
      current = walker.nextNode();
    }
  }

  translateTree(root);
  if (document.title) document.title = translate(document.title);

  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') translateTextNode(record.target);
      else if (record.type === 'attributes') translateAttributes(record.target);
      else record.addedNodes.forEach(translateTree);
    }
  });
  observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES });

  // Native dialogs.
  for (const name of ['alert', 'confirm', 'prompt']) {
    const original = window[name]?.bind(window);
    if (original) window[name] = (message, ...rest) => original(translate(String(message ?? '')), ...rest);
  }
  const tg = window.Telegram?.WebApp;
  for (const name of ['showAlert', 'showConfirm', 'showPopup']) {
    const original = tg?.[name]?.bind(tg);
    if (!original) continue;
    tg[name] = (arg, ...rest) => original(typeof arg === 'string' ? translate(arg) : arg && typeof arg === 'object'
      ? { ...arg, ...(arg.title ? { title: translate(arg.title) } : {}), ...(arg.message ? { message: translate(arg.message) } : {}) }
      : arg, ...rest);
  }

  // Text drawn on canvases (labels in the 3D scenes).
  const context = window.CanvasRenderingContext2D?.prototype;
  if (context) {
    for (const name of ['fillText', 'strokeText', 'measureText']) {
      const original = context[name];
      context[name] = function (text, ...rest) { return original.call(this, typeof text === 'string' ? translate(text) : text, ...rest); };
    }
  }

  return { translateTree, observer };
}
