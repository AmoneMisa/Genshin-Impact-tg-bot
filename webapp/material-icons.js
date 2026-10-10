import {paintedIconHtml} from './art/painted-icon-art.js';
import {icon} from './icons.js';
import {l2MaterialIcon} from './art/l2-icon-art.js';
// Painted icons for enchant and crafting materials (art-source/icons, docs/imagegen-prompts.md 5f).
// The paintings are neutral gold; each grade gets its colour from a CSS hue turn (see .mat-icon in equipment.css).
const ICONS = Object.freeze({scroll: 'scroll', blessed: 'scroll-blessed', crystal: 'crystal'});
const FAMILIES = Object.freeze(['binder', 'leather', 'fiber', 'gem']);
const GRADES = Object.freeze(['noGrade', 'D', 'C', 'B', 'A', 'S', 'S80', 'S84']);

/** {icon, grade} of an enchant / crafting material key, or null for any other material. */
export function materialIconInfo(key) {
  const parts = String(key || '').split('_');
  if(['soul','seal'].includes(parts[0])&&['red','green','blue'].includes(parts[1])&&(parts[0]==='seal'&&parts.length===2||parts.length===3&&/^(?:[0-9]|1[0-7])$/.test(parts[2])))return {icon:'crystal',color:parts[1]};
  if(parts[0]==='lifestone' && GRADES.includes(parts.at(-1)) && (parts.length===2 || parts.length===3 && ['mid','high','top'].includes(parts[1])))return {icon:'lifestone',grade:parts.at(-1),quality:parts.length===3?parts[1]:'normal'};
  if(parts[0]==='attr' && parts.length===3 && ['stone','crystal','jewel'].includes(parts[1]) && ['fire','water','wind','earth','holy','dark'].includes(parts[2]))return {icon:'attr-'+parts[1],element:parts[2]};
  if(parts[0]==='egg' && parts.length===2 && ['wyvern','dragon','ancient'].includes(parts[1]))return {icon:'egg-'+parts[1]};
  if(['soulshot','spiritshot'].includes(parts[0]) && parts.length===2 && GRADES.includes(parts[1]))return {icon:parts[0],grade:parts[1]};
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
  const original=l2MaterialIcon(key);
  if(original)return original;
  const info = materialIconInfo(key);
  if (!info) return icon('sparkle','mat-icon');
  if(info.color)return '<img class="mat-icon soul-'+info.color+'" src="/art/icons/crystal-128.webp" width="22" height="22" alt="" style="filter:hue-rotate('+({red:315,green:65,blue:170}[info.color])+'deg) saturate(1.8)">';
  if(['lifestone','attr-stone','attr-crystal','attr-jewel','soulshot','spiritshot','egg-wyvern','egg-dragon','egg-ancient'].includes(info.icon))return paintedIconHtml(info.icon,info.quality?'quality-tint-'+info.quality:info.element?'element-tint-'+info.element:info.grade?'grade-tint-'+info.grade.toLowerCase():'',fallback);
  const url = size => `/art/icons/${info.icon}-${size}.webp`;
  return `<img class="mat-icon grade-tint-${info.grade.toLowerCase()}" src="${url(128)}" srcset="${url(128)} 1x, ${url(256)} 2x" width="22" height="22" alt="" loading="lazy" decoding="async" draggable="false">`;
}
