// Lists JS modules nothing reaches, so dead code can be removed.
//
//   node scripts/dead-code.mjs            modules not reachable from the entry points
//
// Entry points: the server (miniapp-entry.js, index.js), the Mini App page (webapp/app.js and
// the scripts of index.html), the scripts/ tools and the tests. A module only the tests import
// is reported separately: it is dead code with a test that keeps it alive.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', '.git', 'art-source', 'images', 'docs']);
const files = [];

(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name) || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(m?js)$/.test(entry.name) && !full.includes(`${path.sep}vendor${path.sep}`)) files.push(full);
  }
})(ROOT);

const exists = file => fs.existsSync(file) && fs.statSync(file).isFile();

function resolveImport(from, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), spec);
  for (const candidate of [base, `${base}.js`, `${base}.mjs`, path.join(base, 'index.js')]) if (exists(candidate)) return candidate;
  return null;
}

const importRe = /(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;
const graph = new Map();
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const targets = new Set();
  for (const match of source.matchAll(importRe)) {
    const target = resolveImport(file, match[1]);
    if (target) targets.add(target);
  }
  graph.set(file, targets);
}

const abs = relative => path.join(ROOT, relative);
const underDirs = (...dirs) => files.filter(file => dirs.some(dir => file.startsWith(abs(dir) + path.sep)));

function reach(starts) {
  const seen = new Set();
  const stack = starts.filter(file => graph.has(file));
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const next of graph.get(file) || []) stack.push(next);
  }
  return seen;
}

// Modules loaded by a computed import (import(`./${language}.js`)) or served as page scripts.
const DYNAMIC = [abs('webapp/i18n/uz.js'), abs('webapp/i18n/uz-extra.js')];
const runtime = reach([abs('miniapp-entry.js'), abs('index.js'), abs('webapp/app.js'), ...DYNAMIC, ...underDirs('webapp/i18n')]);
const tools = reach([...underDirs('scripts'), ...underDirs('.github')]);
const tests = reach(underDirs('test'));

const rel = file => path.relative(ROOT, file).replace(/\\/g, '/');
const isTest = file => file.startsWith(abs('test') + path.sep);
const isScript = file => file.startsWith(abs('scripts') + path.sep);

const dead = files.filter(file => !runtime.has(file) && !tools.has(file) && !isTest(file) && !isScript(file) && !tests.has(file));
const testOnly = files.filter(file => !runtime.has(file) && !tools.has(file) && !isTest(file) && !isScript(file) && tests.has(file));

console.log(`--- not reachable from anything (${dead.length})`);
for (const file of dead) console.log(rel(file));
console.log(`\n--- only the tests reach them (${testOnly.length})`);
for (const file of testOnly) console.log(rel(file));
