import { REVIEWED_WORLD_BUILDINGS } from './world-buildings-manifest.js';
import { buildArtUrl } from './builds-art.js';

const IDS = new Set(['palace', 'academy', 'forge', 'goldMine', 'crystalLake', 'ironDeposit', 'traineeArea']);
export function buildingTier(level = 1) {
  const value = Math.max(1, Number(level) || 1);
  return value > 20 ? 'royal' : value > 10 ? 'grand' : 'small';
}

/** Unreviewed/missing paintings keep their existing building artwork. */
export function buildingArtSources(id, level = 1, style = null, { detail = false } = {}) {
  const tier = buildingTier(level);
  if (!IDS.has(id) || !REVIEWED_WORLD_BUILDINGS.includes(`${id}/${tier}`)) {
    return { url: buildArtUrl(id, level, style), srcset: null, painted: false, tier };
  }
  const root = `/art/world/v1/builds/${id}/${tier}`;
  return {
    url: `${root}-${detail ? 512 : 256}.webp`,
    srcset: detail ? `${root}-256.webp 256w, ${root}-512.webp 512w` : null,
    painted: true, tier,
  };
}
