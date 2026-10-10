// Folds the factors printed by calibrate-tree.mjs into TUNE / TUNE_TIER4 of template/classTree.js.
//
//   node scripts/balance/apply-tune.mjs tier2.json
//
// The factors multiply what is there: TUNE[spec name] at the 1st and 2nd profession, TUNE_TIER4[spec name] at
// the 3rd. Run `node scripts/templates/hash.mjs > template/seedHashes.js` and bump classStats afterwards.
import fs from 'node:fs';
import {TUNE, TUNE_TIER4, ARCHETYPES} from '../../template/classTree.js';

const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const tier = Number(input.tier);
const table = tier >= 4 ? TUNE_TIER4 : TUNE;
const round = (value, digits = 3) => Math.round(value * 10 ** digits) / 10 ** digits;

for (const [shape, factors] of Object.entries(input.factors)) {
    const like = shape.split('/')[1];
    const name = ARCHETYPES[like][Math.min(tier, 3)].name;
    const current = table[name] ||= {};
    for (const [field, factor] of Object.entries(factors)) current[field] = round((current[field] ?? 1) * factor);
}

const format = object => Object.keys(object).sort().map(name => `  ${name}: {${Object.entries(object[name]).map(([field, value]) => `${field}: ${value}`).join(', ')}},`).join('\n');
const path = new URL('../../template/classTree.js', import.meta.url);
let source = fs.readFileSync(path, 'utf8');
const replace = (begin, end, body) => {
    const from = source.indexOf(begin) + begin.length;
    const to = source.indexOf(end);
    source = `${source.slice(0, from)}\n${body}\n${source.slice(to)}`;
};
replace('/* calibration:begin */', '/* calibration:end */', format(TUNE));
replace('/* calibration4:begin */', '/* calibration4:end */', format(TUNE_TIER4));
fs.writeFileSync(path, source);
console.log(`tier ${tier}:`, Object.keys(input.factors).length, 'shapes tuned');
