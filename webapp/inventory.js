import {dialogHeading} from './dialog-heading.js';
import {inventoryCharacterHtml,inventoryEquipped,inventoryActionIcon,inventoryItemArt,INVENTORY_LEFT,INVENTORY_RIGHT} from './inventory-layout.js';
import {itemGridHtml} from './item-grid.js';
const walletNumber = value => new Intl.NumberFormat('ru-RU',{notation:Number(value)>=1e6?'compact':'standard',maximumFractionDigits:1}).format(value||0);
import {stockQuantity} from './stock-quantity.js';
import {itemArtKey,itemArtSources} from './art/items-art.js';
import {normalizeLootKind} from './loot-renderer.js';
import {materialIcon} from './material-icons.js';
import { escapeHtml } from './escape-html.js';
import {openLoginRewards} from './login-rewards.js';
import {SPECIAL_ITEM_ART} from './art/special-item-art.js';
import {L2_MATERIAL_ART,l2IconUrl} from './art/l2-icon-art.js';
const REASONS = {
  potion_not_found: 'Зелье больше недоступно. Обнови инвентарь.',
  potion_empty: 'Это зелье закончилось.',
  player_dead: 'Нельзя использовать зелье, пока персонаж мёртв.',
  hp_full: 'HP уже полностью восстановлено.',
  mp_full: 'MP уже полностью восстановлено.',
  cp_full: 'CP уже полностью восстановлено.',
  level_too_low: 'Твой уровень слишком низкий для этого эликсира.',
  unsupported_potion: 'Этот предмет пока нельзя использовать в Mini App.',
  not_sellable: 'Этот предмет нельзя продать.',
  invalid_count: 'Столько предметов нет.',
  item_not_found: 'Предмет больше недоступен. Обнови инвентарь.',
  stale_item: 'Предмет изменился. Выбери его ещё раз.',
  item_equipped: 'Сначала сними предмет.',
  augmented_item: 'Аугментированный предмет нельзя выбросить.',
  timed_item: 'Временный предмет нельзя кристаллизовать.',
  not_enchantable: 'Этот предмет нельзя кристаллизовать.',
};

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}


function percent(value, max) {
  return max > 0 ? Math.min(100, Math.max(0, Number(value) / Number(max) * 100)) : 0;
}

/** Liquid colour of a potion flask. */
export function potionTone(item) {
  if (item?.bottleType === 'elixir') return 'elixir';
  return item?.type === 'mp' ? 'mp' : 'hp';
}

export function flaskHtml(item) {
  const token=item?.type==='buff'?item.id:item?.type==='hp'&&item.bottleType==='elixir'?'hp-elixir':`${item?.type}-${item?.size}`;
  const key='potion-'+token;
  const original=L2_MATERIAL_ART[item?.artKey]||L2_MATERIAL_ART[item?.id]||L2_MATERIAL_ART[key];
  if(original)return `<img class="inv-potion-art l2-client-icon" src="${l2IconUrl(original)}" srcset="${l2IconUrl(original)} 1x, ${l2IconUrl(original,256)} 2x" width="64" height="64" alt="" loading="lazy" decoding="async">`;
  if(SPECIAL_ITEM_ART.includes(key))return `<img class="inv-potion-art" src="/art/items/v1/${key}-128.webp" srcset="/art/items/v1/${key}-128.webp 128w, /art/items/v1/${key}-256.webp 256w" sizes="64px" width="64" height="96" alt="" loading="lazy" decoding="async">`;
  return `<span class="inv-flask tone-${potionTone(item)}" aria-hidden="true"><i class="inv-liquid"></i><i class="inv-bubbles"></i></span>`;
}

