import {escapeHtml as esc} from './escape-html.js';
import {fullBodyHeroUrl} from './art/world-art.js';
import {avatarCostumeAttributes, avatarCostumeImage} from './avatar-costume-view.js';
import {l2IconUrl} from './art/l2-icon-art.js';
import {itemArtKey,itemArtSources} from './art/items-art.js';
import {normalizeLootKind} from './loot-renderer.js';
import {materialIcon} from './material-icons.js';
import {l2SlotBackground} from './l2-slot-background.js';
import {costumeIconHtml} from './costume-preview.js';

export const INVENTORY_LEFT = [
  ['head','Голова','icon-armor_circlet_i00'],
  ['up','Верх','icon-armor_t90_ul_i00'],
  ['down','Низ','icon-armor_t90_ul_i00'],
  ['hands','Перчатки','icon-armor_t90_g_i00'],
  ['legs','Сапоги','icon-armor_t90_b_i00'],
  ['cloak','Плащ','branchsys2-br_freya_cloak_i00'],
  ['shirt','Рубашка','shirt'],
  ['belt','Пояс','belt'],
  ['rightHand','Правая рука','icon-weapon_arcana_mace_i00'],
];
export const INVENTORY_RIGHT = [
  ['costume','Костюм','costume'],
  ['hair','Головной аксессуар','hair'],['hair2','Второй аксессуар','hair'],
  ['leftEar','Левое ухо','icon-accessory_earring_of_antaras_i00'],
  ['rightEar','Правое ухо','icon-accessory_earring_of_antaras_i00'],
  ['necklace','Шея','icon-accessory_necklace_of_valakas_i00'],
  ['leftRing','Левое кольцо','icon-accessory_ring_of_baium_i00'],
  ['rightRing','Правое кольцо','icon-accessory_ring_of_baium_i00'],
  ['bracelet','Браслет','bracelet'],['leftHand','Левая рука','icon-arcana_sigil_i00'],
];
const aliases={head:['head','helmet'],hands:['hands','gloves'],legs:['legs','boots']};
export function inventoryEquipped(state,slot) {
  const names=aliases[slot] || [slot];
  const name=names.find(id=>state.equippedSlots?.[id]);
  const snapshot=state.equippedSlots?.[name];
  if(!snapshot)return null;
  if(snapshot.uid)return state.equipment.find(item=>item.isUsed&&item.uid===snapshot.uid)||null;
  const candidates=state.equipment.filter(item=>item.isUsed&&item.slots?.includes(name));
  return candidates.find(item=>item.name===snapshot.name&&item.grade===snapshot.grade) || candidates[0] || null;
}
export function inventoryItemArt(item) {
  if(item.costumeId)return costumeIconHtml(item.costumeId);
  const art=itemArtSources(itemArtKey(normalizeLootKind(item),item));
  return `<img class="${item.shadow?'is-shadow-item':''}" src="${art.src}" srcset="${art.srcset}" sizes="44px" alt="" decoding="async">`;
}
export function inventoryActionIcon(name) {
  if(['crystallize','craft'].includes(name))return `<img src="/art/inventory/${name}.png" alt="">`;
  const paths={auction:'M16 4v23M8 28h16M4 9h24M7 9L3 20h8ZM25 9l-4 11h8Z',discard:'M8 10h16v17H8ZM6 7h20M12 7V4h8v3M12 13v11M16 13v11M20 13v11',refresh:'M25 11a11 11 0 1 0 1 10M25 4v8h-8',warehouse:'M5 10l11-6 11 6v17H5ZM5 10h22M12 16h8v11',trade:'M4 10h23l-6-6M28 22H5l6 6',coupons:'M5 7h22v7a3 3 0 0 0 0 6v5H5v-5a3 3 0 0 0 0-6ZM19 7v18'};
  return `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="${paths[name]}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
}
export function inventoryCharacterHtml(state) {
  const full=inventoryEquipped(state,'up');
  const combined=full?.slots?.includes('down');
  const column=(rows,side)=>`<div class="inventory-gear ${side}">${rows.map(([id,label,key])=>{
    const item=inventoryEquipped(state,id);
    const covered=id==='down'&&combined;
    const custom=['shirt','belt','hair','bracelet'].includes(key);
    const placeholder=custom?`/art/inventory/${key}.${key==='hair'?'webp':'png'}`:l2IconUrl(key);
    const title=`${label}: ${covered?'Занят цельной бронёй':item?.name||'Слот свободен'}`;
    return `<button type="button" class="inventory-gear-cell ${!item||covered?'empty':''} ${combined&&['up','down'].includes(id)?'combined-armor':''} ${item?.shadow?'shadow':''}" data-gear-slot="${id}" title="${esc(title)}" aria-label="${esc(title)}">${item&&!covered?inventoryItemArt(item):l2SlotBackground(id)}${item?.enchant&&!covered?`<i>+${item.enchant}</i>`:''}</button>`;
  }).join('')}</div>`;
  return `<section class="inventory-character" aria-label="Персонаж и надетая экипировка">${column(INVENTORY_LEFT,'left')}<div class="inventory-figure" ${avatarCostumeAttributes(state.player?.race)}>${avatarCostumeImage({src:fullBodyHeroUrl(state.player),imageClass:'inventory-body',name:'Персонаж в полный рост'})}<div class="inventory-tattoos">${[0,1,2].map((index)=>{const tattoo=state.tattoos?.[index];const label=tattoo?.name||'Слот свободен';return `<button type="button" class="inventory-tattoo ${tattoo?'':'empty'}" data-inventory-tattoo="${index}" title="${esc(label)}" aria-label="${esc(label)}">${tattoo?materialIcon('l2_'+tattoo.dye):`<img src="/art/inventory/tattoo-${['str','int','dex'][index]}.png" alt="">`}</button>`;}).join('')}</div></div>${column(INVENTORY_RIGHT,'right')}</section>`;
}
