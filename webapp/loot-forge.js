import { lootConditionProfile, renderLootArt } from './loot-renderer.js';

const DEFAULT_MAX_FORGE_LEVEL = 10;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizedInteger(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
}

export function forgeVisualProfile(item = {}) {
  const maxCandidate = normalizedInteger(item.maxForgeLevel, DEFAULT_MAX_FORGE_LEVEL);
  const maxLevel = maxCandidate > 0 ? maxCandidate : DEFAULT_MAX_FORGE_LEVEL;
  const level = clamp(normalizedInteger(item.forgeLevel, 0), 0, maxLevel);
  const progress = clamp(level / maxLevel, 0, 1);
  const tier = level === 0
    ? 'dormant'
    : level <= 3
      ? 'tempered'
      : level <= 6
        ? 'etched'
        : level < maxLevel
          ? 'radiant'
          : 'ascendant';
  const activeSegments = clamp(Math.round(progress * 10), 0, 10);
  const wear = lootConditionProfile(item).wear;

  return { level, maxLevel, progress, tier, activeSegments, wear };
}

export function renderForgeLootArt(item = {}, options = {}) {
  const forge = forgeVisualProfile(item);
  const levelMark = forge.level > 0
    ? `<span class="forge-level-mark" aria-hidden="true">+${forge.level}</span>`
    : '';

  return `<div class="loot-forge-state forge-${forge.tier} condition-wear-${forge.wear}" data-forge-level="${forge.level}" data-forge-tier="${forge.tier}" data-forge-segments="${forge.activeSegments}" style="--forge-progress:${forge.progress.toFixed(3)};--forge-level:${forge.level}"><span class="forge-aura-boost" aria-hidden="true"></span><span class="forge-rune-wheel" aria-hidden="true"></span>${renderLootArt(item, options)}<span class="forge-edge-light" aria-hidden="true"></span>${levelMark}</div>`;
}
