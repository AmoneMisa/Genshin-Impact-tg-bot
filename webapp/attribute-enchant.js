import {escapeHtml as esc} from './escape-html.js';
import {dialogHeading} from './dialog-heading.js';
import {installOverlayA11y} from './overlay-a11y.js';
import {itemGridHtml} from './item-grid.js';
import {inventoryItemArt} from './inventory-layout.js';
import {materialIcon} from './material-icons.js';
import {quantityControlHtml,bindQuantityControl} from './stock-quantity.js';
import {controlIcon} from './icons.js';

const elements={fire:'огня',water:'воды',wind:'ветра',earth:'земли',holy:'святости',dark:'тьмы'};
const reasons={not_attributable:'Предмет не поддерживает атрибут.',timed_item:'Временный предмет.',wrong_element:'В оружии другой атрибут.',opposite_element:'В броне противоположный атрибут.',attribute_slots_full:'Три атрибута брони уже заняты.',attribute_tier_max:'Достигнут предел этого камня.',no_attribute_stone:'Камни закончились.',stale_item:'Предмет изменился. Выберите его заново.'};
export async function openAttributeEnchant({api,renderState=()=>{},haptic=()=>{},onClose,materialKey,equipment,availability}){
 installOverlayA11y();
 const key=materialKey.replace(/^bound_/,''),[,tier,element]=/^attr_(stone|crystal|jewel)_(\w+)$/.exec(key)||[];
 const confirmLabel='Вставить атрибут';
 const name=({stone:'Камень',crystal:'Кристалл',jewel:'Самоцвет'}[tier]||'Камень')+' '+(elements[element]||'атрибута');
 let selected=null,count=1,busy=false,closed=false,message='';
 const overlay=document.createElement('section');overlay.className='game-overlay equipment-overlay';
 overlay.innerHTML='<div class="overlay-backdrop"></div><div class="overlay-panel game-dialog-panel l2-status-window attribute-panel">'+dialogHeading('Атрибут предмета').replace('data-dismiss','class="overlay-close" data-dismiss')+'<div data-attribute-body></div></div>';
 const body=overlay.querySelector('[data-attribute-body]');
 const stock=()=>equipment.attributeStones?.[key]??Math.max(0,...(equipment.items||[]).flatMap(i=>(i.attribute?.options||[]).filter(o=>o.tier===tier&&o.element===element).map(o=>o.stones)));
 const offer=item=>item?.attribute?.options?.find(o=>o.tier===tier&&o.element===element);
 function close(){if(closed)return;closed=true;overlay.remove();if(!busy)onClose?.();}
 overlay.querySelector('[data-dismiss]').onclick=close;
 function draw(){
  const item=(equipment.items||[]).find(i=>i.key===selected),option=offer(item),have=stock();count=Math.min(count,Math.max(1,have));
  body.innerHTML='<h3>Камень атрибута</h3><div class="attribute-selection">'+materialIcon(key)+'<span>'+esc(name)+'<small>В наличии: '+have+'</small></span></div>'+quantityControlHtml({value:count,max:have})+'<h3>Выберите предмет</h3>'+itemGridHtml((equipment.items||[]).map(i=>{const status=availability(i,key);return '<button type="button" class="item-grid-cell '+(i.key===selected?'selected':'')+'" data-forge-select="'+esc(i.key)+'" aria-pressed="'+(i.key===selected)+'" aria-label="'+esc(i.name)+'" title="'+esc(i.name+(status.ok?'':' · '+(reasons[status.reason]||'Недоступно')))+'" '+(!status.ok||busy?'disabled':'')+'>'+inventoryItemArt(i)+'</button>'; }),{min:30,label:'Снаряжение для вставки атрибута'})
   +'<div class="attribute-selection">'+(item?inventoryItemArt(item):'')+'<span>'+esc(item?.name||'Выберите предмет в сетке')+(option?'<small>'+esc(option.label)+' · +'+option.add+' · до '+option.cap+' · шанс '+Math.round(option.chance*100)+'%</small>':'')+'</span></div><p role="status" aria-live="polite">'+esc(message)+'</p><div class="attribute-confirm"><button '+(!item||!option||!availability(item,key).ok||!have||busy?'disabled':'')+' type="button" class="ui-button ui-icon-button primary" data-attribute-confirm aria-label="'+esc(confirmLabel)+'" title="'+esc(confirmLabel)+'">'+controlIcon('check')+'</button></div>';
  bindQuantityControl(body,{max:have,onChange:n=>count=n});
  if(busy)body.querySelectorAll('button,input').forEach(b=>b.disabled=true);
  body.querySelectorAll('[data-forge-select]').forEach(b=>b.onclick=()=>{selected=b.dataset.forgeSelect;draw();body.querySelector('[data-forge-select][aria-pressed="true"]')?.focus();});
  body.querySelector('[data-attribute-confirm]').onclick=apply;
 }
 async function apply(){
  if(busy)return;const target=(equipment.items||[]).find(i=>i.key===selected);if(!target||!availability(target,key).ok||!stock())return;
  busy=true;const attempts=Math.min(count,stock());let spent=0,success=0;draw();
  try{
   for(let n=0;n<attempts&&!closed;n++){
    const item=equipment.items.find(i=>i.key===selected);if(!item||!availability(item,key).ok||!offer(item)||!stock())break;
    const next=await api('/api/equipment/action',{method:'POST',body:JSON.stringify({key:selected,action:'attribute',tier,element})});
    spent++;if(next.success!==false)success++;equipment=next.equipment;if(next.state)renderState(next.state);
   }
   message='Израсходовано камней: '+spent+'. Успешных вставок: '+success+'.';haptic('light');
  }catch(error){if(error.payload?.equipment)equipment=error.payload.equipment;message='Израсходовано камней: '+spent+'. '+(reasons[error.payload?.reason]||error.message);}
  finally{busy=false;if(!closed)draw();else onClose?.();}
 }
 document.body.append(overlay);draw();requestAnimationFrame(()=>{if(!closed)overlay.classList.add('visible');});
 return {close};
}
