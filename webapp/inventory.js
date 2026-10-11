const walletNumber = value => new Intl.NumberFormat('ru-RU',{notation:Number(value)>=1e6?'compact':'standard',maximumFractionDigits:1}).format(value||0);
import {openWarehouseGame} from './warehouse.js';
import {openTradeGame} from './trade.js';
import {stockQuantity} from './stock-quantity.js';
import {itemArtKey,itemArtSources} from './art/items-art.js';
import {normalizeLootKind} from './loot-renderer.js';
import {materialIcon} from './material-icons.js';
import { escapeHtml } from './escape-html.js';
import {openLoginRewards} from './login-rewards.js';
import { luckCoinHtml } from './currency-icons.js';
import {worldIconHtml} from './art/world-art.js';
import {SPECIAL_ITEM_ART} from './art/special-item-art.js';
import {L2_MATERIAL_ART,l2IconUrl,l2CategoryIcon} from './art/l2-icon-art.js';
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
const MATERIAL_GROUPS=[['full','Снаряжение целиком'],['piece','Части и камни для сборки'],['recipe','Рецепты'],['scroll','Свитки заточки'],['lifestone','Камни жизни'],['attribute','Камни атрибутов'],['seal','Камни печати'],['dye','Краски'],['crystal','Кристаллы'],['material','Материалы'],['consumable','Расходники'],['herb','Травы'],['other','Прочее']];
function materialGroup(item){
 if(item.kind)return item.kind;
 const prefix=String(item.key).split('_')[0];
 return {scroll:'scroll',blessed:'scroll',safe:'scroll',lifestone:'lifestone',attr:'attribute',seal:'seal',soul:'crystal',crystal:'crystal',craft:'material',soulshot:'consumable',spiritshot:'consumable'}[prefix]||'other';
}
function materialBag(items,selected){
 return MATERIAL_GROUPS.map(([kind,label])=>{
  const rows=items.filter(item=>materialGroup(item)===kind);if(!rows.length)return '';
  return `<details class="inventory-material-group" open><summary>${l2CategoryIcon(kind)} ${label} · ${rows.length}</summary><div class="inv-bag">${rows.map(item=>`<button type="button" class="inv-slot ${selected===item.key?'selected':''}" data-inventory-material="${escapeHtml(item.key)}" title="${escapeHtml(item.name)} ×${item.count}" aria-label="${escapeHtml(item.name)} ×${item.count}">${materialIcon(item.key)}<em>${formatNumber(item.count)}</em></button>`).join('')}</div></details>`;
 }).join('');
}

