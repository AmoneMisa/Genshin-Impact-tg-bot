import { escapeHtml } from './escape-html.js';
import { renderForgeLootArt } from './loot-forge.js';
import { renderPaperDollAvatar } from './equipment-paper-doll-avatar.js';
import {fullBodyHeroUrl} from './art/world-art.js';

export const PAPER_DOLL_SLOTS = [
  ['head','Голова',50,8],
  ['leftEar','Левое ухо',18,16],
  ['rightEar','Правое ухо',82,16],
  ['necklace','Шея',50,25],
  ['up','Верх',18,37],
  ['cloak','Плащ',82,37],
  ['hands','Руки',18,54],
  ['down','Низ',82,54],
  ['leftHand','Левая рука',18,72],
  ['rightHand','Правая рука',82,72],
  ['leftRing','Левое кольцо',34,87],
  ['rightRing','Правое кольцо',66,87],
  ['legs','Ноги',50,96],
];

/**
 * Portrait layout (prototype "Мой персонаж"): the painted class portrait stands in
 * the middle and the slots line up in two framed columns on either side.
 */
export const PORTRAIT_SLOT_LAYOUT = {
  head:[9,7], leftEar:[9,21], up:[9,35], hands:[9,49], leftHand:[9,63], leftRing:[9,77], legs:[9,91],
  necklace:[91,7], rightEar:[91,21], cloak:[91,35], down:[91,49], rightHand:[91,63], rightRing:[91,77],
};


function sameSnapshot(item,slotItem){
  if(!item||!slotItem)return false;
  return item.name===slotItem.name
    && item.grade===slotItem.grade
    && item.mainType===slotItem.mainType
    && item.kind===slotItem.kind;
}

// The paper doll names slots after the body (head/hands/legs) but equipment
// templates equip into helmet/gloves/boots, so each doll slot also accepts its alias.
const SLOT_ALIASES={head:['head','helmet'],hands:['hands','gloves'],legs:['legs','boots']};

/** Template slot name (e.g. 'helmet') → the paper-doll slot that displays it ('head'). */
export function dollSlotFor(slot){return Object.keys(SLOT_ALIASES).find(doll=>SLOT_ALIASES[doll].includes(slot))||slot;}

export function equippedItemForSlot(state={},slot){
  const names=SLOT_ALIASES[slot]||[slot];
  const equippedName=names.find(name=>state.equippedSlots?.[name]);
  const slotItem=equippedName?state.equippedSlots[equippedName]:null;
  if(!slotItem)return null;
  const candidates=(state.items||[]).filter(item=>item.isUsed&&Array.isArray(item.slots)&&item.slots.includes(equippedName));
  return candidates.find(item=>sameSnapshot(item,slotItem))||candidates[0]||null;
}

export function avatarItemsForState(state={}){
  return {
    head:equippedItemForSlot(state,'head'),
    up:equippedItemForSlot(state,'up'),
    cloak:equippedItemForSlot(state,'cloak'),
    hands:equippedItemForSlot(state,'hands'),
    down:equippedItemForSlot(state,'down'),
    legs:equippedItemForSlot(state,'legs'),
    leftHand:equippedItemForSlot(state,'leftHand'),
    rightHand:equippedItemForSlot(state,'rightHand'),
  };
}

function figureMarkup(state){
  const avatarItems=avatarItemsForState(state);
  return `<div class="paper-doll-figure" aria-hidden="true">
    ${renderPaperDollAvatar(avatarItems)}
    <span class="paper-doll-core"></span>
  </div>`;
}

function slotMarkup(state,slot,label,x,y){
  const item=equippedItemForSlot(state,slot);
  const occupied=Boolean(item);
  const slotSnapshot=(SLOT_ALIASES[slot]||[slot]).map(name=>state.equippedSlots?.[name]).find(Boolean)||null;
  const displayItem=item||slotSnapshot;
  const grade=displayItem?.grade||'noGrade';
  const name=displayItem?.translatedName||displayItem?.name||'Пусто';
  const art=item?renderForgeLootArt(item):'<span class="paper-doll-empty-rune" aria-hidden="true"></span>';
  const [px,py]=PORTRAIT_SLOT_LAYOUT[slot]||[x,y];
  return `<article class="loadout-slot paper-doll-slot ${occupied?'occupied':'empty'}" data-slot="${escapeHtml(slot)}" data-item-key="${escapeHtml(item?.key||'')}" data-grade="${escapeHtml(grade)}" style="--slot-x:${x}%;--slot-y:${y}%;--portrait-x:${px}%;--portrait-y:${py}%">
    <span class="paper-doll-slot-art">${art}</span>
    <span class="paper-doll-slot-copy"><small>${escapeHtml(label)}</small><strong>${escapeHtml(grade)}${displayItem?.forgeLevel?` +${displayItem.forgeLevel}`:''}</strong><span>${escapeHtml(name)}</span></span>
  </article>`;
}

export function renderEquipmentPaperDoll(container,state={},{portrait=null}={}){
  if(!container)return;
  portrait ||= fullBodyHeroUrl(state.player || {});
  const occupied=PAPER_DOLL_SLOTS.filter(([slot])=>(SLOT_ALIASES[slot]||[slot]).some(name=>state.equippedSlots?.[name])).length;
  container.className='loadout-grid paper-doll-loadout';
  container.innerHTML=`<div class="paper-doll-stage${portrait?' has-portrait':''}" data-paper-doll-stage${portrait?` style="--portrait:url('${escapeHtml(portrait)}')"`:''}>
    ${portrait?'<div class="paper-doll-portrait" aria-hidden="true"></div>':''}
    <div class="paper-doll-circuit" aria-hidden="true"></div>
    ${figureMarkup(state)}
    ${PAPER_DOLL_SLOTS.map(([slot,label,x,y])=>slotMarkup(state,slot,label,x,y)).join('')}
    <div class="paper-doll-caption"><strong>${occupied}</strong><span>активных слотов</span></div>
  </div>`;
}
