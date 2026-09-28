import {
  lootConditionProfile,
  lootTone,
  lootVisualProfile,
  normalizeLootKind,
} from './loot-renderer.js';
import { forgeVisualProfile } from './loot-forge.js';

function safeToken(value, fallback = 'unknown') {
  const token = String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return token || fallback;
}

export function avatarVisualProfile(item = {}) {
  const visual = lootVisualProfile(item);
  const condition = lootConditionProfile(item);
  const forge = forgeVisualProfile(item);
  return {
    kind: normalizeLootKind(item),
    tone: safeToken(lootTone(item), 'arcane'),
    material: safeToken(visual.material),
    ornament: safeToken(visual.ornament),
    wear: safeToken(condition.wear),
    quality: safeToken(condition.quality),
    forgeTier: safeToken(forge.tier, 'dormant'),
    forgeLevel: forge.level,
    variant: visual.variant,
  };
}

function pieceClass(item, role) {
  const profile = avatarVisualProfile(item);
  return [
    'paper-avatar-piece',
    `avatar-role-${role}`,
    `avatar-kind-${profile.kind}`,
    `avatar-tone-${profile.tone}`,
    `avatar-material-${profile.material}`,
    `avatar-ornament-${profile.ornament}`,
    `avatar-wear-${profile.wear}`,
    `avatar-quality-${profile.quality}`,
    `avatar-forge-${profile.forgeTier}`,
  ].join(' ');
}

function helmetMarkup(item) {
  if (!item) return '';
  const p = avatarVisualProfile(item);
  const crest = p.variant === 0
    ? 'M90 16 L98 37 L90 31 L82 37 Z'
    : p.variant === 1
      ? 'M68 40 L78 22 L90 34 L102 22 L112 40'
      : p.variant === 2
        ? 'M69 38 Q90 12 111 38'
        : 'M74 34 L90 18 L106 34';
  return `<g class="${pieceClass(item, 'helmet')}" data-avatar-role="helmet">
    <path class="avatar-gear-fill" d="M62 61 Q62 32 90 27 Q118 32 118 61 L108 79 L99 70 L90 82 L81 70 L72 79 Z"/>
    <path class="avatar-gear-edge" d="M66 58 Q90 42 114 58 M75 66 L105 66"/>
    <path class="avatar-gear-ornament" d="${crest}"/>
  </g>`;
}

function cloakMarkup(item) {
  if (!item) return '';
  const p = avatarVisualProfile(item);
  const spread = 7 + p.variant * 3;
  return `<g class="${pieceClass(item, 'cloak')}" data-avatar-role="cloak">
    <path class="avatar-gear-fill avatar-cloak-fill" d="M69 91 Q90 79 111 91 L${128 + spread} 244 Q113 286 90 304 Q67 286 ${52 - spread} 244 Z"/>
    <path class="avatar-gear-edge" d="M69 92 Q90 108 111 92 M60 245 Q90 268 120 245"/>
    <path class="avatar-gear-ornament" d="M90 104 L101 118 L90 132 L79 118 Z"/>
  </g>`;
}

function torsoMarkup(item) {
  if (!item) return '';
  const p = avatarVisualProfile(item);
  const shoulder = 9 + p.variant * 2;
  return `<g class="${pieceClass(item, 'torso')}" data-avatar-role="torso">
    <path class="avatar-gear-fill" d="M${61 - shoulder} 104 L74 86 L90 96 L106 86 L${119 + shoulder} 104 L116 188 L90 207 L64 188 Z"/>
    <path class="avatar-gear-edge" d="M69 113 L90 128 L111 113 M69 154 H111 M76 181 L90 191 L104 181"/>
    <path class="avatar-gear-ornament" d="M90 116 L101 131 L90 146 L79 131 Z"/>
  </g>`;
}

function glovesMarkup(item) {
  if (!item) return '';
  return `<g class="${pieceClass(item, 'gloves')}" data-avatar-role="gloves">
    <path class="avatar-gear-fill" d="M37 176 L56 165 L63 187 L51 211 L33 215 Z M143 176 L124 165 L117 187 L129 211 L147 215 Z"/>
    <path class="avatar-gear-edge" d="M39 190 L57 182 M141 190 L123 182"/>
  </g>`;
}

function lowerMarkup(item, role = 'lower') {
  if (!item) return '';
  return `<g class="${pieceClass(item, role)}" data-avatar-role="${role}">
    <path class="avatar-gear-fill" d="M59 205 L86 211 L79 275 L65 323 L49 318 L59 260 Z M121 205 L94 211 L101 275 L115 323 L131 318 L121 260 Z"/>
    <path class="avatar-gear-edge" d="M61 235 L81 240 M119 235 L99 240 M56 289 L74 294 M124 289 L106 294"/>
  </g>`;
}

function shieldMarkup(item, side) {
  const left = side === 'left';
  const cx = left ? 40 : 140;
  return `<g class="${pieceClass(item, 'weapon')} avatar-hand-${side}" data-avatar-role="weapon" data-avatar-side="${side}">
    <path class="avatar-gear-fill" d="M${cx - 23} 154 Q${cx} 139 ${cx + 23} 154 L${cx + 18} 212 Q${cx} 230 ${cx - 18} 212 Z"/>
    <path class="avatar-gear-edge" d="M${cx - 12} 166 L${cx + 12} 200 M${cx + 12} 166 L${cx - 12} 200"/>
    <circle class="avatar-gear-ornament" cx="${cx}" cy="183" r="8"/>
  </g>`;
}

