// Curated artwork. Asset names are allowlisted; item names never become URLs.
import { CATALOG_ITEM_ART } from './catalog-item-art.js';
import { SPECIAL_ITEM_ART } from './special-item-art.js';
export const BASE_ITEM_ART_KEYS = Object.freeze([
  'sword', 'greatsword', 'dagger', 'staff', 'bow', 'crossbow', 'hammer', 'shield',
  'sigil', 'helmet', 'armor', 'mantle', 'gloves', 'bracers', 'gauntlets',
  'greaves', 'leg-wraps', 'boots', 'anklets', 'cloak', 'ring', 'earring',
  'amulet', 'tiara', 'relic',
]);
export const ITEM_ART_VARIANTS = Object.freeze([
  // Fist and claw weapons have their own paintings in three tiers.
  {key:'fists-low',kind:'fists',grades:['NOGRADE','D','C']},
  {key:'fists-mid',kind:'fists',grades:['B','A','S']},
  {key:'fists-high',kind:'fists',grades:['S80','S84']},
  {key:'staff-sun',kind:'staff',grades:['S80','S84']},
  {key:'sword-prismatic',kind:'sword',grades:['S80','S84']},
  {key:'ring-filigree',kind:'ring',grades:['B','A','S']},
  {key:'ring-winged',kind:'ring',grades:['S80','S84']},
  {key:'bow-rose',kind:'bow',grades:['S80','S84']},
  {key:'mantle-royal',kind:'armor',type:'robe',grades:['S80','S84']},
  {key:'armor-prismatic',kind:'armor',excludeTypes:['robe','light'],grades:['S80','S84']},
  {key:'gauntlets-raven',kind:'gauntlets',grades:['S80','S84']},
  {key:'boots-raven',kind:'boots',excludeTypes:['robe','light'],grades:['S80','S84']},
  {key:'tiara-night',kind:'tiara',grades:['S80','S84']},
  {key:'earring-sun',kind:'earring',grades:['S80','S84']},
  {key:'amulet-butterfly',kind:'amulet',grades:['S80','S84']},
  {key:'helmet-obsidian',kind:'helmet',excludeTypes:['light'],grades:['S80','S84']},
  {key:'greaves-obsidian',kind:'greaves',excludeTypes:['robe','light'],grades:['S80','S84']},
  {key:'shield-dragon',kind:'shield',grades:['S80','S84']},
  {key:'hammer-dragon',kind:'hammer',grades:['S80','S84']},
  {key:'cloak-starfield',kind:'cloak',grades:['S80','S84']},
  {key:'sigil-nebula',kind:'sigil',grades:['S80','S84']},
  {key:'dagger-shadow',kind:'dagger',grades:['S80','S84']},
  {key:'crossbow-shadow',kind:'crossbow',grades:['S80','S84']},
  {key:'greatsword-solar',kind:'greatsword',type:'twohandedsword',grades:['S80','S84']},
  {key:'bracers-crystal',kind:'gloves',type:'robe',grades:['S80','S84']},
  {key:'anklets-crystal',kind:'boots',type:'robe',grades:['S80','S84']},
  {key:'leg-wraps-tidal',kind:'greaves',type:'robe',grades:['S80','S84']},
  {key:'gloves-alchemist',kind:'gloves',excludeTypes:['robe','light'],grades:['S80','S84']},
  {key:'relic-eclipse',kind:'relic',grades:['S80','S84']},
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
  {key:'helmet-nightweave',kind:'helmet',type:'light',grades:['S80','S84']},
  {key:'armor-nightweave',kind:'armor',type:'light',grades:['S80','S84']},
  {key:'gloves-nightweave',kind:'gloves',type:'light',grades:['S80','S84']},
  {key:'greaves-nightweave',kind:'greaves',type:'light',grades:['S80','S84']},
  {key:'boots-nightweave',kind:'boots',type:'light',grades:['S80','S84']},
].map(variant=>Object.freeze({...variant,grades:Object.freeze(variant.grades),...(variant.excludeTypes?{excludeTypes:Object.freeze(variant.excludeTypes)}:{})})));
// One painting per epic jewel (item.epicBoss), see docs/imagegen-prompts.md 5e.
export const EPIC_ITEM_ART_KEYS = Object.freeze(['queenAnt','core','orfen','zaken','baium','antharas','valakas','frintezza'].map(boss=>`epic-${boss}`));
export const ITEM_ART_KEYS = Object.freeze([...BASE_ITEM_ART_KEYS,...ITEM_ART_VARIANTS.map(variant=>variant.key),...EPIC_ITEM_ART_KEYS,...CATALOG_ITEM_ART.map(entry=>entry.key),...SPECIAL_ITEM_ART.filter(key=>key.startsWith('epic-weapon-'))]);
const keys = new Set(ITEM_ART_KEYS);
const catalogIdentity = item => [item.name,item.grade,item.kind,item.category].map(value=>String(value||'').trim().toLowerCase()).join('|');
const catalogArt = new Map(CATALOG_ITEM_ART.map(entry=>[catalogIdentity(entry),entry.key]));
const ROBE_ART = Object.freeze({ armor: 'mantle', gloves: 'bracers', greaves: 'leg-wraps', boots: 'anklets' });
export function itemArtKey(kind, item = {}) {
  if(item.epicWeapon && keys.has('epic-weapon-'+item.epicWeapon))return 'epic-weapon-'+item.epicWeapon;
  if (item.epicBoss && keys.has(`epic-${item.epicBoss}`)) return `epic-${item.epicBoss}`;
  const namedArt = catalogArt.get(catalogIdentity(item));
  if (namedArt) return namedArt;
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
