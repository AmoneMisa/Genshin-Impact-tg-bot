// Round-robin balance check of the Gwent decks: every faction against every other, both seats, medium AI and
// tight decks (the 24 best units), spread over all CPU cores.
//   node scripts/gwent/balance.mjs [classic|extended] [games per ordered pair, default 60]
import { Worker } from 'node:worker_threads';
import os from 'node:os';
import { RULESETS } from '../../webapp/gwent-decks.js';

const rules = process.argv[2] === 'classic' ? 'classic' : 'extended';
const perPair = Number(process.argv[3] || 60);
const factions = RULESETS[rules].factions;
const jobs = [];
for (const a of factions) for (const b of factions) if (a !== b) for (let i = 0; i < perPair; i += 1) jobs.push({ a, b, seed: 9000 + i * 13 + factions.indexOf(a) * 31 + factions.indexOf(b) * 7 });
const workers = Math.max(1, Math.min(os.cpus().length - 2, 28));
const slices = Array.from({ length: workers }, () => []);
jobs.forEach((job, index) => slices[index % workers].push(job));
const started = Date.now();
const results = (await Promise.all(slices.map(slice => new Promise((resolve, reject) => {
  const worker = new Worker(new URL('./balance-worker.mjs', import.meta.url), { workerData: { jobs: slice, rules } });
  worker.on('message', resolve); worker.on('error', reject);
})))).flat();
const wins = Object.fromEntries(factions.map(f => [f, { w: 0, g: 0 }]));
let first = 0;
for (const r of results) {
  wins[r.a].g += 1; wins[r.b].g += 1;
  if (r.winner === 'player') wins[r.a].w += 1; else if (r.winner === 'ai') wins[r.b].w += 1; else { wins[r.a].w += 0.5; wins[r.b].w += 0.5; }
  if (r.winner === r.starter) first += 1; else if (r.winner === 'draw') first += 0.5;
}
console.log(`${rules} rules: ${results.length} games in ${((Date.now() - started) / 1000).toFixed(0)} s; the first mover wins ${(100 * first / results.length).toFixed(1)}%`);
for (const f of factions) console.log(f.padEnd(16), `${(100 * wins[f].w / wins[f].g).toFixed(1)}%`.padStart(6));
