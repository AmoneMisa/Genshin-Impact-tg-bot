import { itemArtKey, itemArtSources } from './art/items-art.js';
const GRADE_TONES = Object.freeze({
  noGrade: 'mist', D: 'mist', C: 'aqua', B: 'aqua', A: 'arcane', S: 'gold', SS: 'rose', SSS: 'prismatic',
});
const RARITY_TONES = Object.freeze({
  break: 'mist', common: 'mist', unusual: 'aqua', special: 'aqua', unique: 'arcane', rare: 'gold', royal: 'rose', magic: 'prismatic', goddess: 'prismatic',
});
const KIND_ALIASES = Object.freeze({
  gauntlets:'gauntlets', tiara:'tiara', sigill:'shield', sigil:'sigil', onehandedsword:'sword', twohandedsword:'sword', sword:'sword', dagger:'dagger', mace:'staff', staff:'staff', bow:'bow', crossbow:'crossbow', blunt:'hammer', hammer:'hammer', fists:'gauntlets', helmet:'helmet', gloves:'gloves', greaves:'greaves', boots:'boots', shield:'shield', cloak:'cloak', ring:'ring', earrings:'earring', earring:'earring', necklace:'amulet', amulet:'amulet', armor:'armor', chest:'armor', body:'armor', up:'armor',
});
const MOTION_BY_KIND = Object.freeze({
  sword:'spin', dagger:'spin', staff:'spin', hammer:'heavy-turn', bow:'heavy-turn', crossbow:'heavy-turn', shield:'heavy-turn', helmet:'wobble', armor:'float', gloves:'float', gauntlets:'float', greaves:'float', boots:'float', cloak:'float', ring:'orbit', earring:'orbit', amulet:'orbit', tiara:'wobble', relic:'orbit',
});
const MATERIALS = Object.freeze(['iron', 'bronze', 'moonsteel', 'obsidian']);
const ORNAMENTS = Object.freeze(['plain', 'runic', 'royal', 'crystal']);

function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
function cleanToken(value){return String(value||'').trim().replace(/[^a-zA-Z0-9_-]/g,'');}
function hashString(value){let hash=2166136261;for(const char of String(value)){hash^=char.codePointAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;}
function stableVisualKey(item={}){return [item.name,item.kind,item.category,item.mainType,item.grade,item.rarity,item.cost].map(value=>String(value??'')).join('|');}
function metricRatio(metric){if(!metric||typeof metric!=='object')return null;const current=Number(metric.current),max=Number(metric.max);if(!Number.isFinite(current)||!Number.isFinite(max)||max<=0)return null;return clamp(current/max,0,1);}

export function lootTone(item={}){const grade=String(item.grade||'').trim();if(GRADE_TONES[grade])return GRADE_TONES[grade];return RARITY_TONES[String(item.rarity||'').trim()]||'arcane';}
export function normalizeLootKind(item={}){// The priest/mage "robe" helmet is a tiara, not a helm.
if(String(item.kind||'').toLowerCase()==='robe'&&String(item.category||'').toLowerCase()==='helmet')return 'tiara';const candidates=[item.kind,item.category,item.mainType].map(value=>String(value||'').trim().toLowerCase()).filter(Boolean);for(const candidate of candidates){if(KIND_ALIASES[candidate])return KIND_ALIASES[candidate];}return 'relic';}
export function lootVisualProfile(item={}){const seed=hashString(stableVisualKey(item));return{seed,variant:seed%4,material:MATERIALS[(seed>>>3)%MATERIALS.length],ornament:ORNAMENTS[(seed>>>6)%ORNAMENTS.length]};}
export function lootConditionProfile(item={}){const qualityRatio=metricRatio(item.quality),durabilityRatio=metricRatio(item.persistence);const quality=qualityRatio===null?'unknown':qualityRatio<.25?'rough':qualityRatio<.6?'standard':qualityRatio<.85?'fine':'masterwork';const wear=durabilityRatio===null?'unknown':durabilityRatio<=0?'broken':durabilityRatio<.25?'critical':durabilityRatio<.55?'damaged':durabilityRatio<.8?'worn':'pristine';return{quality,wear,qualityRatio,durabilityRatio};}
export function swordShapeForLength(length){const mm=Math.max(0,Number(length)||0);const progress=clamp(mm/180,0,1);return{mm,tier:mm<45?'small':mm<100?'medium':'large',tipY:Math.round(48-progress*22),shoulderY:Math.round(66-progress*13),bladeBottomY:Math.round(151+progress*19),halfBladeWidth:Math.round(10+progress*7),guardHalfWidth:Math.round(31+progress*15),hiltBottomY:Math.round(202+progress*8),pommelRadius:Math.round(7+progress*3),spinSeconds:Number((4.8-progress*1.5).toFixed(2))};}
function gradeToken(item){return cleanToken(item?.grade||'noGrade').toLowerCase()||'nograde';}

export function renderLootArt(item={}, {reveal=false, animated=false}={}) {
  const kind=normalizeLootKind(item), tone=lootTone(item), grade=gradeToken(item);
  const profile=lootVisualProfile(item), condition=lootConditionProfile(item);
  const artKey=itemArtKey(kind,item), art=itemArtSources(artKey,reveal||animated);
  const qualityValue=condition.qualityRatio===null?'.6':condition.qualityRatio.toFixed(3);
  const durabilityValue=condition.durabilityRatio===null?'1':condition.durabilityRatio.toFixed(3);
  return `<div class="loot-art loot-art-2d loot-kind-${kind} motion-${MOTION_BY_KIND[kind]||'float'} tone-${tone} grade-${grade} material-${profile.material} ornament-${profile.ornament} quality-${condition.quality} wear-${condition.wear}${reveal?' is-reveal':''}${animated?' is-animated':''}" data-art-key="${artKey}" data-loot-kind="${kind}" data-loot-type="${cleanToken(item.kind)}" data-loot-tone="${tone}" data-loot-grade="${grade}" data-loot-variant="${profile.variant}" data-loot-material="${profile.material}" data-loot-ornament="${profile.ornament}" data-loot-quality="${condition.quality}" data-loot-wear="${condition.wear}" style="--loot-quality:${qualityValue};--loot-durability:${durabilityValue}" aria-hidden="true"><span class="loot-aura"></span><span class="loot-rune-ring"></span><span class="loot-art-fallback">◇</span><img class="loot-item-image" src="${art.src}" srcset="${art.srcset}" sizes="${art.sizes}" width="512" height="768" alt="" loading="${reveal||animated?'eager':'lazy'}" decoding="async" draggable="false"><span class="loot-wear-marks"></span><span class="loot-spark loot-spark-a"></span><span class="loot-spark loot-spark-b"></span><span class="loot-spark loot-spark-c"></span></div>`;
}
export function renderDailySwordArt(length,{animated=true}={}) {
  const shape=swordShapeForLength(length);
  const item={kind:shape.tier==='small'?'dagger':shape.tier==='large'?'twoHandedSword':'oneHandedSword',grade:'C'};
  return renderLootArt(item,{animated})
    .replace('loot-art loot-art-2d',`loot-art loot-art-2d daily-sword-art size-${shape.tier}`)
    .replace('data-art-key=',`data-sword-size="${shape.tier}" data-sword-length="${shape.mm}" data-art-key=`)
    .replace(/data-loot-variant="\d"/,`data-loot-variant="${shape.tier==='small'?0:shape.tier==='medium'?1:3}"`);
}
