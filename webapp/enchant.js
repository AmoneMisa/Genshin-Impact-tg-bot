import {escapeHtml as esc} from './escape-html.js';
import {dialogHeading} from './dialog-heading.js';
import {itemGridHtml} from './item-grid.js';
import {inventoryItemArt} from './inventory-layout.js';
import {materialIcon} from './material-icons.js';
import {confirmDialog} from './confirm-dialog.js';

export function enchantScroll(key){
 const match=String(key).replace(/^bound_/,'').match(/^(scroll|blessed|safe)_(?:(weapon|armor)_)?(D|C|B|A|S|S80|S84)$/);
 if(!match||(match[1]==='safe'&&!match[2])||(match[1]==='scroll'&&match[2]))return null;
 return {key,grade:match[3].startsWith('S')?'S':match[3],target:match[2]||null,blessed:match[1]==='blessed'&&!match[2],scroll:match[2]?(match[1]==='safe'?'safeTyped':'blessedTyped'):null};
}
export function fitsEnchantScroll(item,scroll){return Boolean(scroll&&item.canEnchant&&(item.grade?.startsWith('S')?'S':item.grade)===scroll.grade&&(!scroll.target||(item.mainType==='weapon'?'weapon':'armor')===scroll.target));}

export async function openEnchantGame({api,scrollKey,renderState=()=>{},haptic=()=>{},statusElement,onClose}){
 const scroll=enchantScroll(scrollKey);if(!scroll)return;
 let equipment=await api('/api/equipment'),selected=null,pending=false,closed=false,result='';
 const dialog=document.createElement('dialog');dialog.className='game-dialog-panel l2-window enchant-dialog';
 function close(){if(closed)return;closed=true;dialog.close();dialog.remove();if(!pending)onClose?.();}
 function render(){
  const items=(equipment.items||[]).filter(item=>fitsEnchantScroll(item,scroll)),item=items.find(i=>i.key===selected);
  dialog.innerHTML=`${dialogHeading('Заточка снаряжения')}<div class="craft-product"><span class="item-preview-icon">${materialIcon(scrollKey)}</span><p>Выбери предмет для свитка ${esc(scroll.grade)}.</p></div>${itemGridHtml(items.map(i=>`<button class="item-grid-cell ${selected===i.key?'selected':''}" data-target="${esc(i.key)}" aria-label="${esc(i.name)}">${inventoryItemArt(i)}${i.enchant?`<em class="item-grid-count">+${i.enchant}</em>`:''}</button>`),{min:12,className:'craft-ingredient-grid'})}${!items.length?'<p>Нет подходящих предметов.</p>':''}${item?`<p>${esc(item.name)} · +${item.enchant} → +${item.enchant+1}</p><p>Шанс: ${Math.round(item.enchantChance*100)}%</p>`:''}<p aria-live="polite">${esc(result)}</p><button class="ui-button primary" data-enchant ${!item||pending?'disabled':''}>Заточить</button>`;
  dialog.querySelector('[data-dismiss]').onclick=close;
  dialog.querySelectorAll('[data-target]').forEach(b=>b.onclick=()=>{if(pending)return;selected=b.dataset.target;render();});
  dialog.querySelector('[data-enchant]').onclick=async()=>{
   if(!item||pending)return;
   pending=true;render();
   const risky=item.enchant>=item.safeEnchant;
   try{
    if(risky&&!await confirmDialog({owner:dialog,title:'Подтвердить заточку',text:scroll.scroll==='safeTyped'?'Свиток будет израсходован. При неудаче предмет и заточка сохранятся.':scroll.blessed||scroll.scroll==='blessedTyped'?'Свиток будет израсходован. При неудаче заточка сбросится.':'При неудаче предмет будет уничтожен. Свиток будет израсходован.',confirmLabel:'Заточить'}))return;
    if(closed)return;
    const p=await api('/api/equipment/action',{method:'POST',body:JSON.stringify({key:item.key,action:'enchant',blessed:scroll.blessed,scroll:scroll.scroll,scrollKey})});
    if(p.state)renderState(p.state);if(closed)return;equipment=p.equipment;selected=null;
    result=p.outcome==='success'?`Предмет заточен до +${p.level}.`:p.outcome==='broken'?'Заточка не удалась. Предмет разрушен.':`Заточка не удалась. Предмет сохранён: +${p.level}.`;
    if(statusElement)statusElement.textContent=result;haptic('light');
   }catch(e){if(closed)return;if(e.payload?.equipment)equipment=e.payload.equipment;result=e.payload?.reason==='no_scroll'?'Нет подходящего свитка.':e.message;}
   finally{pending=false;if(!closed)render();else onClose?.();}
  };
 }
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});render();document.body.append(dialog);dialog.showModal();
}