const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));
function materialGroup(item){
 if(item.kind)return item.kind;
 const prefix=String(item.key).split('_')[0];
 return {scroll:'scroll',blessed:'scroll',safe:'scroll',lifestone:'lifestone',attr:'attribute',seal:'seal',soul:'crystal',crystal:'crystal',craft:'material',soulshot:'consumable',spiritshot:'consumable'}[prefix]||'other';
}
export async function openInventoryGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/inventory');
  let pending = false;
  let lastResult = null;
  let toastTimer = 0;
  let selectedKey = null;
  let selectedKind = 'potion';
  let filter = 'all';
  let search = '';
  let itemDialog = null;
  let previousPlayer = null; // vitals before the last potion, to animate the fill

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay inventory-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass inventory-panel inventory-reference">
      <header class="inv-head">
        <button class="overlay-close inv-round" type="button" aria-label="Закрыть">×</button>
        <h2>Инвентарь</h2>
        <button class="inventory-capacity" type="button" data-inventory-refresh title="Обновить" aria-label="Обновить"><span data-inventory-count></span></button>
      </header>
      <div data-inventory-content></div>
      <div class="utility-feedback" data-inventory-feedback aria-live="polite"></div>
    </div><div class="inventory-toast" data-inventory-toast role="status" hidden></div>`;

  const content = overlay.querySelector('[data-inventory-content]');
  const feedback = overlay.querySelector('[data-inventory-feedback]');
  feedback.textContent = 'Выберите предмет';
  const close = () => {
    window.clearTimeout(toastTimer);
    closeItemPopup();
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);
  overlay.querySelector('[data-inventory-refresh]').addEventListener('click', () => refresh());

  function vitalsHtml() {
    const before = previousPlayer || state.player;
    const bar = (key, label, value, max, prev) => `
      <article class="inv-vital ${key}">
        <div><span>${label}</span><strong>${formatNumber(value)} / ${formatNumber(max)}</strong></div>
        <i><b data-fill="${percent(value, max)}" style="width:${percent(prev, max)}%"></b></i>
      </article>`;
    return `
      <section class="inventory-vitals">
        ${bar('cp', 'CP', state.player.cp||0, state.player.maxCp||1, before.cp||0)}
        ${bar('hp', 'HP', state.player.hp, state.player.maxHp, before.hp)}
        ${bar('mp', 'MP', state.player.mp, state.player.maxMp, before.mp)}
      </section>`;
  }

  function slotHtml(item) {
    return `
      <button type="button" class="item-grid-cell inv-slot ${item.count <= 0 ? 'empty' : ''} ${selectedKind==='potion'&&item.key === selectedKey ? 'selected' : ''}" data-inventory-select="${escapeHtml(item.key)}" aria-label="${escapeHtml(item.name)} ×${formatNumber(item.count)}">
        ${flaskHtml(item)}
        <em>${formatNumber(item.count)}</em>
      </button>`;
  }

  const FILTERS = [['all', 'Все'], ['equip', 'Экипировка'], ['supply', 'Расходники'], ['material', 'Материалы'], ['other','Прочее'], ['quest','Квесты']];
  const SUPPLY_GROUPS = new Set(['consumable', 'scroll', 'herb']);
  const isSupplyMaterial = item => SUPPLY_GROUPS.has(materialGroup(item));
  const isQuestMaterial = item => item.kind==='quest'||/^(class_mark_|quest_|boss_pass_|bound_class_mark_|bound_boss_pass_)/.test(item.key);
  const isOtherMaterial = item => !isSupplyMaterial(item)&&!isQuestMaterial(item)&&materialGroup(item)==='other';

  /** The bag of the current filter: one grid of icons, empty cells fill the last row. */
  const matchesSearch = item => item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  function bagSlots() {
    const potions = state.potions.filter(item=>matchesSearch(item)).map(slotHtml);
    const equipment = (state.equipment || []).filter(item => !item.isUsed&&matchesSearch(item)).map(item => `<button type="button" class="item-grid-cell inv-slot ${item.shadow?'is-shadow-item':''} ${selectedKind === 'equipment' && selectedKey === item.key ? 'selected' : ''}" data-inventory-equipment="${escapeHtml(item.key)}" title="${escapeHtml(item.name)}${item.isUsed ? ' · Надето' : ''}" aria-label="${escapeHtml(item.name)}">${equipmentArt(item)}${item.enchant ? `<i class="inv-plus">+${item.enchant}</i>` : ''}${item.isUsed ? '<i class="inv-worn" aria-hidden="true"></i>' : ''}</button>`);
    const materialSlot = item => `<button type="button" class="item-grid-cell inv-slot ${selectedKind === 'material' && selectedKey === item.key ? 'selected' : ''}" data-inventory-material="${escapeHtml(item.key)}" title="${escapeHtml(item.name)} ×${item.count}" aria-label="${escapeHtml(item.name)} ×${item.count}">${materialIcon(item.key)}<em>${formatNumber(item.count)}</em></button>`;
    const materials = (state.materials || []).filter(matchesSearch);
    const supplies = materials.filter(isSupplyMaterial).map(materialSlot);
    const rest = materials.filter(item => !isSupplyMaterial(item)&&!isQuestMaterial(item)&&!isOtherMaterial(item)).map(materialSlot);
    const others=materials.filter(isOtherMaterial).map(materialSlot),quests=materials.filter(isQuestMaterial).map(materialSlot);
    const cells = filter === 'equip' ? equipment
      : filter === 'supply' ? [...potions, ...supplies]
        : filter === 'material' ? rest
          : filter === 'other' ? others : filter === 'quest' ? quests : [...equipment, ...potions, ...supplies, ...rest, ...others, ...quests];
    const total = Math.max(80, cells.length);
    return itemGridHtml(cells, {className: 'inv-bag l2-bag', min: total, label: 'Инвентарь'});
  }

  function detailHtml() {
    if(selectedKind!=='potion'){
      const item=selectedItem();if(!item)return '<p class="inv-hint">Выбери предмет в сумке.</p>';
      return `<section class="inv-detail">${selectedKind==='material'?materialIcon(item.key):equipmentArt(item)}<div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description||'')}</small><em>${selectedKind==='equipment'?`${escapeHtml(item.grade)}${item.enchant?' · +'+item.enchant:''}${item.isUsed?' · Надето':''}`:'Количество · '+formatNumber(item.count)}</em></div>${selectedKind==='material'&&item.usable?'<button type="button" data-inventory-coupon>Использовать</button>':''}${selectedKind==='material'&&item.sellPrice?`<button type="button" class="inv-sell" data-inventory-sell="${escapeHtml(item.key)}">Продать всё · ${formatNumber(item.sellPrice*item.count)} адены</button>`:''}</section>`;
    }
    const item = state.potions.find(potion => potion.key === selectedKey);
    if (!item) return '<p class="inv-hint">Выбери предмет в сумке.</p>';
    const power = item.bottleType === 'elixir' ? `${item.power}%` : formatNumber(item.power);
    const usable = item.count > 0;
    return `
      <section class="inv-detail tone-${potionTone(item)}">
        ${flaskHtml(item)}
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <small>${escapeHtml(item.description)}</small>
          <em>${item.type==='buff'?`Эффект · ${Math.round((item.seconds || 1200)/60)} мин.`:`${item.type.toUpperCase()} · сила ${power}`} · осталось ${formatNumber(item.count)}</em>
        </div>
        <button type="button" data-inventory-potion="${escapeHtml(item.key)}" ${usable ? '' : 'disabled'}>Выпить</button>
      </section>`;
  }

  function selectedItem(){return (selectedKind==='equipment'?state.equipment||[]:selectedKind==='material'?state.materials||[]:state.potions).find(item=>item.key===selectedKey);}
  function equipmentArt(item){const art=itemArtSources(itemArtKey(normalizeLootKind(item),item));return `<img class="${item.shadow?'is-shadow-item':''}" src="${art.src}" srcset="${art.srcset}" width="48" height="48" sizes="48px" alt="" loading="lazy" decoding="async">`;}
  function selectedRow(){const item=selectedItem();if(!item)return null;return {kind:selectedKind,ref:selectedKind==='potion'?item.ref:selectedKind==='equipment'?item.uid:item.key,title:item.name,count:selectedKind==='equipment'?1:item.count,artPotion:item,artItem:item,materialKey:item.key};}

  function resultHtml() {
    if (!lastResult) return '';
    if(lastResult.resource==='buff')return `<section class="inventory-result"><div><strong>${escapeHtml(lastResult.potion?.name||'Эффект активен')}</strong><small>${Math.round((lastResult.potion?.seconds || 1200)/60)} мин. · повторное использование обновляет время</small></div></section>`;
    const resource = lastResult.resource === 'cp' ? 'CP' : lastResult.resource === 'mp' ? 'MP' : 'HP';
    return `<section class="inventory-result ${lastResult.resource === 'mp' ? 'mp' : 'hp'}"><span>+</span><div><strong>${formatNumber(lastResult.healing || lastResult.restored)} ${resource}${lastResult.durationSeconds ? ` · за ${lastResult.durationSeconds} сек.` : ''}</strong><small>${escapeHtml(lastResult.potion?.name || '')}</small></div></section>`;
  }

  function render() {
    state.potions=state.potions.filter(potion=>potion.count>0);
    if (!selectedKey || !selectedItem()) {
      selectedKind='potion';
      selectedKey = state.potions[0]?.key || null;
    }
    const item=selectedItem(), row=selectedRow();
    content.innerHTML = `
      <div class="inventory-layout">${inventoryCharacterHtml(state)}<section class="inventory-section">
        <nav class="inv-tabs ui-folder-tabs" role="tablist" aria-label="Фильтр инвентаря">${FILTERS.map(([id,label])=>`<button type="button" role="tab" class="${filter===id?'active':''}" data-inventory-filter="${id}" aria-selected="${filter===id}">${label}</button>`).join('')}</nav>
        <input class="inventory-search" type="search" data-inventory-search placeholder="Поиск предмета" aria-label="Поиск предмета" value="${escapeHtml(search)}">
        <div data-inventory-bag>${bagSlots()}</div>
      </section></div>
      <footer class="inventory-footer"><div class="inventory-tools">
        <button type="button" data-inventory-crystallize title="Кристаллизация" aria-label="Кристаллизация" ${selectedKind!=='equipment'||!item?.enchantable||item.isUsed||item.timed?'disabled':''}>${inventoryActionIcon('crystallize')}</button>
        <button type="button" data-inventory-auction title="Аукцион" aria-label="Аукцион" ${!row||item.isUsed||item.timed||item.bound||selectedKind==='equipment'&&!item.uid?'disabled':''}>${inventoryActionIcon('auction')}</button>
        <button type="button" data-inventory-craft title="Крафт" aria-label="Крафт">${inventoryActionIcon('craft')}</button>
      </div><div class="inventory-wallet"><span class="inventory-adena">${materialIcon('l2_57')}<strong title="${formatNumber(state.resources.gold)}">${walletNumber(state.resources.gold)}</strong></span></div>
      <button type="button" class="inventory-discard" data-inventory-discard title="Выбросить" aria-label="Выбросить" ${!item||item.isUsed||item.augment?.current?'disabled':''}>${inventoryActionIcon('discard')}</button></footer>`;
    overlay.querySelector('[data-inventory-count]').textContent = formatNumber((state.equipment||[]).filter(i=>!i.isUsed).length+state.potions.length+(state.materials||[]).length)+' / '+(state.slots?.capacity||80);
    bind();
    // Vitals glide from the pre-potion value to the new one.
    requestAnimationFrame(() => content.querySelectorAll('[data-fill]').forEach(fill => { fill.style.width = `${fill.dataset.fill}%`; }));
    previousPlayer = null;
  }

  function selectItem(kind,key){
    if(pending)return;
    selectedKind=kind;selectedKey=key;haptic('light');render();openItemPopup();
  }
  function bind() {
    content.querySelectorAll('[data-inventory-select]').forEach(b=>b.onclick=()=>selectItem('potion',b.dataset.inventorySelect));
    for(const kind of ['material','equipment'])content.querySelectorAll(`[data-inventory-${kind}]`).forEach(b=>b.onclick=()=>selectItem(kind,b.dataset[kind==='material'?'inventoryMaterial':'inventoryEquipment']));
    content.querySelectorAll('[data-inventory-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.inventoryFilter;haptic('light');render();});
    content.querySelector('[data-inventory-search]').oninput=event=>{search=event.target.value;content.querySelector('[data-inventory-bag]').innerHTML=bagSlots();bindBag();};
    content.querySelectorAll('[data-gear-slot]').forEach(b=>b.onclick=()=>{
      const item=inventoryEquipped(state,b.dataset.gearSlot);
      if(item)selectItem('equipment',item.key);else openSlotPicker(b.dataset.gearSlot);
    });
    content.querySelectorAll('[data-inventory-tattoo]').forEach(b=>b.onclick=async()=>{const {openTattoosGame}=await import('./tattoos.js');await openTattoosGame({api,renderState,haptic,statusElement,onClose:refresh});});
    content.querySelector('[data-inventory-discard]').onclick=()=>itemAction('discard');
    content.querySelector('[data-inventory-crystallize]').onclick=()=>itemAction('crystallize');
    content.querySelector('[data-inventory-auction]').onclick=async()=>{if(pending)return;closeItemPopup();const {openAuctionGame}=await import('./auction.js');await openAuctionGame({api,renderState,haptic,statusElement,initialItem:selectedRow(),onClose:refresh});};
    content.querySelector('[data-inventory-craft]').onclick=async()=>{if(pending)return;closeItemPopup();const {openCraftGame}=await import('./craft.js');await openCraftGame({api,renderState,haptic,statusElement,onClose:refresh});};
  }
  function bindBag(root=content){
    root.querySelectorAll('[data-inventory-select]').forEach(b=>b.onclick=()=>selectItem('potion',b.dataset.inventorySelect));
    for(const kind of ['material','equipment'])root.querySelectorAll(`[data-inventory-${kind}]`).forEach(b=>b.onclick=()=>selectItem(kind,b.dataset[kind==='material'?'inventoryMaterial':'inventoryEquipment']));
  }
  function closeItemPopup(){itemDialog?.close();itemDialog?.remove();itemDialog=null;}
  function popup(html,title='Информация'){
    closeItemPopup();itemDialog=document.createElement('dialog');itemDialog.className='inventory-item-dialog game-dialog-panel';
    itemDialog.innerHTML=`${dialogHeading(title)}${html}`;
    itemDialog.querySelector('[data-dismiss]').onclick=closeItemPopup;
    itemDialog.addEventListener('cancel',event=>{event.preventDefault();closeItemPopup();});
    overlay.append(itemDialog);itemDialog.showModal();return itemDialog;
  }
  function openSlotPicker(slot){
    if(pending)return;
    const names=({head:['head','helmet'],hands:['hands','gloves'],legs:['legs','boots']})[slot]||[slot];
    const items=state.equipment.filter(item=>!item.isUsed&&item.slots?.some(id=>names.includes(id)));
    const title=[...INVENTORY_LEFT,...INVENTORY_RIGHT].find(row=>row[0]===slot)?.[1]||slot;
    const root=popup(items.length?itemGridHtml(items.map(item=>`<button type="button" class="item-grid-cell" data-inventory-equipment="${escapeHtml(item.key)}" title="${escapeHtml(item.name)}" aria-label="${escapeHtml(item.name)}">${inventoryItemArt(item)}</button>`),{min:12}):'<p>В этой категории пока нет предметов.</p>',title);
    bindBag(root);
  }
  function openItemPopup(){
    const item=selectedItem();if(!item)return;
    const extra=selectedKind==='equipment'?`<ul class="inventory-item-stats">${(item.stats||[]).map(stat=>`<li>${escapeHtml(stat.text||[stat.name,stat.value].filter(v=>v!=null).join(' · '))}</li>`).join('')}</ul><button type="button" data-inventory-equip ${!item.isUsed&&!item.canUse?'disabled':''}>${item.isUsed?'Снять':'Надеть'}</button>`:'';
    const scroll=selectedKind==='material'&&/^(?:bound_)?(scroll|blessed|safe)_(?:(weapon|armor)_)?(D|C|B|A|S|S80|S84)$/.test(item.key);
    const root=popup(detailHtml()+extra+(scroll?'<button class="ui-button primary" data-open-enchant>Использовать свиток</button>':'')+(selectedKind==='potion'?vitalsHtml():''));
    root.querySelector('[data-open-enchant]')?.addEventListener('click',async()=>{if(pending)return;closeItemPopup();const {openEnchantGame}=await import('./enchant.js');await openEnchantGame({api,renderState,haptic,statusElement,scrollKey:item.key,onClose:refresh});});
    if(selectedKind==='material'&&/^attr_(stone|crystal|jewel)_(fire|water|wind|earth|holy|dark)$/.test(item.key)){
      const button=document.createElement('button');button.className='ui-button primary';button.textContent='Использовать';root.append(button);
      button.onclick=async()=>{if(pending)return;closeItemPopup();const {openForgeGame}=await import('./forge.js');await openForgeGame({api,renderState,haptic,statusElement,materialKey:item.key,onClose:refresh});};
    }
    if(selectedKind==='material'&&/^l2_859[4-9]$/.test(item.key)){
      const button=document.createElement('button');button.className='ui-button primary';button.textContent='Использовать';root.append(button);
      button.onclick=async()=>{if(pending)return;pending=true;button.disabled=true;try{const payload=await api('/api/inventory/use',{method:'POST',body:JSON.stringify({key:item.key})});state=payload.inventory;if(payload.state)renderState?.(payload.state);closeItemPopup();feedback.textContent='Штраф за смерть: '+payload.level;}catch(e){feedback.textContent=e.message;closeItemPopup();}finally{pending=false;render();}};
    }
    root.querySelector('[data-inventory-potion]')?.addEventListener('click',event=>usePotion(event.currentTarget.dataset.inventoryPotion));
    root.querySelector('[data-inventory-equip]')?.addEventListener('click',()=>equipItem(item));
    root.querySelector('[data-inventory-coupon]')?.addEventListener('click',()=>{closeItemPopup();openLoginRewards({api,renderState,haptic,initialTab:'coupons',initialKey:selectedKey,onClose:refresh});});
    root.querySelector('[data-inventory-sell]')?.addEventListener('click',async event=>{
      if(pending)return;const key=event.currentTarget.dataset.inventorySell;closeItemPopup();pending=true;
      try{const payload=await api('/api/inventory/sell',{method:'POST',body:JSON.stringify({key})});state=payload.inventory;if(payload.state)renderState?.(payload.state);feedback.textContent=`Продано за ${formatNumber(payload.gold)} 🪙.`;}
      catch(error){if(error.payload?.inventory)state=error.payload.inventory;feedback.textContent=REASONS[error.payload?.reason]||error.message;}
      finally{pending=false;render();}
    });
  }
  async function equipItem(item){
    if(pending)return;closeItemPopup();pending=true;
    try{const payload=await api('/api/equipment/action',{method:'POST',body:JSON.stringify({key:item.key,action:item.isUsed?'unequip':'equip'})});if(payload.state)renderState?.(payload.state);state=payload.inventory||await api('/api/inventory');feedback.textContent='';haptic('light');}
    catch(error){feedback.textContent=REASONS[error.payload?.reason]||error.message;}
    finally{pending=false;render();}
  }

  async function itemAction(action){
    if(pending)return;
    const item=selectedItem(),row=selectedRow();if(!item||!row)return;
    closeItemPopup();
    const count=await stockQuantity({row,action:action==='discard'?'Выбросить навсегда':'Кристаллизовать',owner:overlay,note:action==='discard'?'Выбросить этот предмет?':'Разбить предмет на кристаллы? Предмет будет уничтожен.'});
    if(count===null||pending||!overlay.isConnected)return;
    pending=true;overlay.classList.add('busy');
    try{
      const payload=await api(action==='discard'?'/api/inventory/discard':'/api/equipment/action',{method:'POST',body:JSON.stringify(action==='discard'?{kind:row.kind,ref:row.kind==='equipment'?item.key:row.ref,count}:{key:item.key,action})});
      if(payload.state)renderState?.(payload.state);
      state=payload.inventory||await api('/api/inventory');
      selectedKey=null;feedback.textContent=action==='discard'?'Предмет выброшен.':`Получено кристаллов ${payload.grade}: ${formatNumber(payload.crystals)}.`;haptic('light');
    }catch(error){if(error.payload?.inventory)state=error.payload.inventory;feedback.textContent=REASONS[error.payload?.reason]||error.message;}
    finally{pending=false;overlay.classList.remove('busy');render();}
  }

  async function refresh() {
    if (pending) return;
    pending = true;
    feedback.textContent = 'Обновляем инвентарь…';
    try {
      state = await api('/api/inventory');
      lastResult = null;
      feedback.textContent = '';
      render();
    } catch (error) {
      feedback.textContent = error.message;
    } finally {
      pending = false;
    }
  }

  async function usePotion(key) {
    if (pending) return;
    closeItemPopup();
    pending = true;
    overlay.classList.add('busy');
    feedback.textContent = '';
    haptic('medium');
    const flask = overlay.querySelector('.inv-detail .inv-flask, .inv-detail .inv-potion-art');
    flask?.classList.add('drinking');
    try {
      const [payload] = await Promise.all([
        api('/api/inventory/use', { method: 'POST', body: JSON.stringify({ key }) }),
        wait(650),
      ]);
      previousPlayer = { ...state.player };
      state = payload.inventory;
      lastResult = payload;
      const toast = overlay.querySelector('[data-inventory-toast]');
      toast.innerHTML = resultHtml();
      toast.hidden = false;
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => { toast.hidden = true; toast.innerHTML = ''; }, 3500);
      if (payload.state) renderState(payload.state);
      statusElement.textContent = `Инвентарь: использовано ${payload.potion?.name || 'зелье'}.`;
      haptic('light');
      render();
    } catch (error) {
      flask?.classList.remove('drinking');
      if (error.payload?.inventory) state = error.payload.inventory;
      lastResult = null;
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
      haptic('light');
      render();
    } finally {
      pending = false;
      overlay.classList.remove('busy');
    }
  }

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
