import { renderForgeLootArt } from './loot-forge.js';
import { renderPaperDollAvatar } from './equipment-paper-doll-avatar.js';

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

function escapeHtml(value){
  return String(value??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function sameSnapshot(item,slotItem){
  if(!item||!slotItem)return false;
  return item.name===slotItem.name
    && item.grade===slotItem.grade
    && item.mainType===slotItem.mainType
    && item.kind===slotItem.kind;
}

export function equippedItemForSlot(state={},slot){
  const slotItem=state.equippedSlots?.[slot];
  if(!slotItem)return null;
  const candidates=(state.items||[]).filter(item=>item.isUsed&&Array.isArray(item.slots)&&item.slots.includes(slot));
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
    <svg viewBox="0 0 180 360" role="presentation">
      <defs>
        <linearGradient id="pd-body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dfd8ff" stop-opacity=".3"/><stop offset=".48" stop-color="#9f8ed6" stop-opacity=".12"/><stop offset="1" stop-color="#6dd7d0" stop-opacity=".05"/></linearGradient>
        <linearGradient id="pd-edge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe9ff" stop-opacity=".65"/><stop offset="1" stop-color="#8c7bbd" stop-opacity=".1"/></linearGradient>
      </defs>
      <ellipse cx="90" cy="58" rx="30" ry="36" fill="url(#pd-body)" stroke="url(#pd-edge)" stroke-width="2"/>
      <path d="M62 86 39 128 50 210 39 278 66 332 84 332 76 228 90 188 104 228 96 332 114 332 141 278 130 210 141 128 118 86 103 76 77 76Z" fill="url(#pd-body)" stroke="url(#pd-edge)" stroke-width="2"/>
      <path d="M64 98 32 146 14 222 31 228 60 164M116 98l32 48 18 76-17 6-29-64" fill="none" stroke="url(#pd-edge)" stroke-width="9" stroke-linecap="round" opacity=".62"/>
      <path d="M52 113 90 139 128 113M50 211h80M68 332h44" fill="none" stroke="#cfc5ff" stroke-opacity=".18" stroke-width="2" stroke-dasharray="5 8"/>
      <circle cx="90" cy="178" r="55" fill="none" stroke="#b8a7ef" stroke-opacity=".08" stroke-width="1" stroke-dasharray="4 7"/>
    </svg>
    ${renderPaperDollAvatar(avatarItems)}
    <span class="paper-doll-core"></span>
  </div>`;
}

function slotMarkup(state,slot,label,x,y){
  const item=equippedItemForSlot(state,slot);
  const occupied=Boolean(item);
  const slotSnapshot=state.equippedSlots?.[slot]||null;
  const displayItem=item||slotSnapshot;
  const grade=displayItem?.grade||'noGrade';
  const name=displayItem?.translatedName||displayItem?.name||'Пусто';
  const art=item?renderForgeLootArt(item):'<span class="paper-doll-empty-rune" aria-hidden="true">◇</span>';
  return `<article class="loadout-slot paper-doll-slot ${occupied?'occupied':'empty'}" data-slot="${escapeHtml(slot)}" data-item-key="${escapeHtml(item?.key||'')}" data-grade="${escapeHtml(grade)}" style="--slot-x:${x}%;--slot-y:${y}%">
    <span class="paper-doll-slot-art">${art}</span>
    <span class="paper-doll-slot-copy"><small>${escapeHtml(label)}</small><strong>${escapeHtml(grade)}${displayItem?.forgeLevel?` +${displayItem.forgeLevel}`:''}</strong><span>${escapeHtml(name)}</span></span>
  </article>`;
}

export function renderEquipmentPaperDoll(container,state={}){
  if(!container)return;
  const occupied=PAPER_DOLL_SLOTS.filter(([slot])=>state.equippedSlots?.[slot]).length;
  container.className='loadout-grid paper-doll-loadout';
  container.innerHTML=`<div class="paper-doll-stage" data-paper-doll-stage>
    <div class="paper-doll-circuit" aria-hidden="true"></div>
    ${figureMarkup(state)}
    ${PAPER_DOLL_SLOTS.map(([slot,label,x,y])=>slotMarkup(state,slot,label,x,y)).join('')}
    <div class="paper-doll-caption"><strong>${occupied}</strong><span>активных слотов</span></div>
  </div>`;
}
