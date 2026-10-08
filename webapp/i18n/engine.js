// Translation engine shared by the Mini App (browser) and the server (pushes).
//
// A dictionary maps a Russian phrase to its translation. Phrases may hold
// {0}, {1}… placeholders for values that vary (names, numbers): such entries
// match any text of the same shape and the captured values are translated in
// turn. Text that matches no entry is translated phrase by phrase, so
// concatenated strings still come out right; unknown Russian stays as it is.

const CYRILLIC = /[А-Яа-яЁё]/;
const PLACEHOLDER = /\{(\d+)\}/g;
const MIN_PHRASE_LENGTH = 3;
const MAX_DEPTH = 4;

export const hasCyrillic = text => CYRILLIC.test(text);

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalize = text => text.replace(/\s+/g, ' ').trim();

/** Builds the lookup tables once per dictionary. */
export function createTranslator(dictionary) {
  const exact = new Map();
  const templates = [];

  for (const [source, target] of Object.entries(dictionary)) {
    if (typeof target !== 'string' || !target) continue;
    const key = normalize(source);
    if (!PLACEHOLDER.test(key)) {
      exact.set(key, target);
      PLACEHOLDER.lastIndex = 0;
      continue;
    }
    PLACEHOLDER.lastIndex = 0;
    const order = [];
    const pattern = key.split(PLACEHOLDER).map((part, index) => {
      if (index % 2 === 1) { order.push(Number(part)); return '(.+?)'; }
      return escapeRegExp(part);
    }).join('');
    templates.push({
      regex: new RegExp(`^${pattern}$`, 's'),
      order,
      target,
      weight: key.replace(PLACEHOLDER, '').length,
    });
  }
  // The most specific shape (most fixed text) wins.
  templates.sort((a, b) => b.weight - a.weight);

  const phrases = [...exact.keys()]
    .filter(key => key.length >= MIN_PHRASE_LENGTH && CYRILLIC.test(key))
    .sort((a, b) => b.length - a.length);
  const phraseRegex = phrases.length
    ? new RegExp(`(?<![А-Яа-яЁё])(?:${phrases.map(escapeRegExp).join('|')})(?![А-Яа-яЁё])`, 'g')
    : null;
  const cache = new Map();

  function translateNormalized(text, depth) {
    if (!CYRILLIC.test(text)) return text;
    if (exact.has(text)) return exact.get(text);
    if (depth < MAX_DEPTH) {
      for (const template of templates) {
        const match = template.regex.exec(text);
        if (!match) continue;
        const values = [];
        template.order.forEach((placeholder, index) => { values[placeholder] = translateNormalized(match[index + 1], depth + 1); });
        return template.target.replace(PLACEHOLDER, (_, n) => values[Number(n)] ?? '');
      }
    }
    return phraseRegex ? text.replace(phraseRegex, found => exact.get(found) ?? found) : text;
  }

  /** Translates a text node / message, keeping its surrounding whitespace. */
  return function translate(text) {
    if (typeof text !== 'string' || !CYRILLIC.test(text)) return text;
    const cached = cache.get(text);
    if (cached !== undefined) return cached;
    const lead = /^\s*/.exec(text)[0];
    const trail = /\s*$/.exec(text)[0];
    const result = lead + translateNormalized(normalize(text), 0) + trail;
    if (cache.size > 5000) cache.clear();
    cache.set(text, result);
    return result;
  };
}

/** Placeholder numbers used by a phrase, sorted: ['{0}', '{1}']. */
export function placeholdersOf(text) {
  return [...new Set(text.match(PLACEHOLDER) || [])].sort();
}
