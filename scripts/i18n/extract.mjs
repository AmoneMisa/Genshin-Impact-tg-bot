// Collects every Russian phrase the player can see, for the translation catalog.
//
//   node scripts/i18n/extract.mjs --list            prints every phrase
//   node scripts/i18n/extract.mjs --write-catalog   freezes scripts/i18n/catalog.json (indices used by the tsv files)
//
// A small JS scanner (no parser dependency) walks string and template
// literals, skipping comments. Template expressions become {0}, {1}, …; markup
// is split off so that every fragment matches one text node in the page.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCAN = ['webapp', 'miniapp', 'dictionaries', 'template', 'functions', 'db/templates.js'];
// The Russian design lab is a review artifact; it does not ship as a localized game screen.
const SKIP_DIRS = new Set(['node_modules', 'art', 'models', 'vendor', 'i18n', 'design']);
const CYRILLIC = /[А-Яа-яЁё]/;
const REGEX_PREV = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);

/** Returns the string/template literals of a JS source as `{ value, template }`. */
export function scanLiterals(source) {
  const out = [];
  let i = 0;
  let prev = '';

  function readTemplate() {
    // i is just after the opening backtick. Expressions are skipped recursively.
    let text = '';
    let n = 0;
    while (i < source.length) {
      const ch = source[i];
      if (ch === '\\') { text += source[i + 1] === 'n' ? '\n' : source[i + 1]; i += 2; continue; }
      if (ch === '`') { i++; return text; }
      if (ch === '$' && source[i + 1] === '{') {
        i += 2;
        scanCode('}');
        text += `{${n++}}`;
        continue;
      }
      text += ch;
      i++;
    }
    return text;
  }

  function scanCode(until) {
    let depth = 0;
    while (i < source.length) {
      const ch = source[i];
      const next = source[i + 1];
      if (ch === '/' && next === '/') { while (i < source.length && source[i] !== '\n') i++; continue; }
      if (ch === '/' && next === '*') { i = source.indexOf('*/', i + 2); i = i < 0 ? source.length : i + 2; continue; }
      if (ch === '"' || ch === "'") {
        const quote = ch;
        let text = '';
        i++;
        while (i < source.length && source[i] !== quote && source[i] !== '\n') {
          if (source[i] === '\\') { text += source[i + 1] === 'n' ? '\n' : source[i + 1]; i += 2; } else text += source[i++];
        }
        i++;
        out.push({ value: text, template: false });
        prev = quote;
        continue;
      }
      if (ch === '`') {
        i++;
        const before = out.length;
        const text = readTemplate();
        out.splice(before, 0, { value: text, template: true });
        prev = '`';
        continue;
      }
      if (ch === '/' && (REGEX_PREV.has(prev) || prev === '')) {
        // Regex literal: skip it so quotes inside do not start strings.
        i++;
        let inClass = false;
        while (i < source.length && source[i] !== '\n') {
          if (source[i] === '\\') { i += 2; continue; }
          if (source[i] === '[') inClass = true;
          else if (source[i] === ']') inClass = false;
          else if (source[i] === '/' && !inClass) break;
          i++;
        }
        i++;
        prev = '/';
        continue;
      }
      if (until === '}') {
        if (ch === '{') depth++;
        else if (ch === '}') {
          if (depth === 0) { i++; return; }
          depth--;
        }
      }
      if (!/\s/.test(ch)) prev = ch;
      i++;
    }
  }

  scanCode(null);
  return out;
}

/** Splits a literal into the Russian fragments a text node could hold. */
export function fragmentsOf(value) {
  const parts = value.split(/<[^>]*>|&[a-z#0-9]+;/gi);
  const result = [];
  for (const part of parts) {
    const text = part.replace(/\s+/g, ' ').trim();
    if (text && CYRILLIC.test(text)) result.push(text);
  }
  return result;
}

function htmlTexts(html) {
  const found = [];
  for (const attr of html.matchAll(/\b(?:title|aria-label|placeholder|alt)="([^"]*)"/g)) found.push(...fragmentsOf(attr[1]));
  found.push(...fragmentsOf(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')));
  return found;
}

function* walk(target) {
  const full = path.join(ROOT, target);
  if (!fs.existsSync(full)) return;
  const stat = fs.statSync(full);
  if (stat.isFile()) { yield full; return; }
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    yield* walk(path.join(target, entry.name));
  }
}

export function extractCatalog() {
  const phrases = new Map();
  const add = (text, file) => {
    if (!phrases.has(text)) phrases.set(text, new Set());
    phrases.get(text).add(path.relative(ROOT, file).replace(/\\/g, '/'));
  };
  for (const target of SCAN) {
    for (const file of walk(target)) {
      if (/\.html$/.test(file)) {
        htmlTexts(fs.readFileSync(file, 'utf8')).forEach(text => add(text, file));
      } else if (/\.(m?js)$/.test(file)) {
        for (const literal of scanLiterals(fs.readFileSync(file, 'utf8'))) {
          for (const fragment of fragmentsOf(literal.value)) add(fragment, file);
        }
      }
    }
  }
  return [...phrases.keys()].sort((a, b) => a.localeCompare(b, 'ru')).map(text => ({ text, files: [...phrases.get(text)].slice(0, 3) }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const catalog = extractCatalog();
  if (process.argv.includes('--list')) {
    for (const item of catalog) console.log(item.text);
  } else if (process.argv.includes('--write-catalog')) {
    fs.writeFileSync(path.join(ROOT, 'scripts/i18n/catalog.json'), JSON.stringify(catalog.map(item => item.text), null, 1));
    console.log(`${catalog.length} phrases -> scripts/i18n/catalog.json`);
  } else {
    console.log('use --list or --write-catalog');
  }
}
