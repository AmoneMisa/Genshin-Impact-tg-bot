// Builds the Blender-authored models into webapp/models/.
//
//   npm run models:blender                 # all models
//   npm run models:blender -- sword.glb    # just one
//
// Needs Blender 4.2+ (tested with 5.2). Set BLENDER_PATH if it isn't installed
// in the default location. Each script runs headless:
//   blender --background --factory-startup --python <script> -- <out.glb>

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(HERE, '../../webapp/models');

/** Output file → Blender script. These files are skipped by the Node generator. */
export const BLENDER_MODELS = Object.freeze({
  'sword.glb': 'sun_sword.py',
  'helmet.glb': 'great_helm.py',
});

export function findBlender(env = process.env) {
  if (env.BLENDER_PATH) return env.BLENDER_PATH;
  const roots = ['C:/Program Files/Blender Foundation', '/Applications/Blender.app/Contents/MacOS', '/usr/bin', '/usr/local/bin', '/snap/bin'];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const direct = ['blender.exe', 'blender', 'Blender'].map(name => path.join(root, name)).find(p => fs.existsSync(p));
    if (direct) return direct;
    // Windows installs into "Blender Foundation/Blender X.Y/blender.exe"; prefer the newest.
    const versions = fs.readdirSync(root).filter(name => /^Blender \d/.test(name)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    for (const version of versions) {
      const exe = path.join(root, version, 'blender.exe');
      if (fs.existsSync(exe)) return exe;
    }
  }
  return null;
}

function main() {
  const blender = findBlender();
  if (!blender) {
    console.error('Blender not found. Install it (e.g. `winget install BlenderFoundation.Blender`) or set BLENDER_PATH.');
    process.exit(1);
  }
  const only = process.argv.slice(2);
  const targets = Object.entries(BLENDER_MODELS).filter(([file]) => !only.length || only.includes(file));
  if (!targets.length) {
    console.error(`Unknown model. Available: ${Object.keys(BLENDER_MODELS).join(', ')}`);
    process.exit(1);
  }
  let failed = 0;
  for (const [file, script] of targets) {
    const started = Date.now();
    const result = spawnSync(blender, ['--background', '--factory-startup', '--python', path.join(HERE, script), '--', path.join(OUT_DIR, file)], { encoding: 'utf8' });
    const log = `${result.stdout || ''}${result.stderr || ''}`;
    if (result.status !== 0 || !/EXPORTED /.test(log)) {
      failed++;
      console.error(`✗ ${file}\n${log.split('\n').filter(line => /Error|Traceback|File "|line \d/.test(line)).join('\n') || log.slice(-2000)}`);
      continue;
    }
    const kb = Math.round(fs.statSync(path.join(OUT_DIR, file)).size / 1024);
    console.log(`✓ ${file}  ${kb} KB  ${((Date.now() - started) / 1000).toFixed(1)}s`);
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
