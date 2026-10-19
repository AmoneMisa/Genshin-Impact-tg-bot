import z0 from './world-extension/angel-waterfall.js';
import z1 from './world-extension/dragon-valley.js';
import z2 from './world-extension/antharas-lair.js';
export const WORLD_EXTENSION = [z0,z1,z2];
export const WORLD_EXTENSION_LEVELS=Object.fromEntries(WORLD_EXTENSION.map(r=>[r.zone.id,r.levels]));
export const WORLD_EXTENSION_ZONES=WORLD_EXTENSION.map(r=>r.zone);
export const WORLD_EXTENSION_LOCATIONS=WORLD_EXTENSION.map(r=>r.location);
