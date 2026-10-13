/** Original L2UI_CT1.InventoryWnd.Inventory_DF_EquipSlot regions. */
const SLOT_TEXTURE={head:'head',helmet:'head',up:'up',down:'down',hands:'hands',gloves:'hands',legs:'legs',boots:'legs',cloak:'cloak',shirt:'shirt',belt:'belt',rightHand:'weapon',leftHand:'offhand',leftEar:'earring',rightEar:'earring',necklace:'necklace',leftRing:'ring',rightRing:'ring',costume:'cloak'};
export function l2SlotBackground(slot){
 const name=SLOT_TEXTURE[slot];
 return name?`<img class="l2-slot-background" src="/art/l2ui/slots/${name}.webp" width="32" height="32" alt="" decoding="async" draggable="false">`:'';
}
