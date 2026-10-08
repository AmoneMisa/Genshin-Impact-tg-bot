// Painted icons for enchant and crafting materials (art-source/icons, docs/imagegen-prompts.md 5f).
// The paintings are neutral gold; each grade gets its colour from a CSS hue turn (see .mat-icon in equipment.css).
const ICONS = Object.freeze({scroll: 'scroll', blessed: 'scroll-blessed', crystal: 'crystal'});
const FAMILIES = Object.freeze(['binder', 'leather', 'fiber', 'gem']);
const GRADES = Object.freeze(['noGrade', 'D', 'C', 'B', 'A', 'S', 'S80', 'S84']);

/** {icon, grade} of an enchant / crafting material key, or null for any other material. */
export function materialIconInfo(key) {
  const parts = String(key || '').split('_');
  // Typed scrolls: blessed_weapon_A, safe_armor_S80 (blessed ones share the blessed painting).
  if (parts.length === 3 && ['weapon', 'armor'].includes(parts[1]) && GRADES.includes(parts[2])) {
    if (parts[0] === 'blessed') return { icon: 'scroll-blessed', grade: parts[2] };
    if (parts[0] === 'safe') return { icon: 'scroll-safe', grade: parts[2] };
  }
  if (ICONS[parts[0]] && GRADES.includes(parts[1]) && parts.length === 2) return { icon: ICONS[parts[0]], grade: parts[1] };
  if (parts[0] === 'craft' && FAMILIES.includes(parts[1]) && GRADES.includes(parts[2])) return { icon: parts[1], grade: parts[2] };
  return null;
}

/** Image markup for a material, or the given emoji when it has no painting. */
export function materialIcon(key, fallback = '✦') {
  const info = materialIconInfo(key);
  if (!info) return fallback;
  const url = size => `/art/icons/${info.icon}-${size}.webp`;
  return `<img class="mat-icon grade-tint-${info.grade.toLowerCase()}" src="${url(128)}" srcset="${url(128)} 1x, ${url(256)} 2x" width="22" height="22" alt="" loading="lazy" decoding="async" draggable="false">`;
}
