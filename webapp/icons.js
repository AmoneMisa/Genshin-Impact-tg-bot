// Painted WebP icons, including symbols arriving in older server templates.
import { EMOJI_ICON } from './emoji-icon-map.js';
import { uiIconUrl } from './art/ui-icon-art.js';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'TITLE', 'SVG', 'CANVAS', 'NOSCRIPT']);
const ATTRS = ['title', 'aria-label', 'alt', 'placeholder'];
const KEYS = Object.keys(EMOJI_ICON).sort((a, b) => b.length - a.length);
const PICTO = String.raw`(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\p{Emoji_Modifier})?)*`;
const EMOJI_RX = new RegExp(`(?:\\p{Regional_Indicator}{2}|${PICTO}|${KEYS.join('|')})\\uFE0F?`, 'gu');
const templates = new Map();

/** Responsive artwork. Unknown names render nothing; no untrusted asset paths. */
export function icon(name, cls = '') {
  const src=uiIconUrl(name);
  const extra=String(cls).replace(/[^a-zA-Z0-9_ -]/g,'');
  return src ? `<img class="ui-icon ui-icon-${name}${extra ? ` ${extra}` : ''}" src="${src}" srcset="${src} 1x, ${uiIconUrl(name,256)} 2x" width="24" height="24" alt="" aria-hidden="true" decoding="async" draggable="false">` : '';
}

export function emojiIconName(emoji) {
  return EMOJI_ICON[String(emoji).replace(/️/g, '')] || null;
}

function iconNode(name, doc) {
  let template = templates.get(name);
  if (!template) {
    template = doc.createElement('img');
    for (const [key, value] of Object.entries({
      class: `ui-icon ui-icon-${name}`, src: uiIconUrl(name), srcset: `${uiIconUrl(name)} 1x, ${uiIconUrl(name,256)} 2x`, width: '24', height: '24', alt: '',
      'aria-hidden': 'true', decoding: 'async', draggable: 'false',
    })) template.setAttribute(key, value);
    templates.set(name, template);
  }
  return template.cloneNode(true);
}

/** Removes mapped emoji (and the space after them) from text used in attributes. */
export function stripEmoji(text) {
  return String(text ?? '').replace(new RegExp(`${EMOJI_RX.source} ?`, 'gu'), '').trim();
}

function convertTextNode(node, doc) {
  const text = node.nodeValue;
  const actions={'←':'chevron-left','→':'chevron-right','?':'circle-help','×':'x','+':'plus','−':'minus','-':'minus'};
  const button=node.parentElement?.closest('button');
  const action=button && actions[button.textContent.trim()];
  if(action && text.trim()===button.textContent.trim()) {
    if(!button.hasAttribute('aria-label'))button.setAttribute('aria-label',button.title || ({'chevron-left':'Назад','chevron-right':'Далее','circle-help':'Справка',x:'Закрыть',plus:'Увеличить',minus:'Уменьшить'}[action]));
    node.replaceWith(iconNode(action,doc));
    return;
  }
  EMOJI_RX.lastIndex = 0;
  if (!text || !EMOJI_RX.test(text)) return;
  EMOJI_RX.lastIndex = 0;
  const fragment = doc.createDocumentFragment();
  let last = 0;
  for (const match of text.matchAll(EMOJI_RX)) {
    if (match.index > last) fragment.append(text.slice(last, match.index));
    fragment.append(iconNode(emojiIconName(match[0]) || 'sparkle', doc));
    last = match.index + match[0].length;
  }
  if (last < text.length) fragment.append(text.slice(last));
  node.replaceWith(fragment);
}

function convertAttributes(element) {
  for (const name of ATTRS) {
    const value = element.getAttribute?.(name);
    if (value) {
      EMOJI_RX.lastIndex = 0;
      if (EMOJI_RX.test(value)) element.setAttribute(name, stripEmoji(value));
    }
  }
}

/** Converts UI emoji to painted images; editable input values remain untouched. */
export function iconize(root) {
  if (root.nodeType === 1 && SKIP_TAGS.has(root.tagName.toUpperCase())) return;
  const doc = root.ownerDocument || root;
  const walker = doc.createTreeWalker(root, 1 | 4, {
    acceptNode(node) {
      if (node.nodeType === 1) return SKIP_TAGS.has(node.tagName.toUpperCase()) || node.closest?.('[contenteditable="true"],.no-emoji-icons') ? 2 : 3;
      return 1;
    },
  });
  const texts = [];
  const elements = root.nodeType === 1 ? [root] : [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) (node.nodeType === 3 ? texts : elements).push(node);
  for (const node of texts) convertTextNode(node, doc);
  for (const element of elements) convertAttributes(element);
}

export function startEmojiIcons(root = globalThis.document) {
  if (!root?.createTreeWalker && !root?.body) return () => {};
  const doc = root.ownerDocument || root;
  const scope = root === doc ? doc.body : root;
  iconize(scope);
  const observer = new MutationObserver(records => {
    observer.disconnect();
    for (const record of records) {
      if (record.type === 'characterData') {
        if (record.target.isConnected && record.target.parentElement && !SKIP_TAGS.has(record.target.parentElement.tagName.toUpperCase())) convertTextNode(record.target, doc);
      } else if (record.type === 'attributes') convertAttributes(record.target);
      else for (const added of record.addedNodes) {
        if (added.nodeType === 3 && added.parentElement && !SKIP_TAGS.has(added.parentElement.tagName.toUpperCase())) convertTextNode(added, doc);
        else if (added.nodeType === 1 && added.isConnected) iconize(added);
      }
    }
    observer.observe(scope, OBSERVE);
  });
  const OBSERVE = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS };
  observer.observe(scope, OBSERVE);
  return () => observer.disconnect();
}