export async function openInventoryGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/inventory');
  let pending = false;
  let lastResult = null;
  let toastTimer = 0;
  let selectedKey = null;
  let selectedKind = 'potion';
  let filter = 'all';
  let previousPlayer = null; // vitals before the last potion, to animate the fill

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay inventory-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass inventory-panel">
      <header class="inv-head">
        <button class="overlay-close inv-round" type="button" aria-label="Закрыть">←</button>
        <h2>Инвентарь</h2>
        <button class="inv-round" type="button" data-inventory-refresh aria-label="Обновить">↻</button>
      </header>
      <p class="overlay-copy" hidden>Ресурсы и предметы читаются из той же Mongo-сессии. Снаряжение и гача уже имеют отдельные экраны; здесь можно использовать расходники.</p>
      <div class="storage-actions"><button type="button" class="clan-play" data-personal-warehouse>Хранилище</button><button type="button" class="clan-play" data-personal-trade>Обмен</button><button type="button" class="clan-play" data-personal-coupons>Купоны</button></div><div data-inventory-content></div>
      <div class="utility-feedback" data-inventory-feedback aria-live="polite"></div>
    </div><div class="inventory-toast" data-inventory-toast role="status" hidden></div>`;

  const content = overlay.querySelector('[data-inventory-content]');
  overlay.querySelector('[data-personal-warehouse]').onclick=()=>openWarehouseGame({api,renderState,haptic,onClose:()=>refresh()});
  overlay.querySelector('[data-personal-coupons]').onclick=()=>openLoginRewards({api,renderState,haptic,initialTab:'coupons',onClose:refresh});
  overlay.querySelector('[data-personal-trade]').onclick=()=>openTradeGame({api,renderState,haptic,onClose:()=>refresh()});
  const feedback = overlay.querySelector('[data-inventory-feedback]');
  const close = () => {
    window.clearTimeout(toastTimer);
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
      <button type="button" class="inv-slot ${item.count <= 0 ? 'empty' : ''} ${selectedKind==='potion'&&item.key === selectedKey ? 'selected' : ''}" data-inventory-select="${escapeHtml(item.key)}" aria-label="${escapeHtml(item.name)} ×${formatNumber(item.count)}">
        ${flaskHtml(item)}
        <em>${formatNumber(item.count)}</em>
      </button>`;
  }

  const FILTERS = [['all', 'Все'], ['equip', 'Снаряжение'], ['supply', 'Расходники'], ['material', 'Материалы']];
  const SUPPLY_GROUPS = new Set(['consumable', 'scroll', 'herb']);
  const isSupplyMaterial = item => SUPPLY_GROUPS.has(materialGroup(item));

  /** The bag of the current filter: one grid of icons, empty cells fill the last row. */
  function bagSlots() {
    const potions = state.potions.map(slotHtml);
    const equipment = (state.equipment || []).map(item => `<button type="button" class="inv-slot ${selectedKind === 'equipment' && selectedKey === item.key ? 'selected' : ''}" data-inventory-equipment="${escapeHtml(item.key)}" title="${escapeHtml(item.name)}${item.isUsed ? ' · Надето' : ''}" aria-label="${escapeHtml(item.name)}">${equipmentArt(item)}${item.enchant ? `<i class="inv-plus">+${item.enchant}</i>` : ''}${item.isUsed ? '<i class="inv-worn" aria-hidden="true"></i>' : ''}</button>`);
    const materialSlot = item => `<button type="button" class="inv-slot ${selectedKind === 'material' && selectedKey === item.key ? 'selected' : ''}" data-inventory-material="${escapeHtml(item.key)}" title="${escapeHtml(item.name)} ×${item.count}" aria-label="${escapeHtml(item.name)} ×${item.count}">${materialIcon(item.key)}<em>${formatNumber(item.count)}</em></button>`;
    const materials = state.materials || [];
    const supplies = materials.filter(isSupplyMaterial).map(materialSlot);
    const rest = materials.filter(item => !isSupplyMaterial(item)).map(materialSlot);
    const cells = filter === 'equip' ? equipment
      : filter === 'supply' ? [...potions, ...supplies]
        : filter === 'material' ? rest
          : [...equipment, ...potions, ...supplies, ...rest];
    const total = Math.max(30, Math.ceil(cells.length / 6) * 6);
    return cells.join('') + '<span class="inv-slot blank" aria-hidden="true"></span>'.repeat(total - cells.length);
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
          <em>${item.type==='buff'?'Эффект · 20 минут':`${item.type.toUpperCase()} · сила ${power}`} · осталось ${formatNumber(item.count)}</em>
        </div>
        <button type="button" data-inventory-potion="${escapeHtml(item.key)}" ${usable ? '' : 'disabled'}>Выпить</button>
      </section>`;
  }

  function selectedItem(){return (selectedKind==='equipment'?state.equipment||[]:selectedKind==='material'?state.materials||[]:state.potions).find(item=>item.key===selectedKey);}
  function equipmentArt(item){const art=itemArtSources(itemArtKey(normalizeLootKind(item),item));return `<img src="${art.src}" srcset="${art.srcset}" width="48" height="48" sizes="48px" alt="" loading="lazy" decoding="async">`;}
  function selectedRow(){const item=selectedItem();if(!item)return null;return {kind:selectedKind,ref:selectedKind==='potion'?item.ref:selectedKind==='equipment'?item.uid:item.key,title:item.name,count:selectedKind==='equipment'?1:item.count,artPotion:item,artItem:item,materialKey:item.key};}

  function resultHtml() {
    if (!lastResult) return '';
    if(lastResult.resource==='buff')return `<section class="inventory-result"><div><strong>${escapeHtml(lastResult.potion?.name||'Эффект активен')}</strong><small>20 минут · повторное использование обновляет время</small></div></section>`;
    const resource = lastResult.resource === 'cp' ? 'CP' : lastResult.resource === 'mp' ? 'MP' : 'HP';
    return `<section class="inventory-result ${lastResult.resource === 'mp' ? 'mp' : 'hp'}"><span>+</span><div><strong>${formatNumber(lastResult.restored)} ${resource}</strong><small>${escapeHtml(lastResult.potion?.name || '')}</small></div></section>`;
  }

  function render() {
    state.potions=state.potions.filter(potion=>potion.count>0);
    if (!selectedKey || !selectedItem()) {
      selectedKind='potion';
      selectedKey = state.potions[0]?.key || null;
    }
    const item=selectedItem(), row=selectedRow();
    content.innerHTML = `
      ${vitalsHtml()}
      ${state.buffs?.length?`<p class="inv-hint">${state.buffs.map(buff=>`${escapeHtml(buff.name)} · ${Math.max(0,Math.ceil((buff.until-Date.now())/60000))} мин.`).join(' · ')}</p>`:''}
      <section class="inventory-section">
        <nav class="inv-tabs" role="tablist" aria-label="Фильтр инвентаря">${FILTERS.map(([id, label]) => `<button type="button" role="tab" class="${filter === id ? 'active' : ''}" data-inventory-filter="${id}" aria-selected="${filter === id}">${label}</button>`).join('')}</nav>
        <div class="inv-bag l2-bag">${bagSlots()}</div>
        <div class="inventory-title"><small>${state.slots ? `${formatNumber(state.slots.used)} / ${formatNumber(state.slots.capacity)}` : ''}</small></div>
      </section>
      ${detailHtml()}
      <footer class="inventory-footer"><div class="inventory-wallet"><span class="inventory-adena">${materialIcon('l2_57')}<strong title="${formatNumber(state.resources.gold)}">${walletNumber(state.resources.gold)}</strong></span><span class="inventory-col" title="Монеты удачи">${luckCoinHtml(24)}<strong title="${formatNumber(state.resources.luckCoins)}">${walletNumber(state.resources.luckCoins)}</strong></span></div><div class="inventory-tools"><button type="button" data-inventory-discard ${!item||item.isUsed||item.augment?.current?'disabled':''}>Выбросить</button><button type="button" data-inventory-crystallize ${selectedKind!=='equipment'||!item?.enchantable||item.isUsed||item.timed?'disabled':''}>Кристаллизация</button><button type="button" data-inventory-auction ${!row||item.isUsed||item.timed||item.bound||selectedKind==='equipment'&&!item.uid?'disabled':''}>Выставить на аукцион</button><button type="button" data-inventory-craft>Крафт</button></div></footer>`;
    bind();
    // Vitals glide from the pre-potion value to the new one.
    requestAnimationFrame(() => content.querySelectorAll('[data-fill]').forEach(fill => { fill.style.width = `${fill.dataset.fill}%`; }));
    previousPlayer = null;
  }

  function bind() {
    content.querySelector('[data-inventory-coupon]')?.addEventListener('click',()=>openLoginRewards({api,renderState,haptic,initialTab:'coupons',initialKey:selectedKey,onClose:refresh}));
    content.querySelectorAll('[data-inventory-select]').forEach(button => {
      button.addEventListener('click', () => { selectedKind='potion';selectedKey = button.dataset.inventorySelect; haptic('light'); render(); });
    });
    for(const kind of ['material','equipment'])content.querySelectorAll(`[data-inventory-${kind}]`).forEach(button=>button.onclick=()=>{selectedKind=kind;selectedKey=button.dataset[kind==='material'?'inventoryMaterial':'inventoryEquipment'];haptic('light');render();});
    content.querySelectorAll('[data-inventory-filter]').forEach(button => button.onclick = () => { filter = button.dataset.inventoryFilter; haptic('light'); render(); });
    content.querySelector('[data-inventory-discard]').onclick=()=>itemAction('discard');
    content.querySelector('[data-inventory-crystallize]').onclick=()=>itemAction('crystallize');
    content.querySelector('[data-inventory-auction]').onclick=async()=>{if(pending)return;const {openAuctionGame}=await import('./auction.js');await openAuctionGame({api,renderState,haptic,statusElement,initialItem:selectedRow(),onClose:refresh});};
    content.querySelector('[data-inventory-craft]').onclick=async()=>{if(pending)return;const {openEquipmentGame}=await import('./equipment.js');await openEquipmentGame({api,renderState,haptic,statusElement,initialView:'forge',onClose:refresh});};
    content.querySelectorAll('[data-inventory-sell]').forEach(button => {
      button.addEventListener('click', async () => {
        if (pending) return;
        pending = true;
        try {
          const payload = await api('/api/inventory/sell', { method: 'POST', body: JSON.stringify({ key: button.dataset.inventorySell }) });
          state = payload.inventory;
          feedback.textContent = `Продано за ${formatNumber(payload.gold)} 🪙.`;
          haptic('light');
        } catch (error) {
          if (error.payload?.inventory) state = error.payload.inventory;
          feedback.textContent = REASONS[error.payload?.reason] || error.message;
        } finally {
          pending = false;
          render();
        }
      });
    });
    content.querySelectorAll('[data-inventory-potion]').forEach(button => {
      button.addEventListener('click', () => usePotion(button.dataset.inventoryPotion));
    });
  }

  async function itemAction(action){
    if(pending)return;
    const item=selectedItem(),row=selectedRow();if(!item||!row)return;
    const count=await stockQuantity({row,action:action==='discard'?'Выбросить навсегда':'Кристаллизовать',owner:overlay});
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
    pending = true;
    overlay.classList.add('busy');
    feedback.textContent = '';
    haptic('medium');
    const flask = content.querySelector('.inv-detail .inv-flask, .inv-detail .inv-potion-art');
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
