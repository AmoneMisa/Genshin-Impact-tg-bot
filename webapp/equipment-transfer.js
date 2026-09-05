import { renderForgeLootArt } from './loot-forge.js';

function sameEquipmentSnapshot(slotItem, item) {
  if (!slotItem || !item) return false;
  return slotItem.name === item.name
    && slotItem.grade === item.grade
    && slotItem.mainType === item.mainType
    && slotItem.kind === item.kind;
}

export function matchingLoadoutSlots(equipment = {}, item = {}) {
  const equippedSlots = equipment.equippedSlots || {};
  const requestedSlots = Array.isArray(item.slots) ? item.slots : [];
  return requestedSlots.filter((slot) => sameEquipmentSnapshot(equippedSlots[slot], item));
}

export function combineRects(rects = []) {
  const valid = rects.filter((rect) => rect
    && Number.isFinite(rect.left)
    && Number.isFinite(rect.top)
    && Number.isFinite(rect.width)
    && Number.isFinite(rect.height));
  if (!valid.length) return null;
  const left = Math.min(...valid.map((rect) => rect.left));
  const top = Math.min(...valid.map((rect) => rect.top));
  const right = Math.max(...valid.map((rect) => rect.left + rect.width));
  const bottom = Math.max(...valid.map((rect) => rect.top + rect.height));
  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
}

function rectOf(node) {
  if (!node?.getBoundingClientRect) return null;
  const rect = node.getBoundingClientRect();
  return combineRects([rect]);
}

function itemCardByKey(list, key) {
  return [...(list?.querySelectorAll?.('[data-key]') || [])]
    .find((node) => node.dataset.key === key) || null;
}

function loadoutNodes(loadout, equipment, item) {
  const slots = new Set(matchingLoadoutSlots(equipment, item));
  return [...(loadout?.querySelectorAll?.('[data-slot]') || [])]
    .filter((node) => slots.has(node.dataset.slot));
}

export function captureEquipmentTransfer(action, item, { list, loadout, equipment } = {}) {
  if (!item || !['equip', 'unequip'].includes(action)) return null;
  let sourceNode = null;
  let source = null;
  if (action === 'equip') {
    const card = itemCardByKey(list, item.key);
    sourceNode = card?.querySelector?.('.equipment-loot-preview') || card;
    source = rectOf(sourceNode);
  } else {
    const nodes = loadoutNodes(loadout, equipment, item);
    sourceNode = nodes[0] || null;
    source = combineRects(nodes.map((node) => node.getBoundingClientRect()));
  }
  if (!source) return null;
  return { action, item: { ...item }, source };
}

function reducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function flashTargets(nodes = []) {
  for (const node of nodes) {
    node.classList.add('equipment-transfer-target');
    window.setTimeout(() => node.classList.remove('equipment-transfer-target'), 760);
  }
}

export function playEquipmentTransfer(transfer, { equipment, list, loadout, item } = {}) {
  if (!transfer || typeof document === 'undefined' || typeof window === 'undefined') return false;
  const currentItem = item || transfer.item;
  let targetNodes = [];
  if (transfer.action === 'equip') {
    targetNodes = loadoutNodes(loadout, equipment, currentItem);
  } else {
    const card = itemCardByKey(list, currentItem?.key);
    const preview = card?.querySelector?.('.equipment-loot-preview') || card;
    if (preview) targetNodes = [preview];
  }
  const target = combineRects(targetNodes.map((node) => node.getBoundingClientRect()));
  if (!target) return false;
  flashTargets(targetNodes);
  if (reducedMotion()) return true;

  const layer = document.createElement('div');
  layer.className = `equipment-transfer-layer transfer-${transfer.action}`;
  const ghost = document.createElement('div');
  ghost.className = 'equipment-transfer-ghost';
  ghost.innerHTML = `${renderForgeLootArt(currentItem)}<span class="equipment-transfer-spark" aria-hidden="true"></span>`;
  layer.appendChild(ghost);
  document.body.appendChild(layer);

  const size = Math.max(76, Math.min(112, transfer.source.width || 96));
  const startX = transfer.source.centerX - size / 2;
  const startY = transfer.source.centerY - size / 2;
  const dx = target.centerX - transfer.source.centerX;
  const dy = target.centerY - transfer.source.centerY;
  ghost.style.left = `${startX}px`;
  ghost.style.top = `${startY}px`;
  ghost.style.width = `${size}px`;
  ghost.style.height = `${size}px`;

  if (typeof ghost.animate !== 'function') {
    layer.remove();
    return true;
  }
  const equip = transfer.action === 'equip';
  const animation = ghost.animate([
    { opacity: 0, transform: `translate3d(0,0,0) scale(${equip ? .82 : .46}) rotate(${equip ? -7 : 5}deg)`, offset: 0 },
    { opacity: 1, transform: `translate3d(${dx * .24}px,${dy * .18 - 22}px,0) scale(${equip ? 1.02 : .72}) rotate(${equip ? -2 : -3}deg)`, offset: .28 },
    { opacity: .96, transform: `translate3d(${dx * .72}px,${dy * .66 - 12}px,0) scale(${equip ? .72 : .94}) rotate(${equip ? 5 : 2}deg)`, offset: .72 },
    { opacity: .08, transform: `translate3d(${dx}px,${dy}px,0) scale(${equip ? .34 : 1.06}) rotate(${equip ? 9 : 0}deg)`, offset: 1 },
  ], { duration: 720, easing: 'cubic-bezier(.18,.78,.2,1)', fill: 'forwards' });
  animation.finished.catch(() => {}).finally(() => layer.remove());
  window.setTimeout(() => layer.isConnected && layer.remove(), 920);
  return true;
}
