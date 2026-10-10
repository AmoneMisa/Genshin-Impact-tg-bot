import {
  lootConditionProfile,
  lootTone,
  lootVisualProfile,
  normalizeLootKind,
} from './loot-renderer.js';
import { forgeVisualProfile } from './loot-forge.js';
import {itemArtKey,itemArtSources} from './art/items-art.js';

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

function sameItem(left, right) {
  if (!left || !right) return false;
  if (left.key && right.key) return left.key === right.key;
  return left.name === right.name
    && left.grade === right.grade
    && left.kind === right.kind
    && left.mainType === right.mainType;
}


function paintedPiece(item,role,side='',twoHanded=false) {
 if(!item)return '';
 const p=avatarVisualProfile(item),art=itemArtSources(itemArtKey(p.kind,item));
 return '<span class="'+pieceClass(item,role)+(twoHanded?' avatar-two-hand':'')+'" data-avatar-role="'+role+'" data-avatar-side="'+side+'"><img src="'+art.src+'" srcset="'+art.srcset+'" alt="" decoding="async"></span>';
}
export function renderPaperDollAvatar(items={}) {
 const left=items.leftHand,right=items.rightHand,shared=sameItem(left,right)&&Boolean(left);
 return '<div class="paper-doll-avatar-gear" aria-hidden="true">'+paintedPiece(items.cloak,'cloak')+paintedPiece(items.down||items.legs,'lower')+paintedPiece(items.up,'torso')+paintedPiece(items.hands,'gloves')+paintedPiece(items.head,'helmet')+(shared?paintedPiece(left,'weapon','center',true):paintedPiece(left,'weapon','left')+paintedPiece(right,'weapon','right'))+'</div>';
}
