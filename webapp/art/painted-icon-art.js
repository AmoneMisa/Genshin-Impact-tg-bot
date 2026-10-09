import { icon } from '../icons.js';
// Only visually reviewed paintings with both mobile WebP sizes are published.
export const PAINTED_ICONS=Object.freeze(['lifestone','attr-stone','attr-crystal','attr-jewel','soulshot','spiritshot','blessed-spiritshot','egg-wyvern','egg-dragon','egg-ancient','element-fire','element-water','element-wind','element-earth','element-holy','element-dark','champion-blue','champion-red']);
const TINT=/^(grade-tint-(nograde|d|c|b|a|s|s80|s84)|element-tint-(fire|water|wind|earth|holy|dark)|quality-tint-(normal|mid|high|top)|champion-tint-(blue|red))$/;
export function paintedIconHtml(key,tint='',fallback='✦'){
 if(!PAINTED_ICONS.includes(key))return icon('sparkle','mat-icon');
 const colour=TINT.test(tint)?tint:'';
 return `<img class="mat-icon ${colour}" src="/art/icons/${key}-128.webp" srcset="/art/icons/${key}-128.webp 1x, /art/icons/${key}-256.webp 2x" width="22" height="22" alt="" loading="lazy" decoding="async" draggable="false">`;
}
export function shotIcon(kind,grade,fallback='✦'){
 const key={soulshot:'soulshot',spiritshot:'spiritshot',blessed:'blessed-spiritshot'}[kind];
 return paintedIconHtml(key,'grade-tint-'+String(grade).toLowerCase(),fallback);
}

export function elementIcon(element,fallback='') {return paintedIconHtml('element-'+element,'element-tint-'+element,fallback);}
export function championIcon(champion,fallback='') {return paintedIconHtml('champion-'+champion,'champion-tint-'+champion,fallback);}
