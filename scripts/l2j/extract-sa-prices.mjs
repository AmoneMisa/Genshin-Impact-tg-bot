// Real High Five SA prices from the L2J Mobius CT 2.6 multisell files.
//   node scripts/l2j/extract-sa-prices.mjs <multisell dir>
// Install: weapon + Soul Crystal + Gemstones (+ adena up to B grade). Removal: SA weapon + Ancient Adena at the
// Black Marketeer of Mammon. Writes template/saPrices.js keyed by the plain weapon name.
import fs from 'node:fs';
import path from 'node:path';
import {SA_WEAPONS} from '../../template/soulCrystalSource.js';
const root = path.resolve(process.argv[2] || '.tmp/l2-high-five/multisell');
const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const parse = body => ({
  ing: [...body.matchAll(/(?:<!-- (.*?) -->\s*)?<ingredient count="(\d+)" id="(\d+)"/g)].map(x => ({name: x[1] || x[3], count: +x[2], id: x[3]})),
  prod: [...body.matchAll(/(?:<!-- (.*?) -->\s*)?<production count="(\d+)" id="(\d+)"/g)].map(x => ({name: x[1] || x[3], count: +x[2]})),
});
const prices = {};
for (const file of walk(root).filter(f => f.endsWith('.xml'))) {
  for (const m of fs.readFileSync(file, 'utf8').matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const {ing, prod} = parse(m[1]);
    if (/Soul Crystal/i.test(m[1]) && ing.some(i => /^Gemstone/.test(i.name))) {
      const gem = ing.find(i => /^Gemstone/.test(i.name)), adena = ing.find(i => i.name === 'Adena');
      const entry = prices[ing[0].name] ||= {};
      entry.gem = gem.name.replace('Gemstone ', '');
      entry.gems ??= gem.count;
      entry.gold ??= adena?.count || 0;
    } else if (ing.length === 2 && ing[1].id === '5575' && prod.length === 1 && ing[0].name.startsWith(prod[0].name + ' - ')) {
      (prices[prod[0].name] ||= {}).removeAa ??= ing[1].count;
    }
  }
}
const out = Object.fromEntries(Object.keys(SA_WEAPONS).filter(name => prices[name]?.gems).sort().map(name => [name, prices[name]]));
fs.writeFileSync('template/saPrices.js', `// Generated from L2J Mobius CT 2.6 HighFive multisell by scripts/l2j/extract-sa-prices.mjs.\n// gem: Gemstone grade, gems: how many, gold: plain adena on top, removeAa: Ancient Adena to take the SA off.\nexport default ${JSON.stringify(out, null, 1)};\n`);
console.log(Object.keys(out).length, 'priced; without install price:', Object.keys(SA_WEAPONS).filter(n => !prices[n]?.gems));
console.log('without removal price:', Object.keys(out).filter(n => !out[n].removeAa));
