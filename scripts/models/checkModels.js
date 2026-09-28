// Validates webapp/models/manifest.json and every .glb it references.
//
//   npm run models:check
//
// Errors (exit 1): missing file, not a glTF 2.0 binary, unreadable JSON chunk.
// Warnings: unknown item kind, over the phone budget (triangles / file size).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeManifest } from '../../webapp/loot-gltf.js';

export const KNOWN_KINDS = ['sword', 'dagger', 'staff', 'bow', 'crossbow', 'hammer', 'shield', 'helmet', 'armor', 'gloves', 'gauntlets', 'greaves', 'boots', 'cloak', 'ring', 'earring', 'amulet', 'tiara', 'relic'];
export const BUDGET = { triangles: 50_000, bytes: 1024 * 1024 };

const MODELS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../webapp/models');

/** Reads a GLB header + JSON chunk and counts triangles across all primitives. */
export function inspectGlb(buffer) {
  if (buffer.length < 20 || buffer.toString('ascii', 0, 4) !== 'glTF') return { error: 'not a binary glTF (.glb) file' };
  const version = buffer.readUInt32LE(4);
  if (version !== 2) return { error: `glTF version ${version}, expected 2` };
  const jsonLength = buffer.readUInt32LE(12);
  if (buffer.toString('ascii', 16, 20) !== 'JSON') return { error: 'first chunk is not JSON' };
  let json;
  try {
    json = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength));
  } catch {
    return { error: 'JSON chunk is not valid JSON' };
  }
  let triangles = 0;
  for (const meshDef of json.meshes || []) {
    for (const primitive of meshDef.primitives || []) {
      const mode = primitive.mode ?? 4;
      if (mode !== 4) continue; // only TRIANGLES count toward the budget
      const accessor = json.accessors?.[primitive.indices ?? primitive.attributes?.POSITION];
      triangles += Math.floor((accessor?.count || 0) / 3);
    }
  }
  const compression = (json.extensionsUsed || []).filter(ext => /draco|meshopt/i.test(ext));
  return { triangles, compression, materials: (json.materials || []).length };
}

export function checkModels(dir = MODELS_DIR) {
  const errors = [], warnings = [], rows = [];
  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return { errors: ['manifest.json not found'], warnings, rows };
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    return { errors: [`manifest.json is not valid JSON: ${error.message}`], warnings, rows };
  }
  const manifest = normalizeManifest(raw);
  for (const kind of Object.keys(raw.models || {})) {
    if (!manifest.models[kind]) errors.push(`${kind}: invalid entry (file must be a relative .glb/.gltf path)`);
  }

  for (const [kind, entry] of Object.entries(manifest.models)) {
    if (!KNOWN_KINDS.includes(kind)) warnings.push(`${kind}: not a loot kind the game renders (${KNOWN_KINDS.join(', ')})`);
    for (const file of new Set([entry.file, ...Object.values(entry.variants)])) {
      const filePath = path.join(dir, file);
      if (!fs.existsSync(filePath)) { errors.push(`${kind}: ${file} does not exist`); continue; }
      if (file.endsWith('.gltf')) { rows.push({ kind, file, bytes: fs.statSync(filePath).size }); continue; }
      const buffer = fs.readFileSync(filePath);
      const info = inspectGlb(buffer);
      if (info.error) { errors.push(`${kind}: ${file} — ${info.error}`); continue; }
      rows.push({ kind, file, bytes: buffer.length, ...info });
      if (info.triangles > BUDGET.triangles) warnings.push(`${kind}: ${file} has ${info.triangles.toLocaleString('en')} triangles (budget ${BUDGET.triangles.toLocaleString('en')})`);
      if (buffer.length > BUDGET.bytes) warnings.push(`${kind}: ${file} is ${(buffer.length / 1024).toFixed(0)} KB (budget ${BUDGET.bytes / 1024} KB) — compress with gltfpack or Draco`);
    }
  }
  return { errors, warnings, rows };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { errors, warnings, rows } = checkModels();
  for (const row of rows) {
    const extra = row.triangles === undefined ? '' : `  ${row.triangles.toLocaleString('en')} tris${row.compression?.length ? `  [${row.compression.join(', ')}]` : ''}`;
    console.log(`${row.kind.padEnd(9)} ${row.file.padEnd(22)} ${(row.bytes / 1024).toFixed(0).padStart(5)} KB${extra}`);
  }
  for (const warning of warnings) console.warn(`warning: ${warning}`);
  for (const error of errors) console.error(`error: ${error}`);
  process.exit(errors.length ? 1 : 0);
}
