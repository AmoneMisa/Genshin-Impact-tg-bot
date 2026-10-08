// Lists Russian phrases that have no Uzbek translation yet.
//
//   node scripts/i18n/missing.mjs
//
// Add the missing ones to webapp/i18n/uz-extra.js ({ 'Русская фраза': "O'zbekcha" }).
// Phrases that must stay Russian (LLM prompts, legacy chat help) go to
// scripts/i18n/untranslated.json.

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { extractCatalog } from './extract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export async function findMissing() {
  const { default: dictionary } = await import(pathToFileURL(path.join(ROOT, 'webapp/i18n/uz.js')).href);
  const acknowledged = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/i18n/untranslated.json'), 'utf8')));
  const known = new Set(Object.keys(dictionary).map(key => key.replace(/\s+/g, ' ').trim()));
  return extractCatalog().filter(item => !known.has(item.text) && !acknowledged.has(item.text));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const missing = await findMissing();
  for (const item of missing) console.log(`${item.text}\n    ${item.files.join(', ')}`);
  console.log(`${missing.length} phrase(s) without a translation`);
  process.exitCode = missing.length ? 1 : 0;
}
