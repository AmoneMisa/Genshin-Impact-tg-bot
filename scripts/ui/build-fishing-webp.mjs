import {spawnSync} from 'node:child_process';

// Encode painted keyframes without browser rendering or CSS illustrations.
const result = spawnSync(process.env.PYTHON || 'python', ['scripts/ui/encode-fishing-webp.py'], {
  encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
});
if (result.status !== 0) throw new Error(result.stderr || result.stdout);
process.stdout.write(result.stdout);
