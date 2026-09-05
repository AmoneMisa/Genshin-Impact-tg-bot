import { lootConditionProfile, normalizeLootKind, renderLootArt } from './loot-renderer.js';

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

export function forgeMilestoneProfile(item = {}, previousLevel = null) {
  const forge = forgeVisualProfile(item);
  const previous = previousLevel === null
    ? Math.max(0, forge.level - 1)
    : clamp(normalizedInteger(previousLevel, 0), 0, forge.maxLevel);
  const increased = forge.level > previous;
  const milestone = increased && forge.level === forge.maxLevel
    ? 'ascendant'
    : increased && forge.level === 5
      ? 'breakthrough'
      : 'none';
  return { milestone, previous, level: forge.level, maxLevel: forge.maxLevel, increased };
}

export function forgeImpactKind(item = {}) {
  const kind = normalizeLootKind(item);
  if (kind === 'sword' || kind === 'dagger') return 'blade';
  if (kind === 'shield') return 'shield';
  if (['armor', 'helmet', 'gloves', 'gauntlets', 'greaves', 'boots', 'cloak'].includes(kind)) return 'plates';
  if (['ring', 'amulet', 'staff'].includes(kind)) return 'arcane';
  if (['hammer', 'bow', 'crossbow'].includes(kind)) return 'heavy';
  return 'generic';
}

function typeImpactMarkup(kind) {
  if (kind === 'blade') {
    return `<span class="forge-type-effect forge-blade-charge" aria-hidden="true"><i></i><i></i></span>`;
  }
  if (kind === 'shield') {
    return `<span class="forge-type-effect forge-shield-wave" aria-hidden="true"><i></i><i></i></span>`;
  }
  if (kind === 'plates') {
    return `<span class="forge-type-effect forge-plate-assembly" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`;
  }
  if (kind === 'arcane') {
    return `<span class="forge-type-effect forge-arcane-orbit" aria-hidden="true"><i></i><i></i><i></i></span>`;
  }
  if (kind === 'heavy') {
    return `<span class="forge-type-effect forge-heavy-shock" aria-hidden="true"><i></i><i></i><i></i></span>`;
  }
  return '';
}

function forgeImpactMarkup(level, kind) {
  return `<span class="forge-hammer-strike" aria-hidden="true"></span><span class="forge-impact-flash" aria-hidden="true"></span><span class="forge-rune-surge" aria-hidden="true"><i></i><i></i><i></i></span>${typeImpactMarkup(kind)}<span class="forge-level-burst" aria-hidden="true">+${level}</span>`;
}

function forgeMilestoneMarkup(milestone, level) {
  if (milestone === 'breakthrough') {
    return `<span class="forge-milestone forge-milestone-breakthrough" aria-hidden="true"><i class="forge-milestone-ring"></i><i class="forge-milestone-cross"></i><b>ПРОРЫВ · +${level}</b></span>`;
  }
  if (milestone === 'ascendant') {
    return `<span class="forge-milestone forge-milestone-ascendant" aria-hidden="true"><i class="forge-milestone-crown"></i><i class="forge-milestone-halo halo-a"></i><i class="forge-milestone-halo halo-b"></i><i class="forge-milestone-beam"></i><b>МАКСИМУМ · +${level}</b></span>`;
  }
  return '';
}

export function renderForgeLootArt(item = {}, options = {}) {
  const {
    forgeImpact = false,
    previousLevel = null,
    ...lootOptions
  } = options;
  const forge = forgeVisualProfile(item);
  const milestone = forgeMilestoneProfile(item, previousLevel);
  const previous = milestone.previous;
  const hasImpact = Boolean(forgeImpact && milestone.increased);
  const milestoneType = hasImpact ? milestone.milestone : 'none';
  const impactKind = forgeImpactKind(item);
  const levelMark = forge.level > 0
    ? `<span class="forge-level-mark" aria-hidden="true">+${forge.level}</span>`
    : '';

  return `<div class="loot-forge-state forge-${forge.tier} condition-wear-${forge.wear}${hasImpact ? ` is-forge-impact forge-impact-${impactKind}` : ''}${milestoneType !== 'none' ? ` is-forge-milestone forge-milestone-${milestoneType}-state` : ''}" data-forge-level="${forge.level}" data-forge-previous-level="${previous}" data-forge-tier="${forge.tier}" data-forge-segments="${forge.activeSegments}" data-forge-impact-kind="${impactKind}" data-forge-milestone="${milestoneType}" style="--forge-progress:${forge.progress.toFixed(3)};--forge-level:${forge.level}"><span class="forge-aura-boost" aria-hidden="true"></span><span class="forge-rune-wheel" aria-hidden="true"></span>${renderLootArt(item, lootOptions)}<span class="forge-edge-light" aria-hidden="true"></span>${hasImpact ? forgeImpactMarkup(forge.level, impactKind) : ''}${hasImpact ? forgeMilestoneMarkup(milestoneType, forge.level) : ''}${levelMark}</div>`;
}
