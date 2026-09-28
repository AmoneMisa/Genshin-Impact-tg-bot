// Converts the painted art in images/ (1-2 MB PNGs used by the text bot) into
// web-sized WebP for the Mini App under webapp/art/.
//
//   npm run art:build
//
// Uses Blender (see build.js) so no extra image tooling is needed.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBlender } from './build.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const IMAGES = path.join(ROOT, 'images');
const OUT = path.join(ROOT, 'webapp/art');

export const BOSSES = ['kivaha', 'avrora', 'fjorina', 'radjahal', 'carnevorusIsse'];
export const CLASSES = ['noClass', 'warrior', 'archer', 'mage', 'priest'];

/** Main-menu feature id → painting. Features without one keep their icon. */
export const MENU_ART = Object.freeze({
  boss: 'bosses/kivaha/kivaha1-99.png',
  chest: 'misc/chestsGame.png',
  arena: 'misc/arena.png',
  shop: 'misc/shop.png',
  builds: 'misc/builds.png',
  steal: 'misc/stealResources.png',
  inventory: 'misc/inventory.png',
  gacha: 'gacha/goddess.png',
});

export function artJobs() {
  const jobs = [];
  for (const boss of BOSSES) jobs.push({ src: `bosses/${boss}/${boss}1-99.png`, dst: `bosses/${boss}.webp`, size: 960, quality: 84 });
  for (const [feature, src] of Object.entries(MENU_ART)) jobs.push({ src, dst: `menu/${feature}.webp`, size: 480, quality: 78 });
  for (const cls of CLASSES) for (const gender of ['male', 'female']) jobs.push({ src: `classes/${cls}/${gender}/${cls}.png`, dst: `classes/${cls}-${gender}.webp`, size: 640, quality: 80 });
  jobs.push({ src: 'misc/chestsGame.png', dst: 'chests/backdrop.webp', size: 960, quality: 80 });
  return jobs;
}

function main() {
  const blender = findBlender();
  if (!blender) {
    console.error('Blender not found. Install it or set BLENDER_PATH.');
    process.exit(1);
  }
  const jobs = artJobs().map(job => ({ ...job, src: path.join(IMAGES, job.src), dst: path.join(OUT, job.dst) }));
  const missing = jobs.filter(job => !fs.existsSync(job.src));
  if (missing.length) {
    console.error(`Missing source art:\n${missing.map(job => job.src).join('\n')}`);
    process.exit(1);
  }
  const jobsFile = path.join(os.tmpdir(), `art-jobs-${process.pid}.json`);
  fs.writeFileSync(jobsFile, JSON.stringify(jobs));
  const result = spawnSync(blender, ['--background', '--factory-startup', '--python', path.join(HERE, 'convert_art.py'), '--', jobsFile], { encoding: 'utf8' });
  fs.rmSync(jobsFile, { force: true });
  const done = (result.stdout.match(/CONVERTED /g) || []).length;
  if (result.status !== 0 || done !== jobs.length) {
    console.error(result.stdout.slice(-3000), result.stderr.slice(-2000));
    process.exit(1);
  }
  let total = 0;
  for (const job of jobs) total += fs.statSync(job.dst).size;
  console.log(`✓ ${done} images → webapp/art (${Math.round(total / 1024)} KB total)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
