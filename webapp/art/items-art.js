// Curated artwork. Asset names are allowlisted; item names never become URLs.
export const BASE_ITEM_ART_KEYS = Object.freeze([
  'sword', 'greatsword', 'dagger', 'staff', 'bow', 'crossbow', 'hammer', 'shield',
  'sigil', 'helmet', 'armor', 'mantle', 'gloves', 'bracers', 'gauntlets',
  'greaves', 'leg-wraps', 'boots', 'anklets', 'cloak', 'ring', 'earring',
  'amulet', 'tiara', 'relic',
]);
export const ITEM_ART_VARIANTS = Object.freeze([
  {key:'staff-sun',kind:'staff',grades:['SS','SSS']},
  {key:'sword-prismatic',kind:'sword',grades:['SS','SSS']},
  {key:'ring-filigree',kind:'ring',grades:['B','A','S']},
  {key:'ring-winged',kind:'ring',grades:['SS','SSS']},
  {key:'bow-rose',kind:'bow',grades:['SS','SSS']},
  {key:'mantle-royal',kind:'armor',type:'robe',grades:['SS','SSS']},
  {key:'armor-prismatic',kind:'armor',excludeTypes:['robe','light'],grades:['SS','SSS']},
  {key:'gauntlets-raven',kind:'gauntlets',grades:['SS','SSS']},
  {key:'boots-raven',kind:'boots',excludeTypes:['robe','light'],grades:['SS','SSS']},
  {key:'tiara-night',kind:'tiara',grades:['SS','SSS']},
  {key:'earring-sun',kind:'earring',grades:['SS','SSS']},
  {key:'amulet-butterfly',kind:'amulet',grades:['SS','SSS']},
  {key:'helmet-obsidian',kind:'helmet',excludeTypes:['light'],grades:['SS','SSS']},
  {key:'greaves-obsidian',kind:'greaves',excludeTypes:['robe','light'],grades:['SS','SSS']},
  {key:'shield-dragon',kind:'shield',grades:['SS','SSS']},
  {key:'hammer-dragon',kind:'hammer',grades:['SS','SSS']},
  {key:'cloak-starfield',kind:'cloak',grades:['SS','SSS']},
  {key:'sigil-nebula',kind:'sigil',grades:['SS','SSS']},
  {key:'dagger-shadow',kind:'dagger',grades:['SS','SSS']},
  {key:'crossbow-shadow',kind:'crossbow',grades:['SS','SSS']},
  {key:'greatsword-solar',kind:'greatsword',type:'twohandedsword',grades:['SS','SSS']},
  {key:'bracers-crystal',kind:'gloves',type:'robe',grades:['SS','SSS']},
  {key:'anklets-crystal',kind:'boots',type:'robe',grades:['SS','SSS']},
  {key:'leg-wraps-tidal',kind:'greaves',type:'robe',grades:['SS','SSS']},
  {key:'gloves-alchemist',kind:'gloves',excludeTypes:['robe','light'],grades:['SS','SSS']},
  {key:'relic-eclipse',kind:'relic',grades:['SS','SSS']},
  {key:'sword-opal',kind:'sword',grades:['B','A','S']},
  {key:'armor-opal',kind:'armor',excludeTypes:['robe','light','medium'],grades:['B','A','S']},
  {key:'bow-verdant',kind:'bow',grades:['B','A','S']},
  {key:'mantle-astral',kind:'armor',type:'robe',grades:['B','A','S']},
  {key:'staff-jade',kind:'staff',grades:['B','A','S']},
  {key:'shield-seraph',kind:'shield',grades:['B','A','S']},
  {key:'helmet-seraph',kind:'helmet',excludeTypes:['light','medium'],grades:['B','A','S']},
  {key:'amulet-ruby',kind:'amulet',grades:['B','A','S']},
  {key:'earring-ruby',kind:'earring',grades:['B','A','S']},
  {key:'tiara-crescent',kind:'tiara',grades:['B','A','S']},
  {key:'gauntlets-dusk',kind:'gauntlets',grades:['B','A','S']},
  {key:'greaves-dusk',kind:'greaves',excludeTypes:['robe','light','medium'],grades:['B','A','S']},
  {key:'boots-dusk',kind:'boots',excludeTypes:['robe','light','medium'],grades:['B','A','S']},
  {key:'cloak-dusk',kind:'cloak',grades:['B','A','S']},
  {key:'dagger-tide',kind:'dagger',grades:['B','A','S']},
  {key:'hammer-opal',kind:'hammer',grades:['B','A','S']},
  {key:'greatsword-dawn',kind:'greatsword',type:'twohandedsword',grades:['B','A','S']},
  {key:'sigil-dawn',kind:'sigil',grades:['B','A','S']},
  {key:'crossbow-spectral',kind:'crossbow',grades:['B','A','S']},
  {key:'relic-spectral',kind:'relic',grades:['B','A','S']},
  {key:'bracers-ruby',kind:'gloves',type:'robe',grades:['B','A','S']},
  {key:'anklets-ruby',kind:'boots',type:'robe',grades:['B','A','S']},
  {key:'gloves-sapphire',kind:'gloves',excludeTypes:['robe'],grades:['B','A','S']},
  {key:'leg-wraps-pearl',kind:'greaves',type:'robe',grades:['B','A','S']},
  {key:'helmet-shadowleather',kind:'helmet',type:'light',grades:['B','A','S']},
  {key:'armor-shadowleather',kind:'armor',type:'light',grades:['B','A','S']},
  {key:'greaves-shadowleather',kind:'greaves',type:'light',grades:['B','A','S']},
  {key:'boots-shadowleather',kind:'boots',type:'light',grades:['B','A','S']},
  {key:'helmet-sapphireguard',kind:'helmet',type:'medium',grades:['B','A','S']},
  {key:'armor-sapphireguard',kind:'armor',type:'medium',grades:['B','A','S']},
  {key:'greaves-sapphireguard',kind:'greaves',type:'medium',grades:['B','A','S']},
  {key:'boots-sapphireguard',kind:'boots',type:'medium',grades:['B','A','S']},
  {key:'helmet-nightweave',kind:'helmet',type:'light',grades:['SS','SSS']},
  {key:'armor-nightweave',kind:'armor',type:'light',grades:['SS','SSS']},
  {key:'gloves-nightweave',kind:'gloves',type:'light',grades:['SS','SSS']},
  {key:'greaves-nightweave',kind:'greaves',type:'light',grades:['SS','SSS']},
  {key:'boots-nightweave',kind:'boots',type:'light',grades:['SS','SSS']},
].map(variant=>Object.freeze({...variant,grades:Object.freeze(variant.grades),...(variant.excludeTypes?{excludeTypes:Object.freeze(variant.excludeTypes)}:{})})));
export const ITEM_ART_KEYS = Object.freeze([...BASE_ITEM_ART_KEYS,...ITEM_ART_VARIANTS.map(variant=>variant.key)]);
const keys = new Set(ITEM_ART_KEYS);
const ROBE_ART = Object.freeze({ armor: 'mantle', gloves: 'bracers', greaves: 'leg-wraps', boots: 'anklets' });
export function itemArtKey(kind, item = {}) {
  const type = String(item.kind || '').toLowerCase();
  const grade = String(item.grade || '').trim().toUpperCase();
  if (kind === 'sword' && type === 'twohandedsword') kind = 'greatsword';
  if (kind === 'shield' && type === 'sigill') kind = 'sigil';
  const variant = ITEM_ART_VARIANTS.find(entry=>entry.kind===kind && entry.grades.includes(grade) && (!entry.type || entry.type===type) && !entry.excludeTypes?.includes(type));
  if (variant) return variant.key;
  if (type === 'robe' && ROBE_ART[kind]) return ROBE_ART[kind];
  return keys.has(kind) ? kind : 'relic';
}
export function itemArtSources(key, reveal = false) {
  const safe = keys.has(key) ? key : 'relic';
  const url = size => `/art/items/v1/${safe}-${size}.webp`;
  return {
    src: url(reveal ? 256 : 128),
    srcset: (reveal ? [128, 256, 512] : [128, 256]).map(size => `${url(size)} ${size}w`).join(', '),
    sizes: reveal ? '(max-width: 390px) 190px, 220px' : '96px',
  };
}
