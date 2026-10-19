export const WORLD_EXTENSION = [];
export const WORLD_EXTENSION_LEVELS=Object.fromEntries(WORLD_EXTENSION.map(r=>[r.zone.id,r.levels]));
export const WORLD_EXTENSION_ZONES=WORLD_EXTENSION.map(r=>r.zone);
export const WORLD_EXTENSION_LOCATIONS=WORLD_EXTENSION.map(r=>r.location);