function bladeMarkup(item, side, twoHanded = false) {
  const left = side === 'left';
  const x = twoHanded ? 90 : left ? 38 : 142;
  const angle = twoHanded ? -26 : left ? -13 : 13;
  const p = avatarVisualProfile(item);
  const width = 7 + p.variant * 1.5;
  const top = twoHanded ? 79 : 128;
  const bottom = twoHanded ? 289 : 252;
  return `<g class="${pieceClass(item, 'weapon')} avatar-hand-${side}${twoHanded ? ' avatar-two-hand' : ''}" data-avatar-role="weapon" data-avatar-side="${side}" transform="rotate(${angle} ${x} 190)">
    <path class="avatar-gear-fill" d="M${x} ${top} L${x + width} ${top + 15} L${x + width - 2} ${bottom - 34} L${x - width + 2} ${bottom - 34} L${x - width} ${top + 15} Z"/>
    <path class="avatar-gear-edge" d="M${x} ${top + 11} V${bottom - 41}"/>
    <path class="avatar-gear-ornament" d="M${x - 18} ${bottom - 35} Q${x} ${bottom - 45} ${x + 18} ${bottom - 35}"/>
    <rect class="avatar-gear-fill" x="${x - 4}" y="${bottom - 32}" width="8" height="34" rx="3"/>
  </g>`;
}

function staffMarkup(item, side) {
  const left = side === 'left';
  const x = left ? 35 : 145;
  const p = avatarVisualProfile(item);
  return `<g class="${pieceClass(item, 'weapon')} avatar-hand-${side}" data-avatar-role="weapon" data-avatar-side="${side}">
    <path class="avatar-gear-edge avatar-staff-shaft" d="M${x} 117 L${x + (left ? 12 : -12)} 292"/>
    <circle class="avatar-gear-fill" cx="${x}" cy="113" r="${12 + p.variant * 2}"/>
    <circle class="avatar-gear-ornament" cx="${x}" cy="113" r="${5 + p.variant}"/>
  </g>`;
}

function hammerMarkup(item, side) {
  const left = side === 'left';
  const x = left ? 35 : 145;
  return `<g class="${pieceClass(item, 'weapon')} avatar-hand-${side}" data-avatar-role="weapon" data-avatar-side="${side}">
    <path class="avatar-gear-edge avatar-staff-shaft" d="M${x} 145 L${x + (left ? 9 : -9)} 287"/>
    <path class="avatar-gear-fill" d="M${x - 24} 125 H${x + 24} L${x + 18} 158 H${x - 18} Z"/>
    <path class="avatar-gear-ornament" d="M${x - 13} 139 H${x + 13}"/>
  </g>`;
}

function bowMarkup(item, side, crossbow = false) {
  const left = side === 'left';
  const x = left ? 38 : 142;
  if (crossbow) {
    return `<g class="${pieceClass(item, 'weapon')} avatar-hand-${side}" data-avatar-role="weapon" data-avatar-side="${side}">
      <path class="avatar-gear-fill" d="M${x - 28} 155 Q${x} 137 ${x + 28} 155 L${x + 22} 166 Q${x} 153 ${x - 22} 166 Z"/>
      <path class="avatar-gear-edge" d="M${x} 156 L${x + (left ? 8 : -8)} 240 M${x - 28} 157 H${x + 28}"/>
    </g>`;
  }
  return `<g class="${pieceClass(item, 'weapon')} avatar-hand-${side}" data-avatar-role="weapon" data-avatar-side="${side}">
    <path class="avatar-gear-edge avatar-bow" d="M${x} 118 Q${x + (left ? -30 : 30)} 183 ${x} 252"/>
    <path class="avatar-gear-ornament" d="M${x} 118 L${x} 252"/>
  </g>`;
}

function weaponMarkup(item, side = 'left', twoHanded = false) {
  if (!item) return '';
  const kind = normalizeLootKind(item);
  if (kind === 'shield') return shieldMarkup(item, side);
  if (kind === 'staff') return staffMarkup(item, side);
  if (kind === 'hammer') return hammerMarkup(item, side);
  if (kind === 'bow') return bowMarkup(item, side, false);
  if (kind === 'crossbow') return bowMarkup(item, side, true);
  return bladeMarkup(item, side, twoHanded);
}

function sameItem(left, right) {
  if (!left || !right) return false;
  if (left.key && right.key) return left.key === right.key;
  return left.name === right.name
    && left.grade === right.grade
    && left.kind === right.kind
    && left.mainType === right.mainType;
}

export function renderPaperDollAvatar(items = {}) {
  const leftHand = items.leftHand || null;
  const rightHand = items.rightHand || null;
  const sharedTwoHand = sameItem(leftHand, rightHand) && Boolean(leftHand);
  const weaponLayers = sharedTwoHand
    ? weaponMarkup(leftHand, 'center', true)
    : `${weaponMarkup(leftHand, 'left')}${weaponMarkup(rightHand, 'right')}`;

  return `<svg class="paper-doll-avatar-gear" viewBox="0 0 180 360" aria-hidden="true" role="presentation">
    ${cloakMarkup(items.cloak)}
    ${lowerMarkup(items.down || items.legs, 'lower')}
    ${torsoMarkup(items.up)}
    ${glovesMarkup(items.hands)}
    ${helmetMarkup(items.head)}
    ${weaponLayers}
  </svg>`;
}
